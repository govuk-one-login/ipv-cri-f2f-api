import express from "express";
import { authRouter } from "./AuthorizationRoute";
import { accessTokenRouter } from "./AccessTokenRoute";

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

