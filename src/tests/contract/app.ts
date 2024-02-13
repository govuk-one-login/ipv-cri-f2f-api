import express from "express";
import { accessTokenRouter } from "./routes/AccessTokenRoute";
import { userInfoRouter } from "./routes/UserInfoRoute";
import bodyParser from "body-parser";
import { Logger } from "@aws-lambda-powertools/logger";
import { Constants } from "./utils/Constants";

const logger = new Logger({
	logLevel: "INFO",
	serviceName: "ContractTestApp",
});

const app = express();
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


const port = Constants.LOCAL_APP_PORT;

app.listen(port, () => {
	logger.info(`Contract testing app listening on port ${port}`);
});

app.use(Constants.TOKEN_ENDPOINT, accessTokenRouter);
app.use(Constants.USERINFO_ENDPOINT, userInfoRouter);

