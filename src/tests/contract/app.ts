import express from "express";
import { authRouter } from "./routes/AuthorizationRoute";
import { accessTokenRouter } from "./routes/AccessTokenRoute";
import { userInfoRouter } from "./routes/UserInfoRoute";
import bodyParser from "body-parser";

const app = express();
app.use(express.json());

// app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


const port = 3000;

// app.get("/", (req, res) => {
// 	res.send("Contract Testing world");
// });

app.listen(port, () => {
	console.log(`Contract testing app listening on port ${port}`);
});

app.use("/authorization", authRouter);
app.use("/token", accessTokenRouter);
app.use("/userinfo", userInfoRouter);

