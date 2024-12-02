const PDFDocument = require('pdfkit');
const fs = require('fs');

const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
// Specify page size and 1 inch margins
const doc = new PDFDocument({
    size: 'A4',
    margins: {
      top: 72, 
      bottom: 72, 
      left: 72,  
      right: 72  
    }
  });
doc.pipe(fs.createWriteStream('./letter.pdf')); 

// These variables will be populated dynamically
const addresseeName = 'Fred Flintstone';
const addressLines = [
        "123 Fake Street",
        "Room 101",
        "Southwark",
        "London",
        "Greater London",
        "UK",
        "SE99 4QA"
    ];
const code = "000_000_000000_000000_00000_00000_00000";

// Add images
doc.image('./UK-Cabinet-Office-logo.png', 100, 80, {
    fit: [150, 150]
});

doc.image('./qr.png', 70, 160, {
    fit: [20, 20]
});

// Add code + address
doc.fontSize(7).text(code, 120, 190); 

let addressLinesYPos = 200;
const lineHeight = 12;

addressLines.forEach(line => {
  doc.fontSize(10).text(line, 120, addressLinesYPos); 
  addressLinesYPos += lineHeight;
});

doc.fontSize(12).text(today, 100, 400);

const title = "Go to a Post Office to finish proving your identity with GOV.UK One Login"
doc.font('Helvetica-Bold').fontSize(24).text(title, 100, 430);

doc.addPage();
doc.text('This is on the second page.', 50, 50);

doc.end();