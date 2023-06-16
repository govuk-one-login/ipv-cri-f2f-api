/* eslint-disable no-console */
import { Logger } from "@aws-lambda-powertools/logger";
import { AppError } from "../utils/AppError";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { YOTI_CHECKS, YotiSessionDocument, DOCUMENT_TYPES_WITH_CHIPS } from "../utils/YotiPayloadEnums";
import { YotiCheckRecommendation, YotiDocumentFields, YotiCompletedSession, YotiDocumentFieldsAddressInfo } from "../models/YotiPayloads";
import {
	VerifiedCredentialEvidence,
	VerifiedCredentialSubject,
} from "../utils/IVeriCredential";

export class GenerateVerifiableCredential {
  readonly logger: Logger;

  private static instance: GenerateVerifiableCredential;

  constructor(logger: Logger) {
  	this.logger = logger;
  }

  static getInstance(logger: Logger): GenerateVerifiableCredential {
  	if (!GenerateVerifiableCredential.instance) {
  		GenerateVerifiableCredential.instance = new GenerateVerifiableCredential(
  			logger,
  		);
  	}
  	return GenerateVerifiableCredential.instance;
  }

  /**
		Checks if Document contains a chip and if that chip is valid by checking the chip_csca_trusted field
   */
  private doesDocumentContainValidChip(documentType: string, documentAuthenticityCheckBreakdown: Array<{ sub_check: string; result: string }>): boolean {
  	if (DOCUMENT_TYPES_WITH_CHIPS.includes(documentType)) {
  		const validChip = documentAuthenticityCheckBreakdown.some(
  			(subCheck: { sub_check: string; result: string }) =>
  				subCheck.sub_check === YotiSessionDocument.CHIP_CSCA_TRUSTED && subCheck.result === YotiSessionDocument.SUBCHECK_PASS,
  		);

  		return validChip;
  	}
  	return false;
  }


  /**
   * The following Documents will get a strength score of 4
   * UK Passports with valid chip
   * National ID with valid chip
   * Residential Permits

   * The following Documents will get a strength score of 3
   * UK Passports without valid chip
   * UK Driving Licence
   * NonUK Passport
   * NonUK Driving Licence
   * National ID without valid chip
   *
   * Confulence Link: https://govukverify.atlassian.net/wiki/spaces/FTFCRI/pages/3545465037/Draft+-+Generating+Strength+from+Yoti+Results
   **/
  private calculateStrengthScore(documentType: string, issuingCountry: string, documentContainsValidChip: boolean): number {
  	if (issuingCountry === "GBR") {
  		switch (documentType) {
  			case "PASSPORT":
  				return documentContainsValidChip ? 4 : 3;
  			case "DRIVING_LICENCE":
  				return 3;
  			default:
  				throw new AppError(HttpCodesEnum.SERVER_ERROR, "Invalid documentType provided for issuingCountry", {
  					documentType, issuingCountry,
  				});
  		}
  	} else {
  		switch (documentType) {
  			case "PASSPORT":
  				return 3;
  			case "DRIVING_LICENCE":
  				return 3;
  			case "NATIONAL_ID":
  				return documentContainsValidChip ? 4 : 3;
  			case "RESIDENCE_PERMIT":
  				return 4;
  			default:
  				throw new AppError(HttpCodesEnum.SERVER_ERROR, "Invalid documentType provided", {
  					documentType, issuingCountry,
  				});
  		}
  	}
  }


  /**
   * IF the overall recommendation for ID_DOCUMENT_AUTHENTICITY is APPROVE
   * - If the document being scanned contains a valid chip the Validity score will be 3
   * - If the document being scanned does not a valid chip Validity score will be 2
   * IF the overall recommendation for ID_DOCUMENT_AUTHENTICITY is NOT APPROVE the Validity score will be 0
   *
   * Confulence Link: https://govukverify.atlassian.net/wiki/spaces/FTFCRI/pages/3545825281/Draft+-+Generating+Validation+from+Yoti+Results
   **/
  private calculateValidityScore(
  	authenticityRecommendation: string,
  	documentContainsValidChip: boolean,
  ): number {
  	if (authenticityRecommendation === YotiSessionDocument.APPROVE) {
  		return documentContainsValidChip ? 3 : 2;
  	}
  	return 0;
  }

