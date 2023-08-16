import { JwtPayload } from "../../../utils/IVeriCredential";
import { ValidationHelper } from "../../../utils/ValidationHelper";
import { MessageCodes } from "../../../models/enums/MessageCodes";

const jwtPayload: JwtPayload = {
	shared_claims:{
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
	},
};

const validationHelper = new ValidationHelper();

describe("ValidationHelper", () => {
	
	beforeAll(() => {
		jest.clearAllMocks();
	});

	beforeEach(() => {
		jest.resetAllMocks();
	});

	it("isAddressFormatValid function should return empty errorMessage and errorMessageCode when all fields are present in the address", () => {
		const { errorMessage, errorMessageCode } = validationHelper.isAddressFormatValid(jwtPayload);

		expect(errorMessage).toBe("");
		expect(errorMessageCode).toBe("");
	});

	it("isAddressFormatValid function should return the expected errorMessage and errorMessageCode for invalid countryCode", () => {
		// set countryCode to an invalid value
		jwtPayload.shared_claims.address[0].addressCountry = "United Kingdom";
		const { errorMessage, errorMessageCode } = validationHelper.isAddressFormatValid(jwtPayload);

		expect(errorMessage).toBe("Invalid country code: country code is not GB in the postalAddress");
		expect(errorMessageCode).toStrictEqual(MessageCodes.INVALID_COUNTRY_CODE);
	});

	it("isAddressFormatValid function should return the expected errorMessage and errorMessageCode for invalid address format- missing mandatory fields", () => {
		jwtPayload.shared_claims.address[0].addressCountry = "GB";
		// delete mandatory fields
		delete jwtPayload.shared_claims.address[0].buildingName;
		delete jwtPayload.shared_claims.address[0].buildingNumber;
		delete jwtPayload.shared_claims.address[0].subBuildingName;
		const { errorMessage, errorMessageCode } = validationHelper.isAddressFormatValid(jwtPayload);

		expect(errorMessage).toBe("Missing all or some of mandatory postalAddress fields (subBuildingName, buildingName, buildingNumber and streetName), unable to create the session");
		expect(errorMessageCode).toStrictEqual(MessageCodes.MISSING_ALL_MANDATORY_POSTAL_ADDRESS_FIELDS);
	});

});
