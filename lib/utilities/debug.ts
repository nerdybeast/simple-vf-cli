export class Debug {

	private errorDebugger;
	private warningDebugger;
	private infoDebugger;
	private verboseDebugger;

	constructor(private debuggerName: string, private fileName: string) {
		this.errorDebugger = require('debug')(`${debuggerName}:error:${fileName}`);
		this.warningDebugger = require('debug')(`${debuggerName}:warning:${fileName}`);
		this.infoDebugger = require('debug')(`${debuggerName}:info:${fileName}`);
		this.verboseDebugger = require('debug')(`${debuggerName}:verbose:${fileName}`);
	}

	error(message: string, obj?: any) {
		this.write(this.errorDebugger, message, obj);
	}

	warning(message: string, obj?: any) {
		this.write(this.warningDebugger, message, obj);
	}

	info(message: string, obj?: any) {
		this.write(this.infoDebugger, message, obj);
	}

	verbose(message: string, obj?: any) {
		this.write(this.verboseDebugger, message, obj);
	}

	private write(debuggerInstance: any, message: string, obj?: any) {
		if(obj) {
			debuggerInstance(`${message} => %o`, obj);
		} else {
			debuggerInstance(message);
		}
	}
}
