import { ErrorMetadata } from './models/error-metadata';
import { appSettingsLocation } from './paths';
import { Config } from './models/config';
import { SystemInformation } from './models/system-information';
import { Debug } from './utilities/debug';

const Rollbar = require('rollbar');
const path = require('path');
const debug = new Debug('svf', 'error-reporter');

require('dotenv').config({
	path: path.join(appSettingsLocation, '.env')
});

debug.info(`process.env.ROLLBAR_AUTH_TOKEN => %o`, process.env.ROLLBAR_AUTH_TOKEN);
let accessToken = process.env.ROLLBAR_AUTH_TOKEN;

debug.info(`process.env.ALLOW_ERROR_TRACKING => %o`, process.env.ALLOW_ERROR_TRACKING);
let enabled = process.env.ALLOW_ERROR_TRACKING === 'true';

let systemInformation = new SystemInformation();

class ErrorReporter {

	rollbar: any;

	constructor() {
		
		this.rollbar = new Rollbar({
			accessToken, 
			enabled,
			payload: {
				systemInformation
			}
		});
	}

	info(message: string, data: any) {
		return this.sendMessage('info', message, data, null);
	}

	debug(message: string, data: any) {
		return this.sendMessage('debug', message, data, null);
	}

	warning(message: string, data: any, ex: any) {
		return this.sendMessage('warning', message, data, ex);
	}

	error(ex, meta: ErrorMetadata, message: string = 'An exception has occurred') {
		return this.sendMessage('error', message, meta, ex);
	}

	critical(ex, meta: ErrorMetadata, message: string = 'A fatal exception has occurred') {
		return this.sendMessage('critical', message, meta, ex);
	}

	private sendMessage(type: string, message: string, data: any, ex: any) {
		return new Promise((resolve, reject) => {
			this.rollbar[type](message, ex, data, (rbError, rbResult) => {
				if(rbError) return reject(rbError);
				return resolve(rbResult);
			});
		});
	}
}

let errorReporter = new ErrorReporter();
export default errorReporter;