import axios, { AxiosRequestConfig } from "axios";

const runTest = async () => {
	const config: AxiosRequestConfig = {
		url : "http://localhost:3000/userinfo",
		method: "POST",
		headers: { 
			"Authorization": "Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImtpZCJ9.eyJzdWIiOiI3NDY1NWNlMy1hNjc5LTRjMDktYTNiMC0xZDBkYzJlZmYzNzMiLCJhdWQiOiJpc3N1ZXIiLCJpc3MiOiJpc3N1ZXIiLCJleHAiOjIwMjI3OTE3Njd9.KClzxkHU35ck5Wck7jECzt0_TAkiy4iXRrUg_aftDg2uUpLOC0Bnb-77lyTlhSTuotEQbqB1YZqV3X_SotEQbg", 
		},
	};
	try {
		const userInfoResponse = await axios(config);
		console.log("================================");
		console.log("status", userInfoResponse.status);
		console.log("data", userInfoResponse.data);
	} catch (e) {
		console.log("error", e);
	}
};

void runTest();