  /**
   * IF ID_DOCUMENT_FACE_MATCH has recommendation of "APPROVE" and validityScore isn't 0, a score of 3 will be given else 0
   *
   * Confluence Link: https://govukverify.atlassian.net/wiki/spaces/FTFCRI/pages/3545792513/Draft+-+Generating+Verification+from+Yoti+Results
   **/
  private calculateVerificationProcessLevel(validityScore: number, faceMatchCheck: string): number {
  	return faceMatchCheck === YotiSessionDocument.APPROVE && validityScore != 0 ? 3 : 0;
  }

  private getContraIndicator(
  	ID_DOCUMENT_FACE_MATCH_RECOMMENDATION: YotiCheckRecommendation,
  	ID_DOCUMENT_AUTHENTICITY_RECOMMENDATION: YotiCheckRecommendation,
  ): string[] {
  	const ci: string[] = [];

  	const addToCI = (code: string | string[]) => {
  		if (Array.isArray(code)) {
  			ci.push(...code);
  		} else {
  			ci.push(code);
  		}
  	};

  	const handleFaceMatchRejection = () => {
  		const { value, reason } = ID_DOCUMENT_FACE_MATCH_RECOMMENDATION;
  		if (value === "REJECT") {
  			switch (reason) {
  				case "FACE_NOT_GENUINE":
  				case "LARGE_AGE_GAP":
  				case "PHOTO_OF_MASK":
  				case "PHOTO_OF_PHOTO":
  				case "DIFFERENT_PERSON":
  					addToCI("V01");
  					break;
  				default:
  					break;
  			}
  		}
  	};

  	const handleAuthenticityRejection = () => {
  		const { value, reason } = ID_DOCUMENT_AUTHENTICITY_RECOMMENDATION;
  		if (value === "REJECT") {
  			switch (reason) {
  				case "COUNTERFEIT":
  					addToCI("D14");
  					break;
  				case "EXPIRED_DOCUMENT":
  					addToCI("D16");
  					break;
  				case "FRAUD_LIST_MATCH":
  					addToCI(["F03", "D14"]);
  					break;
  				case "DOC_NUMBER_INVALID":
  					addToCI("D02");
  					break;
  				case "TAMPERED":
  				case "DATA_MISMATCH":
  				case "CHIP_DATA_INTEGRITY_FAILED":
  				case "CHIP_SIGNATURE_VERIFICATION_FAILED":
  				case "CHIP_CSCA_VERIFICATION_FAILED":
  					addToCI("D14");
  					break;
  				default:
  					break;
  			}
  		}
  	};

  	handleFaceMatchRejection();
  	handleAuthenticityRejection();

  	return ci;
  }

  private attachPersonName(
  	credentialSubject: VerifiedCredentialSubject,
  	givenName: string,
  	familyName: string,
  ): VerifiedCredentialSubject {
  	const givenNames = givenName.split(/\s+/);
  	const nameParts = givenNames.map((name) => ({ value: name, type: "GivenName" }));

  	nameParts.push({ value: familyName, type: "FamilyName" });

  	credentialSubject.name = [{ nameParts }];

  	return credentialSubject;
  }

  private attachDOB(
  	credentialSubject: VerifiedCredentialSubject,
  	dateOfBirth: string,
  ): VerifiedCredentialSubject {
  	credentialSubject.birthDate = [{ value: dateOfBirth }];

  	return credentialSubject;
  }


  private attachAddressInfo(
  	credentialSubject: VerifiedCredentialSubject,
  	postalAddress: YotiDocumentFieldsAddressInfo,
  ): VerifiedCredentialSubject {
  	credentialSubject.address = [
  		{
  			buildingNumber: postalAddress.building_number,
  			streetName: postalAddress?.address_line1?.match(/[a-zA-Z\s]+/)?.[0]?.trim(),
  			addressLocality: postalAddress.town_city,
  			postalCode: postalAddress.postal_code,
  			addressCountry: postalAddress.country,
  		},
  	];

  	return credentialSubject;
  }

