export class ErrorMetadata {
	methodName: string;
	parameters: any;

	constructor(methodName: string, parameters?: any) {
		this.methodName = methodName;
		this.parameters = parameters;
	}
}