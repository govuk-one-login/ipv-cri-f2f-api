import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";
import { APIGatewayProxyEvent } from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";
import { YotiService } from "./YotiService";
import axios from "axios";
import https from 'https'

export class DocumentSelectionRequestProcessor {
	private static instance: DocumentSelectionRequestProcessor;

	private readonly logger: Logger;

	private readonly metrics: Metrics;

	private readonly yotiService: YotiService;

	constructor(logger: Logger, metrics: Metrics) {
		this.logger = logger;
		this.metrics = metrics;
		this.yotiService = YotiService.getInstance(this.logger);
	}

	static getInstance(logger: Logger, metrics: Metrics): DocumentSelectionRequestProcessor {
		if (!DocumentSelectionRequestProcessor.instance) {
			DocumentSelectionRequestProcessor.instance = new DocumentSelectionRequestProcessor(logger, metrics);
		}
		return DocumentSelectionRequestProcessor.instance;
	}

	async processRequest() {

		const { signature, params } = await this.yotiService.createSession();

		console.log('here', `https://api.yoti.com/idverify/v1/sessions?sdkId=${params.sdkId}&nonce=${params.nonce}&timestamp=${params.timestamp}`);
		console.log('there', signature);


		// const url = `https://api.yoti.com/idverify/v1/sessions?sdkId=${params.sdkId}&nonce=${params.nonce}&timestamp=${params.timestamp}`;
		// // const data = {
		// // 		x: 1920,
		// // 		y: 1080,
		// // };
		// const customHeaders = {
		// 	'X-Yoti-Auth-Digest': signature,
		// 	'X-Yoti-SDK': 'Node',
		// 	'X-Yoti-SDK-Version': 'Node-4.1.0',
		// 	Accept: 'application/json',
		// 	'Content-Type': 'application/json'
		// }

		// fetch(url, {
		// 		method: "POST",
		// 		headers: customHeaders,
		// })
		// .then((response) => response.json())
		// .then((data) => {
		// 		console.log(data);
		// });

		// const options = {
    //   hostname: 'api.yoti.com',
    //   port: 443,
    //   method: 'POST',
    //   path: `/idverify/v1/sessions?sdkId=${params.sdkId}&nonce=${params.nonce}&timestamp=${params.timestamp}`,
    //   headers: {
		// 		'X-Yoti-Auth-Digest': signature,
		// 		'X-Yoti-SDK': 'Node',
		// 		'X-Yoti-SDK-Version': 'Node-4.1.0',
		// 		Accept: 'application/json',
		// 		'Content-Type': 'application/json'
		// 	}
    // }

		// await new Promise((resolve, reject) => {
    //   const req = https.get(options, res => {
    //     if (res.statusCode !== 200) {
    //       return reject(new Error(`Could not retrieve public signing key from JWKS endpoint, received status: ${res.statusCode?.toString() ?? 'None'}, headers: ${JSON.stringify(res.headers)}`))
    //     }

    //     let output: Buffer = Buffer.from('')
    //     res.on('data', data => {
    //       output = Buffer.concat([output, data])
		// 			console.log('output', output);
    //     })

    //     res.on('end', () => {
    //       const response = JSON.parse(output.toString())

		// 			console.log('response', response);
    //       return resolve(response)
    //     })
    //   })
    //   req.end()
    // })


		const { data, status } = await axios.post(
      `https://api.yoti.com/idverify/v1/sessions?sdkId=${params.sdkId}&nonce=${params.nonce}&timestamp=${params.timestamp}`,
      {
        headers: {
					'X-Yoti-Auth-Digest': signature,
					'X-Yoti-SDK': 'Node',
					'X-Yoti-SDK-Version': 'Node-4.1.0',
					Accept: 'application/json',
					'Content-Type': 'application/json'
				},
      },
    );

		console.log('data', data);
		console.log('status', status);

		return {
			statusCode:200,
			body: JSON.stringify({
				access_token: 'accessToken',
			}),
		};
	
		// const info = await this.yotiService.fetchSessionInfo(id);
		// console.log('info', info);

		// const requirements = info
		// 		.parsedResponse
		// 		.capture
		// 		.required_resources
		// 		.filter((x: any) => x.type.includes('DOCUMENT'))
		// 		.map((resource: any) => {
		// 			if (resource.type === 'ID_DOCUMENT') {
		// 					return {
		// 						requirement_id: resource.id,
		// 						document: {
		// 								type: resource.type,
		// 								country_code: resource.supported_countries[0].code,
		// 								document_type: resource.supported_countries[0].supported_documents[0].type
		// 						}
		// 					}
		// 			} else if (resource.type === 'SUPPLEMENTARY_DOCUMENT') {
		// 					return {
		// 						requirement_id: resource.id,
		// 						document: {
		// 								type: resource.type,
		// 								country_code: resource.country_codes[0],
		// 								document_type: resource.document_types[0]
		// 						}
		// 					}
		// 			}

		// 		});
				
		// console.log('requirements', requirements);

		// const generateResponse = await this.yotiService.generateInstructions(id, requirements);
		// console.log('generateResponse', generateResponse);

		// return generateResponse;
	}
}
