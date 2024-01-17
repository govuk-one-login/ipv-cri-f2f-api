import express from "express";
import { authRouter } from "./AuthorizeRoutes";

const app = express();
app.use(express.json());
const port = 3000;

// respond with "hello world" when a GET request is made to the homepage
app.get("/", (req, res) => {
	res.send("hello world");
});

app.listen(port, () => {
	console.log(`Example app listening on port ${port}`);
});

app.use("/authorize", authRouter);
