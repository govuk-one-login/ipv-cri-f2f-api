/* eslint-disable no-console */
import { Logger } from "@aws-lambda-powertools/logger";
import { AppError } from "../utils/AppError";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { YOTI_CHECKS, YotiSessionDocument } from "../utils/YotiPayloadEnums";
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
		Checks if Document contains a chip and if that chip is valid but checking the chip_csca_trusted field
	*/
  private doesDocumentContainValidChip(documentType: string, documentAuthenticityCheckBreakdown: { sub_check: string; result: string; }[]): boolean {
  	const validDocumentTypes = ["PASSPORT", "NATIONAL_ID", "RESIDENCE_PERMIT"];
	
  	if (validDocumentTypes.includes(documentType)) {
  		const validChip = documentAuthenticityCheckBreakdown.some(
  			(subCheck: { sub_check: string; result: string }) =>
  				subCheck.sub_check === YotiSessionDocument.CHIP_CSCA_TRUSTED && subCheck.result === YotiSessionDocument.SUBCHECK_PASS,
  		);
	
  		return validChip;
  	}
	
  	return false;
  }
	

	/**
	 The following documents will be scored a 3:
	 	Non chipped Passports or passports with chips which are un-opened
		UK or EU Drivers Licence
		EEA National Identity Card (Without Chip being read)
		
	 The following documents will be scored a 4:
	 	UK Passports or Passports where the chip has been opened
		BRP
		EEA National Identity Card (With Chip which has been read)
	*/
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
		}
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
	

	/**
		If the ID_DOCUMENT_AUTHENTICITY object has a recommendation value of approve, the document should be given a validity score of 2
		If the ID_DOCUMENT_AUTHENTICITY has an recommendation value of approve and the object also includes an NFC check, the validity score will be 3. 
	*/
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
		If the ID_DOCUMENT_FACE_MATCH object has a recommendation value of APPROVE, the document should be given a verification score of 3 
	*/
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
		issuingCountry: string,
  	documentFields: any,
  ): VerifiedCredentialSubject {

		console.log('documentType', documentType);
		console.log('issuingCountry', issuingCountry);
		console.log('documentFields', documentFields);
		console.log('issuing_authority', documentFields.issuing_authority);
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
	
  	const findCheck = (type: string) =>
  		checks.find((checkCompleted: { type: string }) => checkCompleted.type === type);
	
  	const getCheckObject = (check: { state: any; report: { recommendation: any; breakdown: any } }) => ({
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
		const isAddressPresent = documentFields.structured_postal_address;
		this.logger.info({ message: "Does document contain address details" }, isAddressPresent);
		//If address info present in Media document dttach individuals Address to the VC payload
  	if (isAddressPresent) {
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
	
		//Assumption here that same subCheck won't be sent twice within same Check
  	const documentContainsValidChip = this.doesDocumentContainValidChip(
  		documentType,
  		MANDATORY_CHECKS.ID_DOCUMENT_AUTHENTICITY?.breakdown,
  	);
	
		//Assumption here that same subCheck won't be sent twice within same Check
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
