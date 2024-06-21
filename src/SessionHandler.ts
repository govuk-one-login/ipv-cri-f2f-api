import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { Response } from "./utils/Response";
import { LambdaInterface } from "@aws-lambda-powertools/commons";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { HttpCodesEnum } from "./utils/HttpCodesEnum";

const execPromise = promisify(exec);

const {
	POWERTOOLS_METRICS_NAMESPACE = "F2F-CRI",
	POWERTOOLS_LOG_LEVEL = "DEBUG",
	POWERTOOLS_SERVICE_NAME = "PdfMergeService",
} = process.env;

const logger = new Logger({ logLevel: POWERTOOLS_LOG_LEVEL, serviceName: POWERTOOLS_SERVICE_NAME });
const metrics = new Metrics({ namespace: POWERTOOLS_METRICS_NAMESPACE, serviceName: POWERTOOLS_SERVICE_NAME });

class Session implements LambdaInterface {
	@metrics.logMetrics({ throwOnEmptyMetrics: false, captureColdStartMetric: true })
	async handler(event: any, context: any): Promise<Response> {
		logger.setPersistentLogAttributes({});
		logger.addContext(context);

		try {
			const html1Content = "<html><body><h1>PDF 1</h1></body></html>";
			const html2Content = "<html><body><h1>PDF 2</h1></body></html>";

			const html1Path = "/tmp/template1.html";
			const html2Path = "/tmp/template2.html";
			const pdf1Path = "/tmp/output1.pdf";
			const pdf2Path = "/tmp/output2.pdf";
			const outputPath = "/tmp/merged.pdf";

			await this.saveHtml(html1Path, html1Content);
			await this.saveHtml(html2Path, html2Content);

			await execPromise(`python3 ${path.join(__dirname, "scripts", "generate_pdf.py")} "${html1Path}" "${pdf1Path}"`);
			await execPromise(`python3 ${path.join(__dirname, "scripts", "generate_pdf.py")} "${html2Path}" "${pdf2Path}"`);

			const command = `python3 ${path.join(__dirname, "scripts", "merge_pdfs.py")} "${pdf1Path}" "${pdf2Path}" "${outputPath}"`;
			const { stdout, stderr } = await execPromise(command);

			if (stderr) {
				throw new Error(`Error: ${stderr}`);
			}

			logger.info(`Output: ${stdout}`);
			logger.info("PDFs merged successfully!");

			const mergedPdfBase64 = await this.readPdfAsBase64(outputPath);

			return { statusCode: HttpCodesEnum.OK, body: mergedPdfBase64 };
		} catch (error) {
			logger.error("Error merging PDFs", { error });
			return { statusCode: HttpCodesEnum.SERVER_ERROR, body: "Error merging PDFs" };
		}
	}

	private async saveHtml(filePath: string, htmlContent: string): Promise<void> {
		const fs = require("fs").promises;
		await fs.writeFile(filePath, htmlContent);
	}

	private async readPdfAsBase64(filePath: string): Promise<string> {
		const buffer = await fs.promises.readFile(filePath);
		return buffer.toString("base64");
	}
}

const lambdaHandler = new Session().handler.bind(new Session());
export { lambdaHandler };
