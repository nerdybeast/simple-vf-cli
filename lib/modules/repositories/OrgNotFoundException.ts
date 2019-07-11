export class OrgNotFoundException extends Error {

	constructor(message?: string) {
		super(message);
		this.name = 'OrgNotFoundException';

		//Maintains proper stack trace for where our error was thrown (only available on V8)
		//See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
		if(Error.captureStackTrace) {
			Error.captureStackTrace(this, OrgNotFoundException);
		}
	}
}