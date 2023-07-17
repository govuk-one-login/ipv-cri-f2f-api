import { personIdentityUtils } from "../../../utils/PersonIdentityUtils";
import { PersonIdentityItem } from "../../../models/PersonIdentityItem";
import { mock } from "jest-mock-extended";
import { Logger } from "@aws-lambda-powertools/logger";
import { AppError } from "../../../utils/AppError";
import { HttpCodesEnum } from "../../../utils/HttpCodesEnum";

const logger = mock<Logger>();
const personDetails: PersonIdentityItem = {
	addresses: [
		{
			addressCountry: "United Kingdom",
			buildingName: "Sherman",
			subBuildingName: "Flat 5",
			uprn: 123456789,
			streetName: "Wallaby Way",
			postalCode: "F1 1SH",
			buildingNumber: "32",
			addressLocality: "Sidney",
		},
	],
	sessionId: "RandomF2FSessionID",
	emailAddress: "test123@gov.uk",
	birthDate: [
		{
			value: "1960-02-02",
		},
	],
	name: [
		{
			nameParts: [
				{
					type: "GivenName",
					value: "Frederick",
				},
				{
					type: "GivenName",
					value: "Joseph",
				},
				{
					type: "FamilyName",
					value: "Flintstone",
				},
			],
		},
	],
	expiryDate: 1612345678,
	createdDate: 1612335678,
};

const expectedStructuralPostalAddress =  {
	address_format: 1,
	building_number: "32",
	sub_building: "Flat 5",
	building: "Sherman",
	address_line1: "Flat 5 Sherman",
	address_line2: "32 Wallaby Way",
	town_city: "Sidney",
	postal_code: "F1 1SH",
	country_iso: "GBR",
	country: "United Kingdom",
};

