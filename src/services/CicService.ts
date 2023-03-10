/* eslint-disable no-console */
import { CicSession } from "../models/CicSession";
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

export class CicService {
    readonly tableName: string;

    private readonly dynamo: DynamoDBDocument;

    readonly logger: Logger;

    private static instance: CicService;

    constructor(tableName: any, logger: Logger, dynamoDbClient: DynamoDBDocument) {
    	this.tableName = tableName;
    	this.dynamo = dynamoDbClient;
    	this.logger = logger;
    }

    static getInstance(tableName: string, logger: Logger, dynamoDbClient: DynamoDBDocument): CicService {
    	if (!CicService.instance) {
    		CicService.instance = new CicService(tableName, logger, dynamoDbClient);
    	}
    	return CicService.instance;
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
    		throw new AppError("Error retrieving Session", HttpCodesEnum.SERVER_ERROR);
    	}

    	if (session.Item) {
    		return session.Item as ISessionItem;
    	}

    }

    async saveCICData(sessionId: string, cicData: CicSession): Promise<void> {

    	const saveCICCommand: any = new UpdateCommand({
    		TableName: this.tableName,
    		Key: { sessionId },
    		UpdateExpression: "SET full_name = :full_name, date_of_birth = :date_of_birth, document_selected = :document_selected, date_of_expiry =:date_of_expiry, authSessionState = :authSessionState",

    		ExpressionAttributeValues: {
    			":full_name": cicData.full_name,
    			":date_of_birth": cicData.date_of_birth,
    			":document_selected": cicData.document_selected,
    			":date_of_expiry": cicData.date_of_expiry,
    			":authSessionState": AuthSessionState.CIC_DATA_RECEIVED,
    		},
    	});

    	this.logger.info({ message: "updating CIC data in dynamodb", saveCICCommand });
    	try {
    		await this.dynamo.send(saveCICCommand);
    		this.logger.info({ message: "updated CIC data in dynamodb" });
    	} catch (error) {
    		this.logger.error({ message: "got error saving CIC data", error });
    		throw new AppError("Failed to set claimed identity data ", HttpCodesEnum.SERVER_ERROR);
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
    			":authSessionState": AuthSessionState.CIC_AUTH_CODE_ISSUED,
    		},
    	});

    	this.logger.info({ message: "updating authorizationCode dynamodb", updateSessionCommand });

    	try {
    		await this.dynamo.send(updateSessionCommand);
    		this.logger.info({ message: "updated authorizationCode in dynamodb" });
    	} catch (e: any) {
    		this.logger.error({ message: "got error setting auth code", e });
    		throw new AppError("Failed to set authorization code ", HttpCodesEnum.SERVER_ERROR);
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
    		throw new AppError("sending event - failed ", HttpCodesEnum.SERVER_ERROR);
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
    		throw new AppError("Error retrieving Session by authorization code", HttpCodesEnum.SERVER_ERROR);
    	}

    	return sessionItem.Items[0] as ISessionItem;
    }

    async updateSessionWithAccessTokenDetails(sessionId: string, accessTokenExpiryDate: number): Promise<void> {
    	const updateAccessTokenDetailsCommand = new UpdateCommand({
    		TableName: this.tableName,
    		Key: { sessionId },
    		UpdateExpression: "SET authSessionState = :authSessionState, accessTokenExpiryDate = :accessTokenExpiryDate REMOVE authorizationCode",
    		ExpressionAttributeValues: {
    			":authSessionState": AuthSessionState.CIC_ACCESS_TOKEN_ISSUED,
    			":accessTokenExpiryDate": accessTokenExpiryDate,
    		},
    	});

    	this.logger.info({ message: "updating Access token details in dynamodb", updateAccessTokenDetailsCommand });
    	try {
    		await this.dynamo.send(updateAccessTokenDetailsCommand);
    		this.logger.info({ message: "updated Access token details in dynamodb" });
    	} catch (error) {
    		this.logger.error({ message: "got error saving Access token details", error });
    		throw new AppError("updateItem - failed: got error saving Access token details", HttpCodesEnum.SERVER_ERROR);
    	}
    }
}
