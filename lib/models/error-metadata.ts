import SystemInformation from './system-information';

export class ErrorMetadata {
	methodName: string;
	parameters: any;
	user: string;
	systemInformation: SystemInformation;

	constructor(methodName: string, parameters?: any) {
		
		this.methodName = methodName;
		this.parameters = parameters;
		this.systemInformation = new SystemInformation();

		//We can't use the Salesforce username as the "user" for rollbar because it's different from org to org, this should give us a
		//decent unique value to identify all the errors for a particular system.
		this.user = this.systemInformation.hostname;
	}
}