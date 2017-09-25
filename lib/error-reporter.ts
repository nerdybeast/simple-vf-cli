const Rollbar = require('rollbar');
const debug = require('debug')('svf:info error-reporter');
const path = require('path');

import { ErrorMetadata } from './models/error-metadata';
import * as paths from './paths';

require('dotenv').config({
	path: path.join(paths.appSettingsLocation, '.env')
});

let accessToken = process.env.ROLLBAR_AUTH_TOKEN;
let enabled = process.env.ALLOW_ERROR_TRACKING === 'true';

class ErrorReporter {

	rollbar: any;

	constructor() {
		debug(`process.env.ALLOW_ERROR_TRACKING => %o`, process.env.ALLOW_ERROR_TRACKING);
		this.rollbar = new Rollbar({ accessToken, enabled });
	}

	exception(e, metadata: ErrorMetadata, cb) {
		
		if(!cb || typeof cb !== 'function') throw new Error(`Cannot call Rollbar.exception() without providing a callback function.`);

		//Some errors are not really fatal and if the user base for this project grows we will not want to log everything to rollbar.
		if(process.env.USE_IS_FATAL_FILTER && !e.isFatal) {
			cb(e);
		}
		
		this.rollbar.error(e, metadata, (rollbarError) => {
			
			if(rollbarError) {
				if(enabled) {
					debug(`Error calling rollbar api => %o`, rollbarError);
				} else {
					debug('Error tracking disabled, skipped reporting to Rollbar.');
				}
			}

			return cb(e);
		});
	}

	exceptionAsync(e, metadata: ErrorMetadata) {
		return new Promise((resolve, reject) => {
			this.exception(e, metadata, (processedError) => reject(processedError));
		});
	}
}

let errorReporter = new ErrorReporter();
export default errorReporter;