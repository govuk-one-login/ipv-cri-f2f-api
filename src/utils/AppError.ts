export class AppError extends Error {

	constructor(
		public statusCode: number,
		public message: string,
		public appCode?: string,
		public obj?: object,
	) {
		super(message);
	}
}
