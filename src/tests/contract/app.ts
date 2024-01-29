import express from "express";
import { authRouter } from "./routes/AuthorizationRoute";
import { accessTokenRouter } from "./routes/AccessTokenRoute";
import { userInfoRouter } from "./routes/UserInfoRoute";

const app = express();
app.use(express.json());
const port = 3000;

app.get("/", (req, res) => {
	res.send("Contract Testing world");
});

app.listen(port, () => {
	console.log(`Contract testing app listening on port ${port}`);
});

app.use("/authorization", authRouter);
app.use("/token", accessTokenRouter);
app.use("/userinfo", userInfoRouter);

