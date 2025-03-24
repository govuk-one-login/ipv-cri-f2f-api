import { Metrics } from "@aws-lambda-powertools/metrics";
import { Logger } from "@aws-lambda-powertools/logger";
import  NodeRSA  from "node-rsa";
import { F2fService } from "./F2fService";
import { HttpCodesEnum } from "../models/enums/HttpCodesEnum";
import { MessageCodes } from "../models/enums/MessageCodes";
import { createDynamoDbClient } from "../utils/DynamoDBFactory";
import { EnvironmentVariables } from "./EnvironmentVariables";
import { personIdentityUtils } from "../utils/PersonIdentityUtils";
import { Response } from "../utils/Response";
import { ServicesEnum } from "../models/enums/ServicesEnum";
import { APIGatewayProxyResult } from "aws-lambda";

export class PersonInfoRequestProcessor {
	private static instance: PersonInfoRequestProcessor;

  	private readonly logger: Logger;

  	private readonly metrics: Metrics;

  	private readonly f2fService: F2fService;

	private readonly publicKey: string;

	private readonly environmentVariables: EnvironmentVariables;

	constructor(logger: Logger, metrics: Metrics, publicKey: string) {
		this.publicKey = publicKey;
		this.environmentVariables = new EnvironmentVariables(logger, ServicesEnum.PERSON_INFO_SERVICE);
		this.logger = logger;
  		this.metrics = metrics;
  		this.f2fService = F2fService.getInstance(this.environmentVariables.sessionTable(), this.logger, this.metrics, createDynamoDbClient());
	}

	static getInstance(logger: Logger, metrics: Metrics, publicKey: string): PersonInfoRequestProcessor {
  	if (!PersonInfoRequestProcessor.instance) {
  		PersonInfoRequestProcessor.instance = new PersonInfoRequestProcessor(logger, metrics, publicKey);
  	}
  	return PersonInfoRequestProcessor.instance;
	}

	async processRequest(sessionId: string): Promise<APIGatewayProxyResult> {
  	const session = await this.f2fService.getSessionById(sessionId);
		if (!session) {
  		this.logger.error("No session found for session id", {
  			messageCode: MessageCodes.SESSION_NOT_FOUND,
  		});
  		return Response(HttpCodesEnum.UNAUTHORIZED, `No session found with the session id: ${sessionId}`);
  	}

		this.logger.appendKeys({
  		govuk_signin_journey_id: session?.clientSessionId,
  	});

  	const person = await this.f2fService.getPersonIdentityById(sessionId, this.environmentVariables.personIdentityTableName());
		if (!person) {
  		this.logger.error("No person found for session id", {
  			messageCode: MessageCodes.PERSON_NOT_FOUND,
  		});
  		return Response(HttpCodesEnum.UNAUTHORIZED, `No person found with the session id: ${sessionId}`);
  	}

  	const address = personIdentityUtils.getStructuredPostalAddress(person.addresses[0], this.logger);
  	const encryptedResponseValue = this.encryptResponse(address);

  	return Response(HttpCodesEnum.OK, encryptedResponseValue);
	}

	encryptResponse(postalAddress: { address_line1: string; address_line2: string; town_city: string; postal_code: string }): string {
		const jsonAddress = JSON.stringify(postalAddress);

		this.logger.info("Encrypting personal info");
		const key = new NodeRSA(this.publicKey);
		return key.encrypt(jsonAddress, "base64");
	}
}
