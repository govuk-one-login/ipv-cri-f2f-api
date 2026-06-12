 
 
import fs from "fs";

import { Logger } from "@aws-lambda-powertools/logger";
import { mock } from "vitest-mock-extended";

import { PersonIdentityAddress } from "../../../models/PersonIdentityItem";
import { person, personAddressAllAddressFields } from "../data/postalAddress-events";
import { F2fService } from "../../../services/F2fService";
import { PDFGenerationService } from "../../../services/pdfGenerationService";
import { Metrics } from "@aws-lambda-powertools/metrics";

let pdfGenerationService: PDFGenerationService;
const mockF2fService = mock<F2fService>();

const logger = mock<Logger>();
const metrics = mock<Metrics>();

const sessionId = "sessionId";

describe("PdfGenerationServiceTest", () => {
	beforeAll(() => {
		pdfGenerationService = PDFGenerationService.getInstance(logger, metrics);
		// @ts-expect-error linting to be updated
		pdfGenerationService.f2fService = mockF2fService;
	});

	describe("#generatePdf", () => {
		
		it("returns a generated pdf file", async () => {
			mockF2fService.getPersonIdentityById.mockResolvedValueOnce(person);

			const response = await pdfGenerationService.generatePDF(sessionId);
			
			expect(response).not.toBeNull();
		});

		it("creates a pdf file for review", async () => {
			mockF2fService.getPersonIdentityById.mockResolvedValueOnce(person);

			let response: Buffer | undefined = await pdfGenerationService.generatePDF(sessionId);
			
			expect(response).toBeDefined();

			response = response === undefined ? Buffer.alloc(0) : response;

			fs.writeFile("./letter.pdf", response, function (err):void {
				if (err) {
					return console.error(err);
				}
				expect(fs.existsSync("./letter.pdf")).toBe(true);
			});
		});
	});

	describe("#mapToAddressLines", () => {
		it("should omit missing fields from mapped address", () => {
			const partialPostalAddress : PersonIdentityAddress = person.addresses[0];
			const result = pdfGenerationService.mapToAddressLines(partialPostalAddress);
			expect(result).toEqual([
				"Test org",
				"Sherman",
				"32 Wallaby Way",
				"Sidney",
				"F1 1SH",
			]);
		});
		
		it("should map all fields correctly when present", () => {

			const result = pdfGenerationService.mapToAddressLines(personAddressAllAddressFields);
			expect(result).toEqual([
				"Test dept, Test org",
				"Flat 5, Sherman",
				"32 Ocean View, Wallaby Way",
				"Southside, Sidney",
				"F1 1SH",
			]);
		});

		it("should map sub-building name correctly when building name is not present", () => {
			const postalAddressWithoutBuildingName: PersonIdentityAddress = {
				...person.addresses[0],
				subBuildingName: "Flat 5",
				buildingName: "",
			};

			const result = pdfGenerationService.mapToAddressLines(postalAddressWithoutBuildingName);

			expect(result).toEqual([
				"Test org",
				"Flat 5",
				"32 Wallaby Way",
				"Sidney",
				"F1 1SH",
			]);
		});

		it.each<[string, PersonIdentityAddress, string[]]>([
			[
				"should map a flat address without a building name",
				{
					...person.addresses[0],
					organisationName: "",
					subBuildingName: "Flat 2B",
					buildingName: "",
					buildingNumber: "221B",
					streetName: "Baker Street",
					addressLocality: "London",
					postalCode: "NW1 6XE",
				},
				[
					"Flat 2B",
					"221B Baker Street",
					"London",
					"NW1 6XE",
				],
			],
			[
				"should map a business unit with department and organisation names",
				{
					...person.addresses[0],
					departmentName: "Accounts Payable",
					organisationName: "Example Trading Ltd",
					subBuildingName: "Unit 12",
					buildingName: "Alpha House",
					buildingNumber: "",
					dependentStreetName: "Service Yard",
					streetName: "Industrial Estate",
					dependentAddressLocality: "North Quarter",
					addressLocality: "Manchester",
					postalCode: "M1 1AA",
				},
				[
					"Accounts Payable, Example Trading Ltd",
					"Unit 12, Alpha House",
					"Service Yard, Industrial Estate",
					"North Quarter, Manchester",
					"M1 1AA",
				],
			],
			[
				"should map an apartment in a named building",
				{
					...person.addresses[0],
					organisationName: "",
					subBuildingName: "Studio 3",
					buildingName: "The Old Mill",
					buildingNumber: "",
					dependentStreetName: "Mill Lane",
					streetName: "River Road",
					addressLocality: "Bristol",
					postalCode: "BS1 4ST",
				},
				[
					"Studio 3, The Old Mill",
					"Mill Lane, River Road",
					"Bristol",
					"BS1 4ST",
				],
			],
			[
				"should map a department address without an organisation name",
				{
					...person.addresses[0],
					departmentName: "Post Room",
					organisationName: "",
					subBuildingName: "Suite 9",
					buildingName: "",
					buildingNumber: "10",
					streetName: "Market Street",
					addressLocality: "Leeds",
					postalCode: "LS1 1UR",
				},
				[
					"Post Room",
					"Suite 9",
					"10 Market Street",
					"Leeds",
					"LS1 1UR",
				],
			],
		])("%s", (_testName, postalAddress, expectedAddressLines) => {
			const result = pdfGenerationService.mapToAddressLines(postalAddress);

			expect(result).toEqual(expectedAddressLines);
		});

		it("should print the maximum of five mapped address lines", () => {
			const result = pdfGenerationService.mapToAddressLines(personAddressAllAddressFields);

			expect(result).toHaveLength(5);
			expect(result).toEqual([
				"Test dept, Test org",
				"Flat 5, Sherman",
				"32 Ocean View, Wallaby Way",
				"Southside, Sidney",
				"F1 1SH",
			]);
		});

		it("should print the minimum mapped address lines when optional address fields are missing", () => {
			const minimumPostalAddress: PersonIdentityAddress = {
				...person.addresses[0],
				organisationName: "",
				buildingName: "",
			};

			const result = pdfGenerationService.mapToAddressLines(minimumPostalAddress);

			expect(result).toHaveLength(3);
			expect(result).toEqual([
				"32 Wallaby Way",
				"Sidney",
				"F1 1SH",
			]);
		});
	});
});
