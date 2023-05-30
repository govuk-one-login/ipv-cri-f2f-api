/* eslint-disable no-console */
import { Logger } from "@aws-lambda-powertools/logger";
import { AppError } from "../utils/AppError";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { YotiDocumentTypesEnum, YOTI_CHECKS, YotiSessionDocument } from "../utils/YotiPayloadEnums";
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

  private doesDocumentContainValidChip(documentType: string, documentAuthenticityCheckBreakdown: any): boolean {
  	const validDocumentTypes = ["PASSPORT", "NATIONAL_ID"];
	
  	if (validDocumentTypes.includes(documentType)) {
  		const validChip = documentAuthenticityCheckBreakdown.some(
  			(subCheck: { sub_check: string; result: string }) =>
  				subCheck.sub_check === YotiSessionDocument.CHIP_CSCA_TRUSTED && subCheck.result === YotiSessionDocument.SUBCHECK_PASS,
  		);
	
  		return validChip;
  	}
	
  	return false;
  }
	

  private calculateStrengthScore(documentType: string, issuingCountry: string, documentContainsValidChip: boolean): number {
  	if (issuingCountry === "GBR") {
			switch (documentType) {
				case "PASSPORT":
					return documentContainsValidChip ? 4 : 3;
				case YotiDocumentTypesEnum.UKPHOTOCARDDL:
						return 3;
				default:
					throw new AppError(HttpCodesEnum.SERVER_ERROR, "Invalid documentType provided for issuingCountry", {
						documentType, issuingCountry,
					});
			}
		}
		switch (documentType) {
			case YotiDocumentTypesEnum.NONUKPASSPORT:
  			return 3;
			case YotiDocumentTypesEnum.EUPHOTOCARDDL:
  			return 3;
			case YotiDocumentTypesEnum.EEAIDENTITYCARD:
				return documentContainsValidChip ? 4 : 3;
			case YotiDocumentTypesEnum.BRP:
				return 4;
  		default:
  			throw new AppError(HttpCodesEnum.SERVER_ERROR, "Invalid documentType provided", {
  				documentType,
  			});
  	}
  }
	

  private calculateValidityScore(
  	authenticityRecommendation: string,
  	documentContainsValidChip: boolean,
  ): number {
  	if (authenticityRecommendation === YotiSessionDocument.APPROVE) {
  		return documentContainsValidChip ? 3 : 2;
  	}
  	return 0;
  }
	
  private calculateVerificationProcessLevel(faceMatchCheck: string): number {
  	return faceMatchCheck === YotiSessionDocument.APPROVE ? 3 : 0;
  }
	
  private getCounterIndicator(
  	ID_DOCUMENT_FACE_MATCH_RECOMMENDATION: any,
  	ID_DOCUMENT_AUTHENTICITY_RECOMMENDATION: any,
  	IBV_VISUAL_REVIEW_CHECK_RECOMMENDATION?: any,
  	DOCUMENT_SCHEME_VALIDITY_CHECK_RECOMMENDATION?: any,
  	PROFILE_DOCUMENT_MATCH_RECOMMENDATION?: any,
  ): any {
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
  	const givenNames = givenName.split(" ");
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
  	postalAddress: any,
  ): VerifiedCredentialSubject {
  	credentialSubject.address = [
  		{
  			buildingNumber: postalAddress.building_number,
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
  	documentFields: any,
  ): VerifiedCredentialSubject {
  	switch (documentType) {
  		case YotiDocumentTypesEnum.UKPHOTOCARDDL:
  			credentialSubject.drivingPermit = [
  				{
  					personalNumber: documentFields.document_number,
  					expiryDate: documentFields.expiration_date,
  					issueDate: documentFields.date_of_issue,
  					issueNumber: null,
  					issuedBy: documentFields.issuing_authority,
  					fullAddress: documentFields.formatted_address,
  				},
  			];
  			break;
  		case YotiDocumentTypesEnum.UKPASSPORT:
  			credentialSubject.passport = [
  				{
  					documentNumber: documentFields.document_number,
  					expiryDate: documentFields.expiration_date,
  					icaoIssuerCode: documentFields.issuing_country,
  				},
  			];
  			break;
  		default:
  			throw new AppError(
  				HttpCodesEnum.SERVER_ERROR,
  				"Invalid documentType provided: " + documentType,
  			);
  	}
	
  	return credentialSubject;
  }
	

  getVerifiedCredentialInformation(this: any, 
  	yotiSessionId: string,
  	completedYotiSessionPayload: any,
  	documentFields: any,
  ): {
  		credentialSubject: VerifiedCredentialSubject;
  		evidence: VerifiedCredentialEvidence;
  	} {
  	const { id_documents: idDocuments } = completedYotiSessionPayload.resources;
  	const { checks } = completedYotiSessionPayload;
  	const documentType = idDocuments[0].document_type;
		const yotiCountryCode = idDocuments[0].issuing_country;


		// const documentType = idDocuments[0].document_type;
	
  	const findCheck = (type: string) =>
  		checks.find((checkCompleted: { type: string }) => checkCompleted.type === type);
	
  	const getCheckObject = (check: { state: any; report: { recommendation: any; breakdown: any } }) => ({
  		object: check,
  		state: check.state,
  		recommendation: check.report.recommendation,
  		breakdown: check.report.breakdown,
  	});
	
  	const MANDATORY_CHECKS = {
  		ID_DOCUMENT_AUTHENTICITY: findCheck(YOTI_CHECKS.ID_DOCUMENT_AUTHENTICITY.type) ? getCheckObject(findCheck(YOTI_CHECKS.ID_DOCUMENT_AUTHENTICITY.type)) : null,
  		ID_DOCUMENT_FACE_MATCH: findCheck(YOTI_CHECKS.ID_DOCUMENT_FACE_MATCH.type) ? getCheckObject(findCheck(YOTI_CHECKS.ID_DOCUMENT_FACE_MATCH.type)) : null,
  		IBV_VISUAL_REVIEW_CHECK: findCheck(YOTI_CHECKS.IBV_VISUAL_REVIEW_CHECK.type) ? getCheckObject(findCheck(YOTI_CHECKS.IBV_VISUAL_REVIEW_CHECK.type)) : null,
  		DOCUMENT_SCHEME_VALIDITY: findCheck(YOTI_CHECKS.DOCUMENT_SCHEME_VALIDITY_CHECK.type) ? getCheckObject(findCheck(YOTI_CHECKS.DOCUMENT_SCHEME_VALIDITY_CHECK.type)) : null,
  		PROFILE_DOCUMENT_MATCH: findCheck(YOTI_CHECKS.PROFILE_DOCUMENT_MATCH.type) ? getCheckObject(findCheck(YOTI_CHECKS.PROFILE_DOCUMENT_MATCH.type)) : null,
  	};
	
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
	
  	credentialSubject = this.attachPersonName(
  		credentialSubject,
  		documentFields.given_names,
  		documentFields.family_name,
  	);
  	credentialSubject = this.attachDOB(credentialSubject, documentFields.date_of_birth);
  	if (documentFields.structured_postal_address) {
  		credentialSubject = this.attachAddressInfo(
  			credentialSubject,
  			documentFields.structured_postal_address,
  	);
  	}
  	credentialSubject = this.attachEvidencePayload(
  		credentialSubject,
  		documentType,
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
	
  	const evidence: VerifiedCredentialEvidence = [
  		{
  			type: "IdentityCheck",
  			strengthScore: this.calculateStrengthScore(documentType, yotiCountryCode, documentContainsValidChip),
  			validityScore: this.calculateValidityScore(
  				MANDATORY_CHECKS.ID_DOCUMENT_AUTHENTICITY?.recommendation.value,
  				documentContainsValidChip,
  			),
  			verificationScore: this.calculateVerificationProcessLevel(
  				MANDATORY_CHECKS.ID_DOCUMENT_FACE_MATCH?.recommendation.value,
  			),
  		},
  	];
	
  	if (
  		evidence[0].strengthScore === 0 ||
			evidence[0].validityScore === 0 ||
			evidence[0].verificationScore === 0
  	) {
			const counterIndicators = this.getCounterIndicator(MANDATORY_CHECKS.ID_DOCUMENT_FACE_MATCH?.recommendation, MANDATORY_CHECKS.ID_DOCUMENT_AUTHENTICITY?.recommendation);
			if (counterIndicators.length >= 1) {
				evidence[0].ci = counterIndicators
			}
  		evidence[0].failedCheckDetails = [
  			{
  				checkMethod: "vcrypt",
  				identityCheckPolicy: "published",
  			},
  			{
  				checkMethod: "bvr",
  				biometricVerificationProcessLevel: 3,
  			},
  		];
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
  				biometricVerificationProcessLevel: 3,
  			},
  		];
  	}
	
  	return {
  		credentialSubject,
  		evidence,
  	};
  }
}
