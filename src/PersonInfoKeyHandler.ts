import { LambdaInterface } from "@aws-lambda-powertools/commons/lib/esm/types";
import { logger } from "@govuk-one-login/cri-logger";
import { metrics } from "@govuk-one-login/cri-metrics";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { HttpCodesEnum } from "./models/enums/HttpCodesEnum";
import { MessageCodes } from "./models/enums/MessageCodes";
import { getParameter } from "./utils/Config";
import { EnvironmentVariables } from "./services/EnvironmentVariables";
import { Response } from "./utils/Response";
import { ServicesEnum } from "./models/enums/ServicesEnum";

let key: string;

export class PersonInfoKeyHandler implements LambdaInterface {
    private readonly environmentVariables = new EnvironmentVariables(ServicesEnum.PERSON_INFO_KEY_SERVICE);

    @metrics.logMetrics({ throwOnEmptyMetrics: false, captureColdStartMetric: true })

    async handler(event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> {
		logger.resetKeys();
		logger.addContext(context);

    	try {
    		const privateKeyPath = this.environmentVariables.privateKeySsmPath();
    		logger.info({ message: "Fetching key", privateKeyPath });

    	key = await getParameter(privateKeyPath);
    		return Response(HttpCodesEnum.OK, JSON.stringify({ key }));

    	} catch (error: any) {
    		logger.error({ message: "Error fetching key", error, messageCode: MessageCodes.SERVER_ERROR });
    		return Response(HttpCodesEnum.SERVER_ERROR, "Server Error");
    	}
    }
}

const handlerClass = new PersonInfoKeyHandler();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
