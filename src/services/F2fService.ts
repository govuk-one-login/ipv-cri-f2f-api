/* eslint-disable no-console */
import { ISessionItem } from "../models/ISessionItem";
import { Logger } from "@aws-lambda-powertools/logger";
import { AppError } from "../utils/AppError";
import { DynamoDBDocument, GetCommand, QueryCommandInput, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { getAuthorizationCodeExpirationEpoch } from "../utils/DateTimeUtils";
import { Constants } from "../utils/Constants";
import { AuthSessionState } from "../models/enums/AuthSessionState";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { sqsClient } from "../utils/SqsClient";
import { TxmaEvent } from "../utils/TxmaEvent";
import { PersonIdentity } from "../models/PersonIdentity";
import { GovNotifyEvent } from "../utils/GovNotifyEvent";

export class F2fService {
	readonly tableName: string;

	private readonly dynamo: DynamoDBDocument;

	readonly logger: Logger;

	private static instance: F2fService;

	constructor(tableName: any, logger: Logger, dynamoDbClient: DynamoDBDocument) {
		this.tableName = tableName;
		this.dynamo = dynamoDbClient;
		this.logger = logger;
	}

	static getInstance(tableName: string, logger: Logger, dynamoDbClient: DynamoDBDocument): F2fService {
		if (!F2fService.instance) {
			F2fService.instance = new F2fService(tableName, logger, dynamoDbClient);
		}
		return F2fService.instance;
	}

	async getSessionById(sessionId: string): Promise<ISessionItem | undefined> {
		this.logger.debug("Table name " + this.tableName);
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
			return session.Item as ISessionItem;
		}
	}

	async getPersonIdentityById(sessionId: string): Promise<PersonIdentity | undefined> {
		this.logger.debug("Table name " + this.tableName);
		const getPersonIdentityCommand = new GetCommand({
			TableName: this.tableName,
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
			return PersonInfo.Item as PersonIdentity;
		}
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
		const messageBody = JSON.stringify(event);
		const params = {
			MessageBody: messageBody,
			QueueUrl: process.env.TXMA_QUEUE_URL,
		};

		this.logger.info({ message: "Sending message to TxMA", messageBody });
		try {
			await sqsClient.send(new SendMessageCommand(params));
			this.logger.info("Sent message to TxMA");
		} catch (error) {
			this.logger.error("got error " + error);
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "sending event - failed ");
		}
	}

	async sendToGovNotify(event: GovNotifyEvent): Promise<void> {
		const messageBody = JSON.stringify(event);
		console.log('messageBody1', messageBody);
		const params = {
			MessageBody: messageBody,
			QueueUrl: process.env.GOV_NOTIFY_QUEUE_URL,
		};

		this.logger.info({ message: "Sending message to Gov Notify Queue", messageBody });
		try {
			await sqsClient.send(new SendMessageCommand(params));
			this.logger.info("Sent message to Gov Notify");
		} catch (error) {
			this.logger.error("got error " + error);
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "sending event to govNotify queue - failed ");
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
}