describe("PersonIdentityUtils", () => {
	
	beforeAll(() => {
		jest.clearAllMocks();
	});

	beforeEach(() => {
		jest.resetAllMocks();
	});

	it("should return the expected structured_postal_address when all fields are present", () => {
		const addressDetails = personIdentityUtils.getYotiStructuredPostalAddress(personDetails.addresses[0], logger);

		expect(addressDetails).toStrictEqual(expectedStructuralPostalAddress);
	});

	it("should return the expected structured_postal_address when sub_building is empty", () => {
		// set subBuildingName to an empty string
		personDetails.addresses[0].subBuildingName = "";
		const addressDetails = personIdentityUtils.getYotiStructuredPostalAddress(personDetails.addresses[0], logger);

		expectedStructuralPostalAddress.sub_building = "";
		expectedStructuralPostalAddress.address_line1 = "Sherman";

		expect(addressDetails).toStrictEqual(expectedStructuralPostalAddress);
	});

	it("should map the address correctly when building_name is absent", () => {
		// set buildingName to an empty string
		personDetails.addresses[0].buildingName = "";
		personDetails.addresses[0].subBuildingName = "Flat 5";
		const addressDetails = personIdentityUtils.getYotiStructuredPostalAddress(personDetails.addresses[0], logger);

		expectedStructuralPostalAddress.building = "";
		expectedStructuralPostalAddress.sub_building = "Flat 5";
		expectedStructuralPostalAddress.address_line1 = "Flat 5";

		expect(addressDetails).toStrictEqual(expectedStructuralPostalAddress);
	});

	it("should map the address correctly when sub_building and building_name are absent", () => {
		// set subBuildingName and buildingName to an empty string
		delete personDetails.addresses[0].subBuildingName;
		personDetails.addresses[0].buildingName = " ";
		const addressDetails = personIdentityUtils.getYotiStructuredPostalAddress(personDetails.addresses[0], logger);

		expectedStructuralPostalAddress.sub_building = "";
		expectedStructuralPostalAddress.building = "";
		expectedStructuralPostalAddress.address_line1 = "32 Wallaby Way";
		expectedStructuralPostalAddress.address_line2 = "";

		expect(addressDetails).toStrictEqual(expectedStructuralPostalAddress);
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(logger.warn).toHaveBeenCalledWith({ "message": "subBuildingName and buildingName is empty for this postalAddress" }, { "messageCode": "MISSING_SUB_BUILDING_AND_BUILDING_NAME" });
	});

	it("should map the address correctly when sub_building and building_name are empty or having white spaces", () => {
		// set subBuildingName and buildingName to an empty string
		personDetails.addresses[0].subBuildingName = " ";
		personDetails.addresses[0].buildingName = "   ";
		const addressDetails = personIdentityUtils.getYotiStructuredPostalAddress(personDetails.addresses[0], logger);

		expectedStructuralPostalAddress.sub_building = "";
		expectedStructuralPostalAddress.building = "";
		expectedStructuralPostalAddress.address_line1 = "32 Wallaby Way";
		expectedStructuralPostalAddress.address_line2 = "";

		expect(addressDetails).toStrictEqual(expectedStructuralPostalAddress);
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(logger.warn).toHaveBeenCalledWith({ "message": "subBuildingName and buildingName is empty for this postalAddress" }, { "messageCode": "MISSING_SUB_BUILDING_AND_BUILDING_NAME" });
	});

	it("should map the address correctly when building_number is absent", () => {
		// set buildingNumber to an empty string
		personDetails.addresses[0].subBuildingName = "Flat 5";
		personDetails.addresses[0].buildingName = "Sherman";
		personDetails.addresses[0].buildingNumber = "";
		const addressDetails = personIdentityUtils.getYotiStructuredPostalAddress(personDetails.addresses[0], logger);

		expectedStructuralPostalAddress.sub_building = "Flat 5";
		expectedStructuralPostalAddress.building = "Sherman";
		expectedStructuralPostalAddress.building_number = "";
		expectedStructuralPostalAddress.address_line1 = "Flat 5 Sherman";
		expectedStructuralPostalAddress.address_line2 = "Wallaby Way";

		expect(addressDetails).toStrictEqual(expectedStructuralPostalAddress);
	});

	it("should map the address correctly when building_number and buildingName is empty", () => {
		// set buildingNumber and buildingName to an empty string
		personDetails.addresses[0].subBuildingName = "Flat 5";
		personDetails.addresses[0].buildingName = "";
		personDetails.addresses[0].buildingNumber = "";
		const addressDetails = personIdentityUtils.getYotiStructuredPostalAddress(personDetails.addresses[0], logger);

		expectedStructuralPostalAddress.sub_building = "Flat 5";
		expectedStructuralPostalAddress.building = "";
		expectedStructuralPostalAddress.building_number = "";
		expectedStructuralPostalAddress.address_line1 = "Flat 5";
		expectedStructuralPostalAddress.address_line2 = "Wallaby Way";

		expect(addressDetails).toStrictEqual(expectedStructuralPostalAddress);
	});

	it("should map the address correctly when building_number and buildingName is having white spaces", () => {
		// set buildingNumber and buildingName to an empty string
		personDetails.addresses[0].subBuildingName = "Flat 5";
		personDetails.addresses[0].buildingName = " ";
		personDetails.addresses[0].buildingNumber = "   ";
		const addressDetails = personIdentityUtils.getYotiStructuredPostalAddress(personDetails.addresses[0], logger);

		expectedStructuralPostalAddress.sub_building = "Flat 5";
		expectedStructuralPostalAddress.building = "";
		expectedStructuralPostalAddress.building_number = "";
		expectedStructuralPostalAddress.address_line1 = "Flat 5";
		expectedStructuralPostalAddress.address_line2 = "Wallaby Way";

		expect(addressDetails).toStrictEqual(expectedStructuralPostalAddress);
	});

	it("should map the address correctly when building_number and sub_building is absent", () => {
		// set buildingNumber and samBuildingName to an empty string
		personDetails.addresses[0].subBuildingName = "";
		personDetails.addresses[0].buildingName = "Sherman";
		personDetails.addresses[0].buildingNumber = "";
		const addressDetails = personIdentityUtils.getYotiStructuredPostalAddress(personDetails.addresses[0], logger);

		expectedStructuralPostalAddress.sub_building = "";
		expectedStructuralPostalAddress.building = "Sherman";
		expectedStructuralPostalAddress.building_number = "";
		expectedStructuralPostalAddress.address_line1 = "Sherman";
		expectedStructuralPostalAddress.address_line2 = "Wallaby Way";

		expect(addressDetails).toStrictEqual(expectedStructuralPostalAddress);
	});

	it("should throw an error if all mandatory postalAddress fields either missing/empty", () => {
		// set subBuildingName and buildingName to an empty string
		delete personDetails.addresses[0].subBuildingName;
		personDetails.addresses[0].buildingName = "   ";
		personDetails.addresses[0].buildingNumber = "   ";
		personDetails.addresses[0].streetName = "";

		expect(()=>{personIdentityUtils.getYotiStructuredPostalAddress(personDetails.addresses[0], logger);}).toThrow(new AppError(HttpCodesEnum.BAD_REQUEST, "Missing all mandatory postalAddress fields, unable to create the session"));
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(logger.error).toHaveBeenCalledWith({ "message": "Missing all or some of mandatory postalAddress fields (subBuildingName, buildingName, buildingNumber and streetName), unable to create the session" }, { "messageCode": "MISSING_ALL_MANDATORY_POSTAL_ADDRESS_FIELDS" });
	});

	it("should throw an error if all mandatory postalAddress except streetName fields either missing/empty", () => {
		// set subBuildingName and buildingName to an empty string
		delete personDetails.addresses[0].subBuildingName;
		personDetails.addresses[0].buildingName = "   ";
		personDetails.addresses[0].buildingNumber = "   ";
		personDetails.addresses[0].streetName = "Funny Street";

		expect(()=>{personIdentityUtils.getYotiStructuredPostalAddress(personDetails.addresses[0], logger);}).toThrow(new AppError(HttpCodesEnum.BAD_REQUEST, "Missing all mandatory postalAddress fields, unable to create the session"));
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(logger.error).toHaveBeenCalledWith({ "message": "Missing all or some of mandatory postalAddress fields (subBuildingName, buildingName, buildingNumber and streetName), unable to create the session" }, { "messageCode": "MISSING_ALL_MANDATORY_POSTAL_ADDRESS_FIELDS" });
	});
});
