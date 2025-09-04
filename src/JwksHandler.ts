import { Logger } from "@aws-lambda-powertools/logger";
import { LambdaInterface } from "@aws-lambda-powertools/commons";
import { Constants } from "./utils/Constants";
import { Jwk, JWKSBody, Algorithm } from "./utils/IVeriCredential";
import { PutObjectCommand, S3Client, CopyObjectCommand } from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import crypto from "crypto";
import * as AWS from "@aws-sdk/client-kms";
import { EnvironmentVariables } from "./services/EnvironmentVariables";
import { ServicesEnum } from "./models/enums/ServicesEnum";
import { jwtUtils } from "./utils/JwtUtils";

const POWERTOOLS_LOG_LEVEL = process.env.POWERTOOLS_LOG_LEVEL ? process.env.POWERTOOLS_LOG_LEVEL : "DEBUG";
const POWERTOOLS_SERVICE_NAME = process.env.POWERTOOLS_SERVICE_NAME ? process.env.POWERTOOLS_SERVICE_NAME : Constants.JWKS_LOGGER_SVC_NAME;
const JWKS_BUCKET_NAME = process.env.JWKS_BUCKET_NAME;
const PUBLISHED_KEYS_BUCKET_NAME = process.env.PUBLISHED_KEYS_BUCKET_NAME;
export const logger = new Logger({
	logLevel: POWERTOOLS_LOG_LEVEL,
	serviceName: POWERTOOLS_SERVICE_NAME,
});

class JwksHandler implements LambdaInterface {
	readonly s3Client = new S3Client({
		region: process.env.REGION,
		maxAttempts: 2,
		requestHandler: new NodeHttpHandler({
			connectionTimeout: 29000,
			socketTimeout: 29000,
		}),
	});
	readonly environmentVariables: EnvironmentVariables = new EnvironmentVariables(logger, ServicesEnum.JWKS_SERVICE);
	
	readonly kmsClient = new AWS.KMS({
		region: process.env.REGION,
	});

    async handler(): Promise<string> {
        const body: JWKSBody = { keys: [] };
        const kmsKeyIds = [
            ...this.environmentVariables.signingKeyIds().split(","),
            ...this.environmentVariables.encryptionKeyIds().split(","),
        ];
        logger.info({ message:"Building wellknown JWK endpoint with keys" + kmsKeyIds });

        const jwks = await Promise.all(
            kmsKeyIds.map(async id => this.getAsJwk(id)),
        );
        jwks.forEach(jwk => {
            if (jwk != null) {
                body.keys.push(jwk);
            } else logger.warn({ message:"Environment contains missing keys" });
        });

        const uploadParams = {
            Bucket: JWKS_BUCKET_NAME,
			Key: ".well-known/jwks.json",
			Body: JSON.stringify(body),
			ContentType: "application/json",
        };

		const copyParams = {
			Bucket: PUBLISHED_KEYS_BUCKET_NAME,
			Key: "jwks.json",
			CopySource: `${JWKS_BUCKET_NAME}/.well-known/jwks.json`,
		};

        try {
            logger.info({ message: "Uploading keys to JWKS bucket" });
            await this.s3Client.send(new PutObjectCommand(uploadParams));

            logger.info({ message: "Copying keys to published keys bucket" });
            await this.s3Client.send(new CopyObjectCommand(copyParams));
			logger.info({ message: "Keys copied to published keys bucket" });

        return JSON.stringify(body);
        } catch (err) {
            logger.error({ message: "Error writing / copying keys", err });
            throw new Error("Error writing keys");
        }

    }

	async getAsJwk (keyId: string): Promise<Jwk | null> {
		let kmsKey;
		try {
			kmsKey = await this.kmsClient.getPublicKey({ KeyId: keyId });
		} catch (error) {
			logger.warn({ message:"Failed to fetch key from KMS" }, { error });
		}
	
		const map = this.getKeySpecMap(kmsKey?.KeySpec);
		if (
			kmsKey != null &&
			map != null &&
			kmsKey.KeyId != null &&
			kmsKey.PublicKey != null
		) {
			const use = kmsKey.KeyUsage === "ENCRYPT_DECRYPT" ? "enc" : "sig";
			const publicKey = crypto
				.createPublicKey({
					key: kmsKey.PublicKey as Buffer,
					type: "spki",
					format: "der",
				})
				.export({ format: "jwk" });
			const kid = keyId.split("/").pop();
			const hashedKid = kid ? jwtUtils.getHashedKid(kid) : undefined;
			return {
				...publicKey,
				use,
				kid: hashedKid,
				alg: map.algorithm,
			} as unknown as Jwk;
		}
		logger.error({ message: "Failed to build JWK from key" + keyId }, JSON.stringify(map));
		return null;
	};

	getKeySpecMap (
		spec?: string,
	): { keySpec: string; algorithm: Algorithm } | undefined {
		if (spec == null) return undefined;
		const conversions = [
			{
				keySpec: "ECC_NIST_P256",
				algorithm: "ES256" as Algorithm,
			},
			{
				keySpec: "RSA_2048",
				algorithm: "RSA-OAEP-256" as Algorithm,
			},
		];
		return conversions.find(x => x.keySpec === spec);
	};
}

export const handlerClass = new JwksHandler();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
