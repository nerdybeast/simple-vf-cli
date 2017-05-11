const rollbar = require('rollbar');
const debug = require('debug')('svf:info rollbar');
const path = require('path');

import ErrorMetadata from './models/error-metadata';
import * as paths from './paths';

require('dotenv').config({
	path: path.join(paths.appSettingsLocation, '.env')
});

class Rollbar {

	constructor() {
		
		debug(`process.env.ALLOW_ERROR_TRACKING => %o`, process.env.ALLOW_ERROR_TRACKING);

		rollbar.init(process.env.ROLLBAR_AUTH_TOKEN, {
			enabled: process.env.ALLOW_ERROR_TRACKING === 'true'
		});
	}

	exception(e, metadata: ErrorMetadata, cb) {
		
		if(!cb || typeof cb !== 'function') throw new Error(`Cannot call Rollbar.exception() without providing a callback function.`);

		//Some errors are not really fatal and if the user base for this project grows we will not want to log everything to rollbar.
		if(process.env.USE_IS_FATAL_FILTER && !e.isFatal) {
			cb(e);
		}
		
		rollbar.handleErrorWithPayloadData(e, metadata, (rollbarError) => {
			if(rollbarError) debug(`Error calling rollbar api => %o`, rollbarError);
			return cb(e);
		});
	}

	exceptionAsync(e, metadata: ErrorMetadata) {
		return new Promise((resolve, reject) => {
			this.exception(e, metadata, (processedError) => reject(processedError));
		});
	}
}

let rollbarInstance = new Rollbar();
export default rollbarInstance;