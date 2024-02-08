import express from "express";
import { accessTokenRouter } from "./routes/AccessTokenRoute";
import { userInfoRouter } from "./routes/UserInfoRoute";
import bodyParser from "body-parser";
import { Logger } from "@aws-lambda-powertools/logger";

const logger = new Logger({
	logLevel: "INFO",
	serviceName: "ContractTestApp",
});

const app = express();
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


const port = 3000;

app.listen(port, () => {
	logger.info(`Contract testing app listening on port ${port}`);
});

app.use("/token", accessTokenRouter);
app.use("/userinfo", userInfoRouter);

