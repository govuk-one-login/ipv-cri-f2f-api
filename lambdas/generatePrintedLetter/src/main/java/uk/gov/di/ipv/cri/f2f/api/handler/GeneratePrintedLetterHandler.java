package uk.gov.di.ipv.cri.address.api.handler;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.PdfWriter;
import org.xhtmlrenderer.pdf.ITextRenderer;
import software.amazon.lambda.powertools.logging.CorrelationIdPathConstants;
import software.amazon.lambda.powertools.logging.Logging;
import software.amazon.lambda.powertools.metrics.Metrics;
import software.amazon.lambda.powertools.tracing.Tracing;

import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.IOException;

public class GeneratePrintedLetterHandler
        implements RequestHandler<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent> {

    public GeneratePrintedLetterHandler() {}

    @Override
    @Logging(correlationIdPath = CorrelationIdPathConstants.API_GATEWAY_REST, clearState = true)
    @Metrics(captureColdStart = true)
    @Tracing
    public APIGatewayProxyResponseEvent handleRequest(
            APIGatewayProxyRequestEvent input, Context context) {
        String htmlFilePath = "pageOne.html";
        String outputFilePath = "coverLetter.pdf";
        String name = "John Doe";

        try {
            String htmlContent = readHtmlFile(htmlFilePath);
            htmlContent = htmlContent.replace("[addresseeName]", name);
            convertHtmlToPdf(htmlContent, outputFilePath);
            System.out.println("PDF file generated successfully.");
        } catch (Exception e) {
            System.err.println("Error: " + e.getMessage());
        }

        // If we don't have at least one address, do not save
        System.out.println("Success");
        APIGatewayProxyResponseEvent response = new APIGatewayProxyResponseEvent();
        response.setStatusCode(200);
        response.setBody("Hello from Lambda!");
        return response;
    }

    private static String readHtmlFile(String filePath) throws IOException {
        StringBuilder contentBuilder = new StringBuilder();
        try (FileReader reader = new FileReader(filePath)) {
            int character;
            while ((character = reader.read()) != -1) {
                contentBuilder.append((char) character);
            }
        }
        return contentBuilder.toString();
    }

    private static void convertHtmlToPdf(String htmlContent, String outputFilePath)
            throws Exception {
        try (FileOutputStream fileOutputStream = new FileOutputStream(outputFilePath)) {
            Document document = new Document();
            PdfWriter.getInstance(document, fileOutputStream);
            document.open();

            ITextRenderer renderer = new ITextRenderer();
            renderer.setDocumentFromString(htmlContent);
            renderer.layout();
            renderer.createPDF(fileOutputStream);

            document.close();
        }
    }
}
