/* eslint-disable no-console */
import { F2fSession } from "../models/F2fSession";
import { ISessionItem } from "../models/ISessionItem";
import { Logger } from "@aws-lambda-powertools/logger";
import { AppError } from "../utils/AppError";
import { DynamoDBDocument, GetCommand, QueryCommandInput, UpdateCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { getAuthorizationCodeExpirationEpoch } from "../utils/DateTimeUtils";
import { Constants } from "../utils/Constants";
import { AuthSessionState } from "../models/enums/AuthSessionState";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { sqsClient } from "../utils/SqsClient";
import { TxmaEvent } from "../utils/TxmaEvent";
import {
	Address,
	BirthDate,
	Name,
	PersonIdentity,
} from "../models/PersonIdentity";
import {
	PersonIdentityAddress,
	PersonIdentityDateOfBirth,
	PersonIdentityItem,
	PersonIdentityName,
} from "../models/PersonIdentityItem";

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

	async saveF2FData(sessionId: string, f2fData: F2fSession): Promise<void> {
		const saveF2FCommand: any = new UpdateCommand({
			TableName: this.tableName,
			Key: { sessionId },
			UpdateExpression:
				"SET given_names = :given_names, family_names = :family_names, date_of_birth = :date_of_birth, document_selected = :document_selected, date_of_expiry =:date_of_expiry, authSessionState = :authSessionState",

			ExpressionAttributeValues: {
				":given_names": f2fData.given_names,
				":family_names": f2fData.family_names,
				":date_of_birth": f2fData.date_of_birth,
				":document_selected": f2fData.document_selected,
				":date_of_expiry": f2fData.date_of_expiry,
				":authSessionState": AuthSessionState.F2F_DATA_RECEIVED,
			},
		});

		this.logger.info({
			message: "updating F2F data in dynamodb",
			saveF2FCommand,
		});
		try {
			await this.dynamo.send(saveF2FCommand);
			this.logger.info({ message: "updated F2F data in dynamodb" });
		} catch (error) {
			this.logger.error({ message: "got error saving F2F data", error });
			throw new AppError(
				"Failed to set claimed identity data ",
				HttpCodesEnum.SERVER_ERROR,
			);
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
			throw new AppError("saveItem - failed ", 500);
		}
	}

	private mapAddresses(addresses: Address[]): PersonIdentityAddress[] {
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

	private mapBirthDates(birthDates: BirthDate[]): PersonIdentityDateOfBirth[] {
		return birthDates?.map((bd) => ({ value: bd.value }));
	}

	private mapNames(names: Name[]): PersonIdentityName[] {
		return names?.map((name) => ({
			nameParts: name?.nameParts?.map((namePart) => ({
				type: namePart.type,
				value: namePart.value,
			})),
		}));
	}

	private createPersonIdentityItem(
		sharedClaims: PersonIdentity,
		sessionId: string,
		sessionExpirationEpoch: number,
	): PersonIdentityItem {
		return {
			sessionId,
			addresses: this.mapAddresses(sharedClaims.address),
			birthDates: this.mapBirthDates(sharedClaims.birthDate),
			expiryDate: sessionExpirationEpoch,
			names: this.mapNames(sharedClaims.name),
		};
	}

	async savePersonIdentity(
		sharedClaims: PersonIdentity,
		sessionId: string,
		expiryDate: number,
	): Promise<void> {
		const personIdentityItem = this.createPersonIdentityItem(
			sharedClaims,
			sessionId,
			expiryDate,
		);

		const putSessionCommand = new PutCommand({
			TableName: process.env.PERSON_IDENTITY_TABLE_NAME,
			Item: personIdentityItem,
		});
		await this.dynamo.send(putSessionCommand);
		return putSessionCommand?.input?.Item?.sessionId;
	}

}