  private attachEvidencePayload(
  	credentialSubject: VerifiedCredentialSubject,
  	documentType: string,
  	issuingCountry: string,
  	documentFields: YotiDocumentFields,
  ): VerifiedCredentialSubject {
  	if (issuingCountry === "GBR") {
  		switch (documentType) {
  			case "PASSPORT":
  				credentialSubject.passport = [
  					{
  						documentNumber: documentFields.document_number,
  						expiryDate: documentFields.expiration_date,
  						icaoIssuerCode: documentFields.issuing_country,
  					},
  				];
  				break;
  			case "DRIVING_LICENCE":
  				credentialSubject.drivingPermit = [
  					{
  						personalNumber: documentFields.document_number,
  						expiryDate: documentFields.expiration_date,
  						issueDate: documentFields.date_of_issue,
  						issuedBy: documentFields.issuing_authority,
  						fullAddress: documentFields.formatted_address,
  					},
  				];
  				break;
  			case "RESIDENCE_PERMIT": //TBC
  				credentialSubject.residencePermit = [
  					{
  						documentNumber: documentFields.document_number,
  						expiryDate: documentFields.expiration_date,
  						issueDate: documentFields.date_of_issue,
  						issuingCountry: documentFields.place_of_issue,
  					},
  				];
  				break;
  			default:
  				throw new AppError(HttpCodesEnum.SERVER_ERROR, "Invalid documentType provided", {
  					documentType, issuingCountry,
  				});
  		}
  	} else {
  		switch (documentType) {
  			case "PASSPORT":
  				credentialSubject.passport = [
  					{
  						documentNumber: documentFields.document_number,
  						expiryDate: documentFields.expiration_date,
  						icaoIssuerCode: documentFields.issuing_country,
  					},
  				];
  				break;
  			case "DRIVING_LICENCE": //TBC
  				credentialSubject.drivingPermit = [
  					{
  						personalNumber: documentFields.document_number,
  						expiryDate: documentFields.expiration_date,
  						issueDate: documentFields.date_of_issue,
  						issuedBy: documentFields.issuing_country, //TBC - May need to be mapped
  					},
  				];
  				break;
  			case "NATIONAL_ID": //TBC
  				credentialSubject.nationalId = [
  					{
  						personalNumber: documentFields.document_number,
  						expiryDate: documentFields.expiration_date,
  						issueDate: documentFields.date_of_issue,
  						issuedBy: documentFields.issuing_country, //TBC - May need to be mapped
  					},
  				];
  				break;
  			default:
  				throw new AppError(HttpCodesEnum.SERVER_ERROR, "Invalid documentType provided", {
  					documentType, issuingCountry,
  				});
  		}
  	}
  	return credentialSubject;
  }


