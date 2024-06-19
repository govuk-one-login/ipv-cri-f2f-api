import { ISessionItem } from "../models/ISessionItem";
import { Logger } from "@aws-lambda-powertools/logger";
import { AppError } from "../utils/AppError";
import { DynamoDBDocument, GetCommand, QueryCommandInput, UpdateCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { getAuthorizationCodeExpirationEpoch, absoluteTimeNow } from "../utils/DateTimeUtils";
import { Constants } from "../utils/Constants";
import { AuthSessionState } from "../models/enums/AuthSessionState";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { createSqsClient } from "../utils/SqsClient";
import { TxmaEvent } from "../utils/TxmaEvent";
import {
	PersonIdentityAddress,
	PersonIdentityDateOfBirth,
	PersonIdentityItem,
	PersonIdentityName,
	SharedClaimsPersonIdentity,
} from "../models/PersonIdentityItem";
import { GovNotifyEvent, ReminderEmailEvent } from "../utils/GovNotifyEvent";
import { EnvironmentVariables } from "./EnvironmentVariables";
import { ServicesEnum } from "../models/enums/ServicesEnum";
import { IPVCoreEvent } from "../utils/IPVCoreEvent";
import { MessageCodes } from "../models/enums/MessageCodes";
import { PdfPreferenceEnum } from "../utils/PdfPreferenceEnum";

export class F2fService {
	readonly tableName: string;

	private readonly dynamo: DynamoDBDocument;

	readonly logger: Logger;

	private readonly environmentVariables: EnvironmentVariables;

	private static instance: F2fService;

	constructor(tableName: any, logger: Logger, dynamoDbClient: DynamoDBDocument) {
		this.tableName = tableName;
		this.dynamo = dynamoDbClient;
		this.logger = logger;
		this.environmentVariables = new EnvironmentVariables(logger, ServicesEnum.NA);
	}

	static getInstance(tableName: string, logger: Logger, dynamoDbClient: DynamoDBDocument): F2fService {
		if (!F2fService.instance) {
			F2fService.instance = new F2fService(tableName, logger, dynamoDbClient);
		}
		return F2fService.instance;
	}

	async getSessionById(sessionId: string, tableName: string = this.tableName): Promise<ISessionItem | undefined> {
		this.logger.debug("Table name " + tableName);
		const getSessionCommand = new GetCommand({
			TableName: this.tableName,
			Key: {
				sessionId,
			},
		});

		let session;
		try {
			session = await this.dynamo.send(getSessionCommand);
		} catch (error) {
			this.logger.error({ message: "getSessionById - failed executing get from dynamodb:" }, {
				messageCode: MessageCodes.FAILED_FETCHING_SESSION,
				error });
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "Error retrieving Session");
		}

		if (session.Item) {
			if (session.Item.expiryDate < absoluteTimeNow()) {
				this.logger.error({ message: `Session with session id: ${sessionId} has expired` }, { messageCode: MessageCodes.EXPIRED_SESSION });
				throw new AppError(HttpCodesEnum.UNAUTHORIZED, `Session with session id: ${sessionId} has expired`);
			}
			return session.Item as ISessionItem;
		}
	}

	async getPersonIdentityById(sessionId: string, tableName: string = this.tableName): Promise<PersonIdentityItem | undefined> {
		this.logger.debug("Table name " + tableName);
		const getPersonIdentityCommand = new GetCommand({
			TableName: tableName,
			Key: {
				sessionId,
			},
		});

		let PersonInfo;
		try {
			PersonInfo = await this.dynamo.send(getPersonIdentityCommand);
		} catch (error: any) {
			this.logger.error({ message: "getSessionById - failed executing get from dynamodb" }, {
				messageCode: MessageCodes.FAILED_FETCHING_PERSON_IDENTITY,
				error });
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "Error retrieving Session");
		}

		if (PersonInfo.Item) {
			return PersonInfo.Item as PersonIdentityItem;
		}
	}

	async getSessionByYotiId(yotiSessionId: string, tableName: string = this.tableName): Promise<ISessionItem | undefined> {
		this.logger.debug("Table name " + tableName);
		const params: QueryCommandInput = {
			TableName: tableName,
			IndexName: Constants.YOTI_SESSION_ID_INDEX_NAME,
			KeyConditionExpression: "yotiSessionId = :yotiSessionId",
			ExpressionAttributeValues: {
				":yotiSessionId": yotiSessionId,
			},
		};

		const sessionItem = await this.dynamo.query(params);

		if (!sessionItem?.Items || sessionItem?.Items?.length !== 1) {
			this.logger.error({ message: "Error retrieving Session by yoti session id" }, {
				messageCode: MessageCodes.FAILED_FETCHING_BY_YOTI_SESSIONID });
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "Error retrieving Session by yoti session id");
		}

		if (sessionItem.Items[0].expiryDate < absoluteTimeNow()) {
			this.logger.error(`Session with session id: ${sessionItem.Items[0].sessionId} has expired`);
			throw new AppError(HttpCodesEnum.UNAUTHORIZED, `Session with session id: ${sessionItem.Items[0].sessionId} has expired`);
		}

		return sessionItem.Items[0] as ISessionItem;
	}

	async setAuthorizationCode(sessionId: string, uuid: string): Promise<void> {

		const updateSessionCommand = new UpdateCommand({
			TableName: this.tableName,
			Key: { sessionId },
			UpdateExpression: "SET authorizationCode=:authCode, authorizationCodeExpiryDate=:authCodeExpiry, authSessionState = :authSessionState",
			ExpressionAttributeValues: {
				":authCode": uuid,
				":authCodeExpiry": getAuthorizationCodeExpirationEpoch(process.env.AUTHORIZATION_CODE_TTL),
				":authSessionState": AuthSessionState.F2F_AUTH_CODE_ISSUED,
			},
		});

		this.logger.info( { message: "updating authorizationCode dynamodb" }, { tableName: this.tableName } );

		try {
			await this.dynamo.send(updateSessionCommand);
			this.logger.info({ message: "updated authorizationCode in dynamodb" });
		} catch (error: any) {
			this.logger.error({ message: "Error updating authorizationCode" }, {
				messageCode: MessageCodes.FAILED_UPDATING_SESSION,
				error });
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "Failed to update the authorizationCode ");
		}
	}

	async obfuscateJSONValues(input: any, txmaFieldsToShow: string[] = []): Promise<any> {
		if (typeof input === "object" && input !== null) {
			if (Array.isArray(input)) {
				return Promise.all(input.map((element) => this.obfuscateJSONValues(element, txmaFieldsToShow)));
			} else {
				const obfuscatedObject: any = {};
				for (const key in input) {
					if (Object.prototype.hasOwnProperty.call(input, key)) {
						if (txmaFieldsToShow.includes(key)) {
							obfuscatedObject[key] = input[key];
						} else {
							obfuscatedObject[key] = await this.obfuscateJSONValues(input[key], txmaFieldsToShow);
						}
					}
				}
				return obfuscatedObject;
			}
		} else {
			return input === null || input === undefined ? input : "***";
		}
	}

	async sendToTXMA(event: TxmaEvent, encodedHeader?: string): Promise<void> {
		try {

			if (encodedHeader) {
				event.restricted = event.restricted ?? { device_information: { encoded: "" } };
				event.restricted.device_information = { encoded: encodedHeader };
			}
			
			const messageBody = JSON.stringify(event);
			const params = {
				MessageBody: messageBody,
				QueueUrl: process.env.TXMA_QUEUE_URL,
			};

			this.logger.info({ message: "Sending message to TxMA", eventName: event.event_name });

			await createSqsClient().send(new SendMessageCommand(params));
			this.logger.info("Sent message to TxMA");

			const obfuscatedObject = await this.obfuscateJSONValues(event, Constants.TXMA_FIELDS_TO_SHOW);
			this.logger.info({ message: "Obfuscated TxMA Event", txmaEvent: JSON.stringify(obfuscatedObject, null, 2) });
		} catch (error) {
			this.logger.error({ message: "Error when sending message to TXMA Queue", error });
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "sending event to txma queue - failed ");
		}
	}

	async sendToGovNotify(event: GovNotifyEvent | ReminderEmailEvent): Promise<void> {
		try {
			const messageBody = JSON.stringify(event);
			const params = {
				MessageBody: messageBody,
				QueueUrl: this.environmentVariables.getGovNotifyQueueURL(this.logger),
			};
			await createSqsClient().send(new SendMessageCommand(params));
			this.logger.info("Sent message to Gov Notify");
		} catch (error) {
			this.logger.error({ message: "Error when sending message to GovNotify Queue", error });
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "sending event to govNotify queue - failed ");
		}
	}

	async sendToIPVCore(event: IPVCoreEvent): Promise<void> {
		try {
			const messageBody = JSON.stringify(event);
			const queueUrl = this.environmentVariables.getIpvCoreQueueURL(this.logger);
			const params = {
				MessageBody: messageBody,
				QueueUrl: queueUrl,
			};

			this.logger.info({ message: "Sending message to IPV Core Queue", queueUrl });

			await createSqsClient().send(new SendMessageCommand(params));
			this.logger.info("Sent message to IPV Core");
		} catch (error) {
			this.logger.error({ message: "Error when sending message to IPV Core Queue", error });
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "sending event to ipv core queue - failed ");
		}
	}

	async getSessionByAuthorizationCode(code: string | undefined): Promise<ISessionItem | undefined> {
		const params: QueryCommandInput = {
			TableName: this.tableName,
			IndexName: Constants.AUTHORIZATION_CODE_INDEX_NAME,
			KeyConditionExpression: "authorizationCode = :authorizationCode",
			ExpressionAttributeValues: {
				":authorizationCode": code,
			},
		};

		const sessionItem = await this.dynamo.query(params);

		if (!sessionItem?.Items || sessionItem?.Items?.length !== 1) {
			this.logger.error("Error retrieving Session by authorization code", {
				messageCode: MessageCodes.FAILED_FETCHING_SESSION_BY_AUTH_CODE,
			});
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "Error retrieving Session by authorization code");
		}

		if (sessionItem.Items[0].expiryDate < absoluteTimeNow()) {
			this.logger.error(`Session with session id: ${sessionItem.Items[0].sessionId} has expired`, {
				messageCode: MessageCodes.EXPIRED_SESSION,
			});
			throw new AppError(HttpCodesEnum.UNAUTHORIZED, `Session with session id: ${sessionItem.Items[0].sessionId} has expired`);
		}

		return sessionItem.Items[0] as ISessionItem;
	}

	async getSessionsByAuthSessionStates(authSessionStates: string[]): Promise<Array<Record<string, any>>> {
		const uniqueSessionIds = new Set();
		const filteredItems = [];
	
		for (const authSessionState of authSessionStates) {
			const params = {
				TableName: this.tableName,
				IndexName: Constants.AUTH_SESSION_STATE_INDEX_NAME,
				KeyConditionExpression: "authSessionState = :authSessionState",
				ExpressionAttributeValues: {
					":authSessionState": authSessionState,
				},
			};
	
			const sessionItems = (await this.dynamo.query(params))?.Items || [];
	
			for (const item of sessionItems) {
				if (!uniqueSessionIds.has(item.sessionId) && item.expiryDate > absoluteTimeNow()) {
					uniqueSessionIds.add(item.sessionId);
					filteredItems.push(item);
				}
			}
		}
	
		return filteredItems;
	}

	async updateReminderEmailFlag(sessionId: string, reminderEmailSent: boolean): Promise<void> {
		const updateStateCommand = new UpdateCommand({
			TableName: this.tableName,
			Key: { sessionId },
			UpdateExpression: "SET reminderEmailSent = :reminderEmailSent",
			ExpressionAttributeValues: {
				":reminderEmailSent": reminderEmailSent,
			},
		});

		this.logger.info({ message: "Setting reminderEmailSent to be: ", reminderEmailSent });
		try {
			await this.dynamo.send(updateStateCommand);
			this.logger.info({ message: "Updated reminderEmailSent flag in session table" });
		} catch (error) {
			this.logger.error({ message: "Got error setting reminderEmailSent flag", error });
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "updateItem - failed: got error setting reminderEmailSent flag");
		}
	}

	async updateSessionWithAccessTokenDetails(sessionId: string, accessTokenExpiryDate: number): Promise<void> {
		const updateAccessTokenDetailsCommand = new UpdateCommand({
			TableName: this.tableName,
			Key: { sessionId },
			UpdateExpression: "SET authSessionState = :authSessionState, accessTokenExpiryDate = :accessTokenExpiryDate REMOVE authorizationCode",
			ExpressionAttributeValues: {
				":authSessionState": AuthSessionState.F2F_ACCESS_TOKEN_ISSUED,
				":accessTokenExpiryDate": accessTokenExpiryDate,
			},
		});

		this.logger.info({ message: "updating Access token details in dynamodb" }, { tableName: this.tableName });
		try {
			await this.dynamo.send(updateAccessTokenDetailsCommand);
			this.logger.info({ message: "updated Access token details in dynamodb" });
		} catch (error) {
			this.logger.error({ message: "got error updating Access token details", error }, { messageCode: MessageCodes.FAILED_UPDATING_SESSION });
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "updateItem - failed: got error updating Access token details");
		}
	}

	async createAuthSession(session: ISessionItem): Promise<void> {
		const putSessionCommand = new PutCommand({
			TableName: this.tableName,
			Item: session,
		});

		this.logger.info({ message: "Saving session data in DynamoDB" });
		try {
			await this.dynamo.send(putSessionCommand);
			this.logger.info("Successfully created session in dynamodb");
		} catch (error) {
			this.logger.error("got error " + error);
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "saveItem - failed " );
		}
	}

	async updateSessionWithYotiIdAndStatus(sessionId: string, yotiSessionId: string, authSessionState: string): Promise<void> {
		const updateYotiDetailsCommand = new UpdateCommand({
			TableName: this.tableName,
			Key: { sessionId },
			UpdateExpression: "SET yotiSessionId = :yotiSessionId, authSessionState = :authSessionState",
			ExpressionAttributeValues: {
				":yotiSessionId": yotiSessionId,
				":authSessionState": authSessionState,
			},
		});

		this.logger.info({ message: "Updating session table with Yoti session details", updateYotiDetailsCommand });
		try {
			await this.dynamo.send(updateYotiDetailsCommand);
			this.logger.info({ message: "Updated Yoti session details in dynamodb" });
		} catch (error) {
			this.logger.error("FAILED_TO_UPDATE_YOTI_STATUS", {
				yotiSessionId,
				reason: "Yoti session created, failed to update session table in dynamodb",
				error,
			});
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "updateItem - failed: got error saving Yoti session details");
		}
	}

	private mapAddresses(addresses: PersonIdentityAddress[]): PersonIdentityAddress[] {
		return addresses?.map((address) => ({
			uprn: address.uprn,
			organisationName: address.organisationName,
			departmentName: address.departmentName,
			subBuildingName: address.subBuildingName,
			buildingNumber: address.buildingNumber,
			buildingName: address.buildingName,
			dependentStreetName: address.dependentStreetName,
			streetName: address.streetName,
			addressCountry: address.addressCountry,
			postalCode: address.postalCode,
			addressLocality: address.addressLocality,
			dependentAddressLocality: address.dependentAddressLocality,
			doubleDependentAddressLocality: address.doubleDependentAddressLocality,
			validFrom: address.validFrom,
			validUntil: address.validUntil,
		}));
	}

	private mapbirthDate(birthDate: PersonIdentityDateOfBirth[]): PersonIdentityDateOfBirth[] {
		return birthDate?.map((bd) => ({ value: bd.value }));
	}

	private mapNames(name: PersonIdentityName[]): PersonIdentityName[] {
		return name?.map((index) => ({
			nameParts: index?.nameParts?.map((namePart) => ({
				type: namePart.type,
				value: namePart.value,
			})),
		}));
	}

	private createPersonIdentityItem(
		sharedClaims: SharedClaimsPersonIdentity,
		sessionId: string,
	): PersonIdentityItem {
		return {
			sessionId,
			addresses: this.mapAddresses(sharedClaims.address),
			birthDate: this.mapbirthDate(sharedClaims.birthDate),
			emailAddress: sharedClaims.emailAddress,
			name: this.mapNames(sharedClaims.name),
			expiryDate: absoluteTimeNow() + this.environmentVariables.authSessionTtlInSecs(),
			createdDate: absoluteTimeNow(),
		};
	}

	async savePersonIdentity(
		sharedClaims: SharedClaimsPersonIdentity,
		sessionId: string,
	): Promise<void> {
		const personIdentityItem = this.createPersonIdentityItem(
			sharedClaims,
			sessionId,
		);

		const putSessionCommand = new PutCommand({
			TableName: process.env.PERSON_IDENTITY_TABLE_NAME,
			Item: personIdentityItem,
		});
		await this.dynamo.send(putSessionCommand);
		return putSessionCommand?.input?.Item?.sessionId;
	}

	async saveUserPdfPreferences(
		sessionId: string,
		pdfPreference: string,
		postalAddress?: PersonIdentityAddress,
		tableName: string = this.tableName,
	): Promise<PersonIdentityItem | undefined> {
		const personDetails = await this.getPersonIdentityById(sessionId, this.environmentVariables.personIdentityTableName());
		const personDetailsAddressArray = personDetails?.addresses;
		if (pdfPreference === PdfPreferenceEnum.PRINTED_LETTER && postalAddress && personDetails?.addresses[0].uprn !== postalAddress.uprn) {
			personDetailsAddressArray?.push(postalAddress);
			const updateUserDetails = new UpdateCommand({
				TableName: tableName,
				Key: { sessionId },
				UpdateExpression: "SET pdfPreference = :pdfPreference, addresses = :addresses",
				ExpressionAttributeValues: {
					":pdfPreference": pdfPreference,
					":addresses": personDetailsAddressArray,
				},
			});
			this.logger.info({ message: "Updating person table with letter preference and postal address" });
			try {
				await this.dynamo.send(updateUserDetails);
				this.logger.info({ message: "Updated letter preference and postal address details in dynamodb" });
			} catch (error) {
				this.logger.error({ message: "Got error saving letter preference or postal address details", error });
				throw new AppError(HttpCodesEnum.SERVER_ERROR, "updateItem - failed: got error saving letter preference or postal address details");
			}
		} else {
			const updateUserPreference = new UpdateCommand({
				TableName: tableName,
				Key: { sessionId },
				UpdateExpression: "SET pdfPreference = :pdfPreference",
				ExpressionAttributeValues: {
					":pdfPreference": pdfPreference,
				},
			});
			this.logger.info({ message: `Updating pdfPreference in ${tableName}` });
			try {
				await this.dynamo.send(updateUserPreference);
				this.logger.info({ message: `Updated ${tableName} with pdfPreference` });
			} catch (error) {
				this.logger.error({ message: `Got error updating pdfPreference in ${tableName}`, error });
				throw new AppError(HttpCodesEnum.SERVER_ERROR, `updateItem - failed: got error updating ${tableName}`);
			}
		}
		const returnValue = await this.getPersonIdentityById(sessionId, this.environmentVariables.personIdentityTableName());
		return returnValue;
	}

	async updateSessionAuthState(sessionId: string, authSessionState: string): Promise<void> {
		const updateStateCommand = new UpdateCommand({
			TableName: this.tableName,
			Key: { sessionId },
			UpdateExpression: "SET authSessionState = :authSessionState",
			ExpressionAttributeValues: {
				":authSessionState": authSessionState,
			},
		});

		this.logger.info({ message: "Updating session table with auth state details", updateStateCommand });
		try {
			await this.dynamo.send(updateStateCommand);
			this.logger.info({ message: "Updated auth state details in dynamodb" });
		} catch (error) {
			this.logger.error({ message: "Got error saving auth state details", error });
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "updateItem - failed: got error saving auth state details");
		}
	}

	async updateSessionTtl(sessionId: string, sessionTtl: number, tableName: string = this.tableName): Promise<void> {
		const updateStateCommand = new UpdateCommand({
			TableName: tableName,
			Key: { sessionId },
			UpdateExpression: "SET expiryDate = :expiryDate",
			ExpressionAttributeValues: {
				":expiryDate": sessionTtl,
			},
		});

		this.logger.info({ message: `Updating ${tableName} table TTL`, updateStateCommand });
		try {
			await this.dynamo.send(updateStateCommand);
			this.logger.info({ message: `Updated ${tableName} TTL in dynamodb` });
		} catch (error) {
			this.logger.error({ message: `Got error updating ${tableName} ttl`, error });
			throw new AppError(HttpCodesEnum.SERVER_ERROR, `updateItem - failed: got error updating ${tableName} ttl`);
		}
	}

	async addUsersSelectedDocument(sessionId: string, documentUsed: string, tableName: string = this.tableName): Promise<void> {
		const updateStateCommand = new UpdateCommand({
			TableName: tableName,
			Key: { sessionId },
			UpdateExpression: "SET documentUsed = :documentUsed",
			ExpressionAttributeValues: {
				":documentUsed": documentUsed,
			},
		});

		this.logger.info({ message: `Updating documentUsed in ${tableName}`, updateStateCommand });
		try {
			await this.dynamo.send(updateStateCommand);
			this.logger.info({ message: `Updated ${tableName} with documentUsed` });
		} catch (error) {
			this.logger.error({ message: `Got error updating documentUsed in ${tableName}`, error });
			throw new AppError(HttpCodesEnum.SERVER_ERROR, `updateItem - failed: got error updating ${tableName}`);
		}
	}
}
