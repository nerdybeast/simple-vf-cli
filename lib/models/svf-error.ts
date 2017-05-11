export default class {
	error: Error;
	isFatal: boolean = false;
	originalError: any;

	constructor(message: string | Error) {
		this.error = typeof message === 'string' ? new Error(message) : message;
	}
}