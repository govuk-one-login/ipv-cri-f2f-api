 
 
import fs from "fs";

import { Logger } from "@aws-lambda-powertools/logger";
import { mock } from "jest-mock-extended";

import { PersonIdentityAddress } from "../../../models/PersonIdentityItem";
import { person, personAddressSubBuildingName, personAddressDependentAddressLocality, personAddressDependentStreetName } from "../data/postalAddress-events";
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
		
		it("should map all fields correctly when present", () => {
			const postalAddress: PersonIdentityAddress = person.addresses[0];
			const result = pdfGenerationService.mapToAddressLines(postalAddress);
			expect(result).toEqual([
				"Test dept",
				"Test org",
				"Sherman",
				"32 Wallaby Way",
				"Sidney",
				"F1 1SH",
			]);
		});

		it("should populate subBuildingName & buildingName on the same line", () => {
			const { ...postalAddress }: PersonIdentityAddress = personAddressSubBuildingName.addresses[0];
			const result = pdfGenerationService.mapToAddressLines(postalAddress);
			expect(result).toEqual([
				"Test dept",
				"Test org",
				"Flat 5, Sherman",
				"32 Wallaby Way",
				"Sidney",
				"F1 1SH",
			]);
		});

		it("should populate dependentAddressLocality & addressLocality on the same line", () => {
			const { ...postalAddress }: PersonIdentityAddress = personAddressDependentAddressLocality.addresses[0];
			const result = pdfGenerationService.mapToAddressLines(postalAddress);
			expect(result).toEqual([
				"Test dept",
				"Test org",
				"Sherman",
				"32 Wallaby Way",
				"Southside, Sidney",
				"F1 1SH",
			]);
		});

		it("should populate dependentStreetName & streetName on the same line", () => {
			const { ...postalAddress }: PersonIdentityAddress = personAddressDependentStreetName.addresses[0];
			const result = pdfGenerationService.mapToAddressLines(postalAddress);
			expect(result).toEqual([
				"Test dept",
				"Test org",
				"Sherman",
				"32 Ocean View, Wallaby Way",
				"Sidney",
				"F1 1SH",
			]);
		});
	});
});
