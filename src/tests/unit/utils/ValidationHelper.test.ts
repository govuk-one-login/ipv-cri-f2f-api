import { JwtPayload } from "../../../utils/IVeriCredential";
import { ValidationHelper } from "../../../utils/ValidationHelper";
import { MessageCodes } from "../../../models/enums/MessageCodes";
let jwtPayload: JwtPayload;

function getMockJwtPayload(): JwtPayload {
	const payload: JwtPayload = {
		shared_claims: {
			name: [
				{
					nameParts: [
						{
							value: "John",
							type: "GivenName",
						},
						{
							value: "Joseph",
							type: "GivenName",
						},
						{
							value: "Testing",
							type: "FamilyName",
						},
					],
				},
			],
			birthDate: [
				{
					value: "1960-02-02",
				},
			],
			address: [
				{
					addressCountry: "GB",
					buildingName: "Sherman",
					subBuildingName: "Flat 5",
					uprn: 123456789,
					streetName: "Wallaby Way",
					postalCode: "F1 1SH",
					buildingNumber: "32",
					addressLocality: "Sidney",
				},
			],
			emailAddress: "test.user@digital.cabinet-office.gov.uk",
		},
	};
	return payload;
}

const validationHelper = new ValidationHelper();

describe("ValidationHelper", () => {
	beforeAll(() => {
		jest.clearAllMocks();
		jwtPayload = getMockJwtPayload();
	});

	beforeEach(() => {
		jest.resetAllMocks();
		jwtPayload = getMockJwtPayload();
	});

	it("isAddressFormatValid function should return empty errorMessage and errorMessageCode when all fields are present in the address", () => {
		const { errorMessage, errorMessageCode } =
      validationHelper.isAddressFormatValid(jwtPayload);

		expect(errorMessage).toBe("");
		expect(errorMessageCode).toBe("");
	});

	it("isAddressFormatValid function should return the expected errorMessage and errorMessageCode for invalid countryCode", () => {
		// set countryCode to an invalid value
		jwtPayload.shared_claims.address[0].addressCountry = "United Kingdom";
		const { errorMessage, errorMessageCode } =
      validationHelper.isAddressFormatValid(jwtPayload);

		expect(errorMessage).toBe(
			"Invalid country code: country code is not GB in the postalAddress",
		);
		expect(errorMessageCode).toStrictEqual(MessageCodes.INVALID_COUNTRY_CODE);
	});

	it("isAddressFormatValid function should return the expected errorMessage and errorMessageCode for invalid address format- missing mandatory fields", () => {
		jwtPayload.shared_claims.address[0].addressCountry = "GB";
		// delete mandatory fields
		delete jwtPayload.shared_claims.address[0].buildingName;
		delete jwtPayload.shared_claims.address[0].buildingNumber;
		delete jwtPayload.shared_claims.address[0].subBuildingName;
		const { errorMessage, errorMessageCode } =
      validationHelper.isAddressFormatValid(jwtPayload);

		expect(errorMessage).toBe(
			"Missing all or some of mandatory postalAddress fields (subBuildingName, buildingName, buildingNumber and streetName), unable to create the session",
		);
		expect(errorMessageCode).toStrictEqual(
			MessageCodes.MISSING_ALL_MANDATORY_POSTAL_ADDRESS_FIELDS,
		);
	});

	it("isSharedClaimDataValid function should return empty errorMessage and errorMessageCode when all fields are present in the sharedClaim payload", () => {
		const { errorMessage, errorMessageCode } =
      validationHelper.isPersonDetailsValid(
      	jwtPayload.shared_claims.emailAddress,
      	jwtPayload.shared_claims.name,
      );

		expect(errorMessage).toBe("");
		expect(errorMessageCode).toBe("");
	});

	it("isSharedClaimDataValid function should return the expected errorMessage and errorMessageCode when emailAddress is missing in the sharedClaim paylaod", () => {
		// delete emailAddress field
		delete jwtPayload.shared_claims.emailAddress;
		const { errorMessage, errorMessageCode } =
      validationHelper.isPersonDetailsValid(
      	jwtPayload.shared_claims.emailAddress,
      	jwtPayload.shared_claims.name,
      );

		expect(errorMessage).toBe("Missing emailAddress");
		expect(errorMessageCode).toStrictEqual(
			MessageCodes.MISSING_PERSON_EMAIL_ADDRESS,
		);
	});

	it("isSharedClaimDataValid function should return the expected errorMessage and errorMessageCode when name is missing in the sharedClaim paylaod", () => {
		// delete emailAddress field
		delete jwtPayload.shared_claims.name;
		const { errorMessage, errorMessageCode } =
      validationHelper.isPersonDetailsValid(
      	jwtPayload.shared_claims.emailAddress,
      	jwtPayload.shared_claims.name,
      );

		expect(errorMessage).toBe("Missing person's GivenName or FamilyName");
		expect(errorMessageCode).toStrictEqual(
			MessageCodes.MISSING_PERSON_IDENTITY_NAME,
		);
	});

	it("isSharedClaimDataValid function should return the expected errorMessage and errorMessageCode when GivenName is empty in the sharedClaim paylaod", () => {
		jwtPayload.shared_claims.name = [
			{
				nameParts: [
					{
						value: " ",
						type: "GivenName",
					},
					{
						value: "Testing",
						type: "FamilyName",
					},
				],
			},
		];
		const { errorMessage, errorMessageCode } =
      validationHelper.isPersonDetailsValid(
      	jwtPayload.shared_claims.emailAddress,
      	jwtPayload.shared_claims.name,
      );

		expect(errorMessage).toBe("Missing person's GivenName or FamilyName");
		expect(errorMessageCode).toStrictEqual(
			MessageCodes.MISSING_PERSON_IDENTITY_NAME,
		);
	});

	it("isSharedClaimDataValid function should return the expected errorMessage and errorMessageCode when FamilyName is empty in the sharedClaim paylaod", () => {
		jwtPayload.shared_claims.name = [
			{
				nameParts: [
					{
						value: "John",
						type: "GivenName",
					},
					{
						value: " ",
						type: "FamilyName",
					},
				],
			},
		];
		const { errorMessage, errorMessageCode } =
      validationHelper.isPersonDetailsValid(
      	jwtPayload.shared_claims.emailAddress,
      	jwtPayload.shared_claims.name,
      );

		expect(errorMessage).toBe("Missing person's GivenName or FamilyName");
		expect(errorMessageCode).toStrictEqual(
			MessageCodes.MISSING_PERSON_IDENTITY_NAME,
		);
	});
});
