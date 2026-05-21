import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { getDocument, PDFPageProxy } from "pdfjs-dist/legacy/build/pdf.js";
import { createCanvas, Canvas } from "canvas";
import { compareImages } from "vitest-image-snapshot";

const SNAPSHOT_DIR = path.join(
	process.cwd(),
	"tests",
	"visual",
	"__snapshots__",
);
const DIFF_DIR = path.join(
	process.cwd(),
	"tests",
	"visual",
	"__snapshots-diff__",
);
const SNAPSHOT_NAME_PREFIX =
	"happy-path-test-ts-document-selection-endpoint-successful-request-tests-email-posted-letter-with-original-address-with-snapshot-validation";

export const PDF_VISUAL_SNAPSHOT_ALLOWED_PIXEL_RATIO = 0.03;

export async function comparePdfToVisualSnapshots(
	pdfBuffer: Buffer,
): Promise<void> {
	const pdfImagesLocation = fs.mkdtempSync(path.join(os.tmpdir(), "f2f-pdf-"));

	try {
		await convertPdfToImages(pdfBuffer, pdfImagesLocation);

		const files = fs
			.readdirSync(pdfImagesLocation)
			.filter((fileName) => fileName.endsWith(".png"))
			.sort(comparePageImageNames);

		if (files.length === 0) {
			throw new Error(
				`No PNG images were generated from the PDF in ${pdfImagesLocation}`,
			);
		}

		for (const fileName of files) {
			const imagePath = path.join(pdfImagesLocation, fileName);
			const pageNumber = getPageNumber(fileName);
			const snapshotPath = getSnapshotPath(pageNumber);

			if (!fs.existsSync(snapshotPath)) {
				if (shouldUpdateVisualSnapshots()) {
					logSnapshotUpdate(snapshotPath);
					writeSnapshot(snapshotPath, imagePath);
					continue;
				}
				throw new Error(
					`Missing PDF visual snapshot for ${fileName}: expected ${snapshotPath}`,
				);
			}

			const image = fs.readFileSync(imagePath);
			const snapshot = fs.readFileSync(snapshotPath);
			const comparison = await compareImages(snapshot, image, {
				allowedPixelRatio: PDF_VISUAL_SNAPSHOT_ALLOWED_PIXEL_RATIO,
				includeAA: false,
			});

			if (!comparison.pass) {
				if (shouldUpdateVisualSnapshots()) {
					logSnapshotUpdate(snapshotPath);
					writeSnapshot(snapshotPath, imagePath);
					continue;
				}
				const diffPath = writeDiffImage(pageNumber, comparison.diffBuffer);
				const diffMessage = diffPath ? ` Diff written to ${diffPath}.` : "";
				// Include the configured tolerance alongside the library mismatch output so failures show the accepted margin of error.
				throw new Error(
					`${fileName}: ${comparison.message}. Allowed pixel ratio: ${PDF_VISUAL_SNAPSHOT_ALLOWED_PIXEL_RATIO}.${diffMessage}`,
				);
			}
		}
	} finally {
		fs.rmSync(pdfImagesLocation, { recursive: true, force: true });
	}
}

/**
 * Converts a PDF to images by rendering each page and saving them to a local directory.
 *
 * @param {Buffer} pdfBuffer - The PDF file as a buffer.
 * @param {string} outputDir - The directory where images will be saved.
 * @returns {Promise<void>} Resolves when all images are saved.
 */
export async function convertPdfToImages(
	pdfBuffer: Buffer,
	outputDir: string,
): Promise<void> {
	try {
		// Ensure the output directory exists
		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
		}

		// Load the original PDF using pdf.js
		const standardFontDataUrl =
			path.join(process.cwd(), "node_modules", "pdfjs-dist", "standard_fonts") +
			path.sep;
		const loadingTask = getDocument({ data: pdfBuffer, standardFontDataUrl });
		const pdfDocument = await loadingTask.promise;

		// Loop through each page of the PDF
		for (let i = 1; i <= pdfDocument.numPages; i++) {
			const page = await pdfDocument.getPage(i);

			// Render the page as an image and save it
			const imageBuffer = await renderPageToImage(page);

			// Save the image to the output directory
			const imagePath = path.join(outputDir, `page_${i}.png`);
			fs.writeFileSync(imagePath, imageBuffer);
		}
	} catch (error) {
		console.error("Error converting PDF to images:", error);
		throw error;
	}
}

/**
 * Renders a single PDF page to an image buffer.
 *
 * @param {pdfjs.PDFPageProxy} page - The PDF.js page object.
 * @returns {Promise<Buffer>} The image as a PNG buffer.
 */
async function renderPageToImage(page: PDFPageProxy): Promise<Buffer> {
	// Scale the page to 2x for a higher quality image output
	const viewport = page.getViewport({ scale: 2.0 });
	const canvas: Canvas = createCanvas(viewport.width, viewport.height);
	const context = canvas.getContext("2d");
	(context as any).canvas = canvas;
	const castContext = context as any as CanvasRenderingContext2D;
	// Render the PDF page to the canvas
	await page.render({ canvasContext: castContext, viewport }).promise;

	// Convert the canvas content to a PNG image buffer and return it
	return canvas.toBuffer("image/png");
}

function comparePageImageNames(left: string, right: string): number {
	return getPageNumber(left) - getPageNumber(right);
}

function getPageNumber(fileName: string): number {
	const match = /^page_(\d+)\.png$/.exec(fileName);

	if (!match) {
		throw new Error(`Unexpected PDF page image name: ${fileName}`);
	}

	return Number(match[1]);
}

function getSnapshotPath(pageNumber: number): string {
	return path.join(
		SNAPSHOT_DIR,
		`${SNAPSHOT_NAME_PREFIX}-${pageNumber}-snap.png`,
	);
}

function writeSnapshot(snapshotPath: string, imagePath: string): void {
	fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
	fs.copyFileSync(imagePath, snapshotPath);
}

function shouldUpdateVisualSnapshots(): boolean {
	return process.env.UPDATE_PDF_VISUAL_SNAPSHOTS === "true";
}

function logSnapshotUpdate(snapshotPath: string): void {
	// This log makes deliberate snapshot rewrites visible; set UPDATE_PDF_VISUAL_SNAPSHOTS=true in src/.env to opt in.
	console.info(`Updating PDF visual snapshot: ${snapshotPath}`);
}

function writeDiffImage(
	pageNumber: number,
	diffBuffer?: Buffer,
): string | undefined {
	if (!diffBuffer) {
		return undefined;
	}

	fs.mkdirSync(DIFF_DIR, { recursive: true });
	const diffPath = path.join(
		DIFF_DIR,
		`${SNAPSHOT_NAME_PREFIX}-${pageNumber}-diff.png`,
	);
	fs.writeFileSync(diffPath, diffBuffer);
	return diffPath;
}
