export class Response {
	constructor(
		public statusCode: number,
		public body: string | object | [],
		public headers?: { [header: string]: boolean | number | string } | undefined,
		public multiValueHeaders?: { [header: string]: Array<boolean | number | string> } | undefined,
	) {}
}
