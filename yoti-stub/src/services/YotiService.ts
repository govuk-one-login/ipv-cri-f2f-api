/* eslint-disable no-console */

import { Logger } from "@aws-lambda-powertools/logger";
import { AppError } from "../utils/AppError";
import {
    DynamoDBDocument, GetCommand,
    PutCommand,
} from "@aws-sdk/lib-dynamodb";
import {YotiSessionItem} from "../models/YotiSessionItem";
import {HttpCodesEnum} from "../utils/HttpCodesEnum";


export class YotiService {
    readonly tableName: string;

    private readonly dynamo: DynamoDBDocument;

    readonly logger: Logger;

    private static instance: YotiService;

    constructor(
        tableName: any,
        logger: Logger,
        dynamoDbClient: DynamoDBDocument,
    ) {
        this.tableName = tableName;
        this.dynamo = dynamoDbClient;
        this.logger = logger;
    }

    static getInstance(
        tableName: string,
        logger: Logger,
        dynamoDbClient: DynamoDBDocument,
    ): YotiService {
        if (!YotiService.instance) {
            YotiService.instance = new YotiService(tableName, logger, dynamoDbClient);
        }
        return YotiService.instance;
    }

    async getSessionById(session_id: string): Promise<YotiSessionItem | undefined> {
        this.logger.debug("Table name " + this.tableName);
        const getSessionCommand = new GetCommand({
            TableName: this.tableName,
            Key: {
                session_id,
            },
        });

        let session;
        try {
            session = await this.dynamo.send(getSessionCommand);
        } catch (e: any) {
            this.logger.error({
                message: "getSessionById - failed executing get from dynamodb:",
                e,
            });
            throw new AppError(
                "Error retrieving Session",
                HttpCodesEnum.SERVER_ERROR,
            );
        }

        if (session.Item) {
            return session.Item as YotiSessionItem;
        }
    }

    async createYotiSession(session: YotiSessionItem): Promise<void> {
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
            throw new AppError("saveItem - failed ", 500);
        }
    }

}
