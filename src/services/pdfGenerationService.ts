 
import PDFDocument from "pdfkit";

import { EnvironmentVariables } from "./EnvironmentVariables";
import { Logger } from "@aws-lambda-powertools/logger";
import { createDynamoDbClient } from "../utils/DynamoDBFactory";
import { ServicesEnum } from "../models/enums/ServicesEnum";

import { F2fService } from "./F2fService";

import gdsLightFont from "../static/light-94a07e06a1-v2.ttf";
import gdsBoldFont from "../static/bold-b542beb274-v2.ttf";
import govUkLogo from "../static/GOVUKOneLogin.png";

import { PersonIdentityAddress } from "../models/PersonIdentityItem";
import { personIdentityUtils } from "../utils/PersonIdentityUtils";
import { Metrics } from "@aws-lambda-powertools/metrics";

export class PDFGenerationService {

  private static instance: PDFGenerationService;

  private readonly f2fService: F2fService;

  private readonly environmentVariables: EnvironmentVariables;

  private readonly logger: Logger;

  private readonly metrics: Metrics;

  private constructor(logger: Logger, metrics: Metrics) {
  	this.logger = logger;
	this.metrics = metrics;
  	this.environmentVariables = new EnvironmentVariables(logger, ServicesEnum.GENERATE_PRINTED_LETTER_SERVICE);
  	this.f2fService = F2fService.getInstance(this.environmentVariables.sessionTable(), this.logger, this.metrics, createDynamoDbClient());
  }

mmToPt = (mm: number) => mm * 2.83465;

static getInstance(
	logger: Logger,
	metrics: Metrics
): PDFGenerationService {
	if (!PDFGenerationService.instance) {
		PDFGenerationService.instance = new PDFGenerationService(
			logger, metrics
		);
	}
	return PDFGenerationService.instance;
}

async generatePDF(
	sessionId: string,
): Promise<Buffer | undefined> { 

	return new Promise<Buffer>(async (resolve) => {

		const person = await this.f2fService.getPersonIdentityById(sessionId, this.environmentVariables.personIdentityTableName());
		if (!person) {
			throw new Error("Failed to find person details for user " + sessionId);
		}

		const postalAddresses:PersonIdentityAddress[] = person?.addresses.filter((el) => el.preferredAddress);
		if (!postalAddresses[0]) {
			throw new Error("Failed to find a preferred address required for postage");
		}

		const doc = new PDFDocument({
			bufferPages: true,
			size: "A4",
			margins: {
				top: this.mmToPt(15),    
				bottom: this.mmToPt(15), 
				left: this.mmToPt(15),
				right: this.mmToPt(50),
			},
			font: gdsLightFont,
		});
		doc.registerFont("GDS bold", gdsBoldFont);
		doc.registerFont("GDS light", gdsLightFont);

		const buffers: any = [];
		doc.on("data", buffers.push.bind(buffers));
		doc.on("end", () => {
			const pdfData = Buffer.concat(buffers);		
			return resolve(pdfData);
		}); 
            
		const postalAddress = postalAddresses[0];
		const address = this.mapToAddressLines(postalAddress);

		doc.image(govUkLogo, this.mmToPt(15), this.mmToPt(15), { fit: [300, 70.5] });

		let addressLinesYPos = this.mmToPt(40);
		const lineHeight = 12;
            
		const nameParts = personIdentityUtils.getNames(person);
		const user = nameParts.givenNames[0] + " " + nameParts.familyNames[0];

		doc
			.font("GDS light")
			.fontSize(10)
			.text(user.toUpperCase(), this.mmToPt(24.6), addressLinesYPos);

		addressLinesYPos += lineHeight;
		address.forEach((line) => {
			doc
				.font("GDS light")
				.fontSize(10)
				.text(line.toUpperCase(), this.mmToPt(24.6), addressLinesYPos);
			addressLinesYPos += lineHeight;
		});

		const today = new Date();
		const expiryDate = new Date();
		expiryDate.setDate(today.getDate() + this.environmentVariables.clientSessionTokenTtlInDays());

		const todayString = this.getLongDate(today, "en-GB");
		let expiryString = this.getLongDate(expiryDate, "en-GB");
		doc					
			.font("GDS light")
			.fontSize(14)
			.text(todayString, this.mmToPt(15), this.mmToPt(110));

		this.populateEnglishPages(doc, user, expiryString);

		doc.addPage();

		expiryString = this.getLongDate(expiryDate, "cy-GB");
		this.populateWelshPages(doc, user, expiryString);

		const pages = doc.bufferedPageRange();
                
		for (let i = 0; i < pages.count; i++) {
			doc.switchToPage(i);

			//Footer: Add page number
			const oldBottomMargin = doc.page.margins.bottom;
			doc.page.margins.bottom = 0; 
			doc
				.fontSize(10)
				.text(
					`Page ${i + 1} of ${pages.count}`,
					doc.page.width - this.mmToPt(40),
					doc.page.height - (oldBottomMargin / 2) - 5,
					{ align: "right" });
			doc.page.margins.bottom = oldBottomMargin;
		}

		doc.end();
	});   
}

private populateEnglishPages(doc: PDFKit.PDFDocument, user: string, expiryString: string):void {
	const title = "Go to a Post Office by " + expiryString + " to finish proving your identity with GOV.UK One Login";

	doc.fontSize(22).font("GDS bold")
		.text(title, this.mmToPt(15), this.mmToPt(116));

	doc
		.font("GDS light")
		.moveDown(0.3)
		.fontSize(14)
		.text(
			"Dear " + user + "\n\nTo finish proving your identity with GOV.UK One Login, you need to go to a Post Office that offers in-branch verification by " + expiryString + ".\n\nYour Post Office customer letter was sent in the same envelope as this cover letter.",
		);

	this.boldTextOnNewline(doc, "What you need to take to a Post Office");

	this.lightTextOnNewline(doc, "When you go to a Post Office, you must take:");

	this.addBullets(doc, ["your Post Office customer letter", "the photo ID shown on your customer letter"]);

	this.boldTextOnNewline(doc, "At the Post Office");

	this.lightTextOnNewline(doc, "A member of Post Office staff will:");

	this.addBullets(doc, ["check your customer letter", "scan your photo ID", "take a photo of you"]);

	this.lightTextOnNewline(doc, "If you do not go to a Post Office by " + expiryString + ", you’ll need to start proving your identity again.");

	this.boldTextOnNewline(doc, "After you’ve been to the Post Office");

	this.lightTextOnNewline(doc, "The result of your identity check will usually be available within 24 hours of going to the Post Office. \n\nWhen it’s ready, you’ll get an email from GOV.UK One Login. You can view your result by signing in.");

	this.boldTextOnNewline(doc, "Which Post Office to go to");
 
	this.lightTextOnNewline(doc, "Your customer letter shows which Post Office you chose to go to. \n\nYou can go to a different Post Office as long as it offers in-branch verification: ");

	doc
		.font("GDS bold")
		.fontSize(14)
		.text("www.postoffice.co.uk/identity/in-branch-verification-service");


	this.lightTextOnNewline(doc, "You do not need to contact the GOV.UK One Login team if you want to go to a different Post Office.");

	this.boldTextOnNewline(doc, "If you need help");

	this.lightTextOnNewline(doc, "If you did not ask to be sent this letter, or if you need help, contact the GOV.UK One Login team:");

	doc
		.fontSize(14)
		.font("GDS bold")
		.text("home.account.gov.uk/contact-gov-uk-one-login ");

	this.lightTextOnNewline(doc, "Regards \n\nGOV.UK One Login team");
  
}

private populateWelshPages(doc: PDFKit.PDFDocument, user: string, expiryString: string):void {
	const title = "Ewch i Swyddfa’r Post erbyn " + expiryString + " i orffen profi eich hunaniaeth gyda GOV.UK One Login";

	doc.fontSize(22).font("GDS bold").text(title, 42.5, 25);

	doc
		.font("GDS light")
		.moveDown(0.3)
		.fontSize(14)
		.text(
			"Annwyl " + user + "\n\nI orffen profi eich hunaniaeth gyda GOV.UK One Login, mae angen i chi fynd i Swyddfa’r Post sy’n cynnig dilysu mewn canghennau erbyn " + expiryString + ".\n\nAnfonwyd llythyr cwsmer Swyddfa’r Post yn yr un amlen â’r llythyr eglurhaol hwn.",
		);
    
	this.boldTextOnNewline(doc, "Beth sydd angen mynd gyda chi i Swyddfa’r Post");

	this.lightTextOnNewline(doc, "Pan fyddwch yn mynd i Swyddfa’r Post, mae’n rhaid i chi fynd â’r canlynol:");
    
	this.addBullets(doc, ["llythyr cwsmer Swyddfa’r Post", "yr ID gyda llun a ddangosir ar eich llythyr cwsmer"]);

	this.boldTextOnNewline(doc, "Yn Swyddfa’r Pos");

	this.lightTextOnNewline(doc, "Bydd aelod o staff Swyddfa’r Post yn:");

	this.addBullets(doc, ["gwirio eich llythyr cwsmer", "sganio eich ID gyda llun", "tynnu llun ohonoch chi"]);

	this.lightTextOnNewline(doc, "Os na fyddwch yn mynd i Swyddfa’r Post erbyn " + expiryString + ", bydd angen i chi ddechrau profi eich hunaniaeth eto.");
	
	this.boldTextOnNewline(doc, "Ar ôl i chi fod yn Swyddfa’r Post");

	this.lightTextOnNewline(doc, "Bydd canlyniad eich gwiriad hunaniaeth fel arfer ar gael o fewn 24 awr o fynd i'r Swyddfa Bost. \n\nPan fydd yn barod, byddwch yn cael e-bost gan GOV.UK One Login. Gallwch weld eich canlyniad trwy fewngofnodi.");

	this.boldTextOnNewline(doc, "Pa Swyddfa’r Post i fynd iddi");

	this.lightTextOnNewline(doc, "Mae eich llythyr cwsmer yn dangos pa Swyddfa’r Post y gwnaethoch ddewis mynd iddi. \n\nGallwch fynd i Swyddfa’r Post gwahanol cyn belled â’i bod yn cynnig gwiriad mewn cangen: ");

	doc
		.font("GDS bold")
		.fontSize(14)
		.text("www.postoffice.co.uk/identity/in-branch-verification-service");

	this.lightTextOnNewline(doc, "Nid oes angen i chi gysylltu â thîm GOV.UK One Login os ydych am fynd i Swyddfa’r Post gwahanol.");

	this.lightTextOnNewline(doc, "Os ydych angen help");

	this.lightTextOnNewline(doc, "Os nad ydych wedi gofyn am dderbyn y llythyr hwn, neu os ydych angen help, cysylltwch â thîm GOV.UK One Login: ");

	doc
		.fontSize(14)
		.font("GDS bold")
		.text("home.account.gov.uk/contact-gov-uk-one-login");

	this.lightTextOnNewline(doc, "Cofion \n\nTîm GOV.UK One Login");
}

private addBullets(doc: PDFKit.PDFDocument, bullets: string[]): void {
	doc
		.moveDown(0.8)
		.font("GDS light")
		.list(bullets, {
			align: "left",
			listType: "bullet",
			bulletRadius: 2.00,
		});
}

private lightTextOnNewline(doc: PDFKit.PDFDocument, text: string): void {
	doc
		.font("GDS light")
		.moveDown(0.8)
		.fontSize(14)
		.text(text);
}

private boldTextOnNewline(doc: PDFKit.PDFDocument, text: string): void {
	doc
		.moveDown(0.8)
		.fontSize(14)
		.font("GDS bold")
		.text(text);
}

private getLongDate(today: Date, locale: string):string {
	return today.toLocaleDateString(locale, {
		day: "numeric",
		month: "long",
		year: "numeric",
	});
}

mapToAddressLines(postalAddress: PersonIdentityAddress): string[] {
	const address = [];
	if (postalAddress.departmentName) {
		address.push(postalAddress.departmentName);
	}
	if (postalAddress.organisationName) {
		address.push(postalAddress.organisationName);
	}
	if (postalAddress.subBuildingName) {
		address.push(postalAddress.subBuildingName);
	}
	if (postalAddress.buildingName) {
		address.push(postalAddress.buildingName);
	}
	if (postalAddress.dependentStreetName) {
		address.push(postalAddress.dependentStreetName);
	}
	if (postalAddress.streetName) {
		const buildingNumber = postalAddress.buildingNumber ? `${postalAddress.buildingNumber} ` : "";
		address.push(buildingNumber + postalAddress.streetName);
	}
	if (postalAddress.dependentAddressLocality) {
		address.push(postalAddress.dependentAddressLocality);
	}
	if (postalAddress.addressLocality) {
		address.push(postalAddress.addressLocality);
	}
	if (postalAddress.postalCode) {
		address.push(postalAddress.postalCode);
	}
	return address;
}
}
