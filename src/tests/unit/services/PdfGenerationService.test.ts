 
 
import fs from "fs";

import { Logger } from "@aws-lambda-powertools/logger";
import { mock } from "jest-mock-extended";

import { PersonIdentityAddress, PersonIdentityItem } from "../../../models/PersonIdentityItem";
import { F2fService } from "../../../services/F2fService";
import { PDFGenerationService } from "../../../services/pdfGenerationService";

let pdfGenerationService: PDFGenerationService;
const mockF2fService = mock<F2fService>();

const logger = mock<Logger>();
const sessionId = "sessionId";

const person: PersonIdentityItem = {
	"addresses": [
		{
			"addressCountry": "GB",
			"organisationName": "Test org",
			"departmentName": "Test dept",
			"buildingName": "Sherman",
			"subBuildingName": "Flat 5",
			"uprn": 123456789,
			"streetName": "Wallaby Way",
			"postalCode": "F1 1SH",
			"buildingNumber": "32",
			"addressLocality": "Sidney",
			"preferredAddress": true,
		},
	],
	"sessionId": "RandomF2FSessionID",
	"emailAddress": "viveak.vadivelkarasan@digital.cabinet-office.gov.uk",
	"birthDate": [
		{
			"value":"1960-02-02",
		},
	],
	"name": [
		{
			"nameParts": [
				{
					"type": "GivenName",
					"value": "Frederick",
				},
				{
					"type": "GivenName",
					"value": "Joseph",
				},
				{
					"type": "FamilyName",
					"value": "Flintstone",
				},
			],
		},
	],
	expiryDate: 1612345678,
	createdDate: 1612335678,
};

describe("PdfGenerationServiceTest", () => {
	beforeAll(() => {
		pdfGenerationService = PDFGenerationService.getInstance(logger);
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
		it("should map all fields correctly when present", () => {
			const postalAddress: PersonIdentityAddress = person.addresses[0];
			const result = pdfGenerationService.mapToAddressLines(postalAddress);
			expect(result).toEqual([
				"Test dept",
				"Test org",
				"Flat 5",
				"Sherman",
				"32 Wallaby Way",
				"Sidney",
				"F1 1SH",
			]);
		});
	});

	it("should omit missing fields from mapped address", () => {
		const { ...postalAddress }: PersonIdentityAddress = person.addresses[0];
		const result = pdfGenerationService.mapToAddressLines(postalAddress);
		expect(result).toEqual([
			"Test dept",
			"Test org",
			"Flat 5",
			"Sherman",
			"32 Wallaby Way",
			"Sidney",
			"F1 1SH",
		]);
	});
});
