import {EU_DL_COUNTRIES} from "../../../models/EuDrivingLicenceCodes";

describe("EuDrivingLicenceCodes", () => {
	
	beforeAll(() => {
		jest.clearAllMocks();
	});

	beforeEach(() => {
		jest.resetAllMocks();

	});

	it.each([
		["AUT", "AT"],
		["BEL", "BE"],
		["BGR", "BG"],
		["HRV", "HR"],
		["CYP", "CY"],
		["CZE", "CZ"],
		["DNK", "DK"],
		["EST", "EE"],
		["FIN", "FI"],
		["FRA", "FR"],
		["DEU", "DE"],
		["GRC", "GR"],
		["HUN", "HU"],
		["IRL", "IE"],
		["ITA", "IT"],
		["LVA", "LV"],
		["LTU", "LT"],
		["LUX", "LU"],
		["MLT", "MT"],
		["NLD", "NL"],
		["POL", "PL"],
		["PRT", "PT"],
		["ROU", "RO"],
		["SVK", "SK"],
		["SVN", "SI"],
		["ESP", "ES"],
		["SWE", "SE"]
	])("Should return 2 digit country code for a 3 digit country code", (alpha3Code, expectedAlpha2Code) => {
		const countryDetails = EU_DL_COUNTRIES.find(country => country.alpha3code === alpha3Code);
		expect(countryDetails?.alpha2code).toBe(expectedAlpha2Code);
	});

});
