/* eslint-disable no-console */
import { ISessionItem } from "../models/ISessionItem";
import { Logger } from "@aws-lambda-powertools/logger";
import { AppError } from "../utils/AppError";
import { DynamoDBDocument, GetCommand, QueryCommandInput, UpdateCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { getAuthorizationCodeExpirationEpoch, absoluteTimeNow } from "../utils/DateTimeUtils";
import { Constants } from "../utils/Constants";
import { AuthSessionState } from "../models/enums/AuthSessionState";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { sqsClient } from "../utils/SqsClient";
import { TxmaEvent } from "../utils/TxmaEvent";
import {
	PersonIdentityAddress,
	PersonIdentityDateOfBirth,
	PersonIdentityItem,
	PersonIdentityName,
	SharedClaimsPersonIdentity,
} from "../models/PersonIdentityItem";
import { GovNotifyEvent } from "../utils/GovNotifyEvent";
import { EnvironmentVariables } from "./EnvironmentVariables";
import { ServicesEnum } from "../models/enums/ServicesEnum";
import { IPVCoreEvent } from "../utils/IPVCoreEvent";
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
		} catch (e: any) {
			this.logger.error({ message: "getSessionById - failed executing get from dynamodb:", e });
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "Error retrieving Session");
		}

		if (session.Item) {
			if (session.Item.expiryDate < absoluteTimeNow()) {
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
		} catch (e: any) {
			this.logger.error({ message: "getSessionById - failed executing get from dynamodb:", e });
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
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "Error retrieving Session by yoit session id");
		}

		if (sessionItem.Items[0].expiryDate < absoluteTimeNow()) {
			throw new AppError(HttpCodesEnum.UNAUTHORIZED, `Session with session id: ${sessionItem.Items[0].sessionId} has expired`);
		}

		return sessionItem.Items[0] as ISessionItem;
	}

	//This is not currently used in F2F
	// async saveF2FData(sessionId: string, f2fData: F2fSession): Promise<void> {
	// 	const saveF2FCommand: any = new UpdateCommand({
	// 		TableName: this.tableName,
	// 		Key: { sessionId },
	// 		UpdateExpression:
	// 			"SET given_names = :given_names, family_names = :family_names, date_of_birth = :date_of_birth, authSessionState = :authSessionState",

	// 		ExpressionAttributeValues: {
	// 			":given_names": f2fData.given_names,
	// 			":family_names": f2fData.family_names,
	// 			":date_of_birth": f2fData.date_of_birth,
	// 			":authSessionState": AuthSessionState.F2F_DATA_RECEIVED,
	// 		},
	// 	});

	// 	this.logger.info({
	// 		message: "updating F2F data in dynamodb",
	// 		saveF2FCommand,
	// 	});
	// 	try {
	// 		await this.dynamo.send(saveF2FCommand);
	// 		this.logger.info({ message: "updated F2F data in dynamodb" });
	// 	} catch (error) {
	// 		this.logger.error({ message: "got error saving F2F data", error });
	// 		throw new AppError(HttpCodesEnum.SERVER_ERROR,
	// 			"Failed to set claimed identity data ",
	// 		);
	// 	}
	// }

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

		this.logger.info({ message: "updating authorizationCode dynamodb", updateSessionCommand });

		try {
			await this.dynamo.send(updateSessionCommand);
			this.logger.info({ message: "updated authorizationCode in dynamodb" });
		} catch (e: any) {
			this.logger.error({ message: "got error setting auth code", e });
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "Failed to set authorization code ");
		}
	}

	async sendToTXMA(event: TxmaEvent): Promise<void> {
		try {
			const messageBody = JSON.stringify(event);
			const params = {
				MessageBody: messageBody,
				QueueUrl: process.env.TXMA_QUEUE_URL,
			};

			this.logger.info({ message: "Sending message to TxMA" });

			await sqsClient.send(new SendMessageCommand(params));
			this.logger.info("Sent message to TxMA");
		} catch (error) {
			this.logger.error({ message: "Error when sending message to TXMA Queue", error });
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "sending event to txma queue - failed ");
		}
	}

	async sendToGovNotify(event: GovNotifyEvent): Promise<void> {
		try {
			const messageBody = JSON.stringify(event);
			const params = {
				MessageBody: messageBody,
				QueueUrl: this.environmentVariables.getGovNotifyQueueURL(this.logger),
			};

			await sqsClient.send(new SendMessageCommand(params));
			this.logger.info("Sent message to Gov Notify");
		} catch (error) {
			this.logger.error({ message: "Error when sending message to GovNotify Queue", error });
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "sending event to govNotify queue - failed ");
		}
	}

	async sendToIPVCore(event: IPVCoreEvent): Promise<void> {
		try {
			const messageBody = JSON.stringify(event);
			const queueUrl = this.environmentVariables.getIpvCoreQueueURL(this.logger)
			const params = {
				MessageBody: messageBody,
				QueueUrl: queueUrl,
			};

			this.logger.info({ message: "Sending message to IPV Core Queue", queueUrl });

			await sqsClient.send(new SendMessageCommand(params));
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
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "Error retrieving Session by authorization code");
		}

		if (sessionItem.Items[0].expiryDate < absoluteTimeNow()) {
			throw new AppError(HttpCodesEnum.UNAUTHORIZED, `Session with session id: ${sessionItem.Items[0].sessionId} has expired`);
		}

		return sessionItem.Items[0] as ISessionItem;
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

		this.logger.info({ message: "updating Access token details in dynamodb", updateAccessTokenDetailsCommand });
		try {
			await this.dynamo.send(updateAccessTokenDetailsCommand);
			this.logger.info({ message: "updated Access token details in dynamodb" });
		} catch (error) {
			this.logger.error({ message: "got error saving Access token details", error });
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "updateItem - failed: got error saving Access token details");
		}
	}

	async createAuthSession(session: ISessionItem): Promise<void> {
		const putSessionCommand = new PutCommand({
			TableName: this.tableName,
			Item: session,
		});

		this.logger.info({
			message:
				"Saving session data in DynamoDB: " +
				JSON.stringify([putSessionCommand]),
		});
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
			expiryDate: Math.floor((Date.now() / 1000) + Number(this.environmentVariables.authSessionTtlInSecs())),
			createdDate: Math.floor(Date.now() / 1000),
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

}
