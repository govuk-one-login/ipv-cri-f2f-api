import * as fs from "fs";
import * as path from "path";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.js";
import { createCanvas, Canvas } from "canvas";

/**
 * Converts a PDF to images by rendering each page and saving them to a local directory.
 *
 * @param {Buffer} pdfBuffer - The PDF file as a buffer.
 * @param {string} outputDir - The directory where images will be saved.
 * @returns {Promise<void>} Resolves when all images are saved.
 */
export async function convertPdfToImages(pdfBuffer: Buffer, outputDir: string): Promise<void> {
	try {
		// Ensure the output directory exists
		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
		}

		// Load the original PDF using pdf.js
		const loadingTask = pdfjs.getDocument({ data: pdfBuffer });
		const pdfDocument = await loadingTask.promise;

		// Loop through each page of the PDF
		for (let i = 1; i <= pdfDocument.numPages; i++) {
			const page = await pdfDocument.getPage(i);

			// Render the page as an image and save it
			const imageBuffer = await renderPageToImage(page);

			// Save the image to the output directory
			const imagePath = path.join(outputDir, `page_${i}.png`);
			fs.writeFileSync(imagePath, imageBuffer);
			console.log(`Saved: ${imagePath}`);
		}
	} catch (error) {
		console.error("Error converting PDF to images:", error);
	}
}

/**
 * Renders a single PDF page to an image buffer.
 *
 * @param {pdfjs.PDFPageProxy} page - The PDF.js page object.
 * @returns {Promise<Buffer>} The image as a buffer (JPEG format).
 */
async function renderPageToImage(page: pdfjs.PDFPageProxy): Promise<Buffer> {
	// Scale the page to 2x for a higher quality image output
	const viewport = page.getViewport({ scale: 2.0 });
	const canvas: Canvas = createCanvas(viewport.width, viewport.height);
	const context = canvas.getContext("2d");

	// Render the PDF page to the canvas
	await page.render({ canvasContext: context, viewport }).promise;

	// Convert the canvas content to a JPEG image buffer and return it
	return canvas.toBuffer("image/png");
}