  getVerifiedCredentialInformation(
  	yotiSessionId: string,
  	completedYotiSessionPayload: YotiCompletedSession,
  	documentFields: YotiDocumentFields,
  ): {
  		credentialSubject: VerifiedCredentialSubject;
  		evidence: VerifiedCredentialEvidence;
  	} {
  	const { id_documents: idDocuments } = completedYotiSessionPayload.resources;
  	const { checks } = completedYotiSessionPayload;
  	const documentType = idDocuments[0].document_type;
  	const yotiCountryCode = idDocuments[0].issuing_country;

  	const findCheck = (type: string) =>
  		checks.find((checkCompleted: { type: string }) => checkCompleted.type === type);

  	const getCheckObject = (check: any) => ({
  		object: check,
  		state: check.state,
  		recommendation: check.report.recommendation,
  		breakdown: check.report.breakdown,
  	});

  	//IBV_VISUAL_REVIEW_CHECK && DOCUMENT_SCHEME_VALIDITY && PROFILE_DOCUMENT_MATCH Currently not being consumed
  	const MANDATORY_CHECKS = {
  		ID_DOCUMENT_AUTHENTICITY: findCheck(YOTI_CHECKS.ID_DOCUMENT_AUTHENTICITY.type) ? getCheckObject(findCheck(YOTI_CHECKS.ID_DOCUMENT_AUTHENTICITY.type)) : null,
  		ID_DOCUMENT_FACE_MATCH: findCheck(YOTI_CHECKS.ID_DOCUMENT_FACE_MATCH.type) ? getCheckObject(findCheck(YOTI_CHECKS.ID_DOCUMENT_FACE_MATCH.type)) : null,
  		IBV_VISUAL_REVIEW_CHECK: findCheck(YOTI_CHECKS.IBV_VISUAL_REVIEW_CHECK.type) ? getCheckObject(findCheck(YOTI_CHECKS.IBV_VISUAL_REVIEW_CHECK.type)) : null,
  		DOCUMENT_SCHEME_VALIDITY: findCheck(YOTI_CHECKS.DOCUMENT_SCHEME_VALIDITY_CHECK.type) ? getCheckObject(findCheck(YOTI_CHECKS.DOCUMENT_SCHEME_VALIDITY_CHECK.type)) : null,
  		PROFILE_DOCUMENT_MATCH: findCheck(YOTI_CHECKS.PROFILE_DOCUMENT_MATCH.type) ? getCheckObject(findCheck(YOTI_CHECKS.PROFILE_DOCUMENT_MATCH.type)) : null,
  	};

  	this.logger.info({ message: "Yoti Mandatory Checks" }, MANDATORY_CHECKS);

  	if (Object.values(MANDATORY_CHECKS).some((check) => check?.object === undefined)) {
  		throw new AppError(
  			HttpCodesEnum.BAD_REQUEST,
  			"Missing mandatory checks in Yoti completed payload",
  			{ MANDATORY_CHECKS },
  		);
  	}

  	if (
  		Object.values(MANDATORY_CHECKS).some(
  			(check) => check?.state !== YotiSessionDocument.DONE_STATE,
  		)
  	) {
  		throw new AppError(HttpCodesEnum.BAD_REQUEST, "Mandatory checks not all completed");
  	}

  	let credentialSubject: VerifiedCredentialSubject = {};

  	//Attach individuals name information to the VC payload
  	credentialSubject = this.attachPersonName(
  		credentialSubject,
  		documentFields.given_names,
  		documentFields.family_name,
  	);
  	//Attach individuals DOB to the VC payload
  	credentialSubject = this.attachDOB(credentialSubject, documentFields.date_of_birth);
  	//If address info present in Media document attach individuals Address to the VC payload
  	if (documentFields.structured_postal_address) {
  		credentialSubject = this.attachAddressInfo(
  			credentialSubject,
  			documentFields.structured_postal_address,
  	);
  	}
  	//Attach evidence block to the VC payload
  	credentialSubject = this.attachEvidencePayload(
  		credentialSubject,
  		documentType,
  		yotiCountryCode,
  		documentFields,
  	);

  	const documentContainsValidChip = this.doesDocumentContainValidChip(
  		documentType,
  		MANDATORY_CHECKS.ID_DOCUMENT_AUTHENTICITY?.breakdown,
  	);

  	const manualFaceMatchCheck = MANDATORY_CHECKS.ID_DOCUMENT_FACE_MATCH?.breakdown.some(
  		(subCheck: { sub_check: string; result: string }) =>
  			subCheck.sub_check === "manual_face_match" &&
				subCheck.result === YotiSessionDocument.SUBCHECK_PASS,
  	);

  	const validityScore =   this.calculateValidityScore( MANDATORY_CHECKS.ID_DOCUMENT_AUTHENTICITY?.recommendation.value, documentContainsValidChip);
  	const verificationScore  = this.calculateVerificationProcessLevel( validityScore, MANDATORY_CHECKS.ID_DOCUMENT_FACE_MATCH?.recommendation.value);
  	const evidence: VerifiedCredentialEvidence = [
  		{
  			type: "IdentityCheck",
  			strengthScore: this.calculateStrengthScore(documentType, yotiCountryCode, documentContainsValidChip),
  			validityScore,
  			verificationScore,
  		},
  	];

  	if (
  		evidence[0].strengthScore === 0 ||
			evidence[0].validityScore === 0 ||
			evidence[0].verificationScore === 0
  	) {
  		const contraIndicators = this.getContraIndicator(MANDATORY_CHECKS.ID_DOCUMENT_FACE_MATCH?.recommendation, MANDATORY_CHECKS.ID_DOCUMENT_AUTHENTICITY?.recommendation);
  		if (contraIndicators.length >= 1) {
  			evidence[0].ci = contraIndicators;
  		}
  		evidence[0].failedCheckDetails = [
  			{
  				checkMethod: "vcrypt",
  				identityCheckPolicy: "published",
  			},
  			{
  				checkMethod: manualFaceMatchCheck ? "pvr" : "bvr",
  			},
  		];

  		manualFaceMatchCheck ? evidence[0].failedCheckDetails[1].photoVerificationProcessLevel = 3 : evidence[0].failedCheckDetails[1].biometricVerificationProcessLevel = 3;
  	} else {
  		evidence[0].checkDetails = [
  			{
  				checkMethod: documentContainsValidChip ? "vcrypt" : "vri",
  				txn: yotiSessionId,
  				identityCheckPolicy: "published",
  			},
  			{
  				checkMethod: manualFaceMatchCheck ? "pvr" : "bvr",
  				txn: yotiSessionId,
  			},
  		];

  		manualFaceMatchCheck ? evidence[0].checkDetails[1].photoVerificationProcessLevel = 3 : evidence[0].checkDetails[1].biometricVerificationProcessLevel = 3;
  	}

  	return {
  		credentialSubject,
  		evidence,
  	};
  }
}
