import { ValidationHelper } from "../../../utils/ValidationHelper";
import { CicSession } from "../../../models/CicSession";
import { Logger } from "@aws-lambda-powertools/logger";

const logger = new Logger({
	logLevel: "ERROR",
	serviceName: "CIC",
});

describe("CicSession", () => {
	it("should validate CicSession model", async () => {
		const cicSession = new CicSession({
			full_name: "Frederick Joseph Flintstone",
			date_of_birth: "1970-01-01",
			document_selected: "driversPermit",
			date_of_expiry: "1970-01-01",
		});

		await expect(new ValidationHelper().validateModel(cicSession, logger)).resolves.not.toThrow();
	});

	it("should throw error if full_name is empty in CicSession model", async () => {
		const cicSession = new CicSession({
			full_name: "",
			date_of_birth: "1970-01-01",
			document_selected: "driversPermit",
			date_of_expiry: "1970-01-01",
		});

		await expect(new ValidationHelper().validateModel(cicSession, logger)).rejects.toThrow();
	});

	it("should throw error if date_of_birth is empty in CicSession model", async () => {
		const cicSession = new CicSession({
			full_name: "Frederick Joseph Flintstone",
			date_of_birth: "",
			document_selected: "driversPermit",
			date_of_expiry: "1970-01-01",
		});

		await expect(new ValidationHelper().validateModel(cicSession, logger)).rejects.toThrow();
	});

	it("should throw error if document_selected is empty in CicSession model", async () => {
		const cicSession = new CicSession({
			full_name: "Frederick Joseph Flintstone ",
			date_of_birth: "1970-01-01",
			document_selected: "",
			date_of_expiry: "1970-01-01",
		});

		await expect(new ValidationHelper().validateModel(cicSession, logger)).rejects.toThrow();
	});

	it("should throw error if date_of_expiry is empty in CicSession model", async () => {
		const cicSession = new CicSession({
			full_name: "Frederick Joseph Flintstone ",
			date_of_birth: "1970-01-01",
			document_selected: "driversPermit",
			date_of_expiry: "",
		});

		await expect(new ValidationHelper().validateModel(cicSession, logger)).rejects.toThrow();
	});

	it("should throw error if date_of_birth is invalid in CicSession model", async () => {
		const cicSession = new CicSession({
			full_name: "Frederick Joseph Flintstone ",
			date_of_birth: "date_of_birth",
			document_selected: "driversPermit",
			date_of_expiry: "1970-01-01",
		});

		await expect(new ValidationHelper().validateModel(cicSession, logger)).rejects.toThrow();
	});

	it("should throw error if date_of_expiry is invalid in CicSession model", async () => {
		const cicSession = new CicSession({
			full_name: "Frederick Joseph Flintstone ",
			date_of_birth: "1970-01-01",
			document_selected: "driversPermit",
			date_of_expiry: "date_of_expiry",
		});

		await expect(new ValidationHelper().validateModel(cicSession, logger)).rejects.toThrow();
	});
});
