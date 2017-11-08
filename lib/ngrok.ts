import errorReporter from './error-reporter';
import { ErrorMetadata } from './models/error-metadata';

const ngrok = require('ngrok');
const debug = require('debug')('svf:info ngrok');

class Ngrok {

	port: number;

	constructor(port: number) {
		this.port = port;
	}

	connect() : Promise<any> {

		return new Promise((resolve, reject) => {
			
			ngrok.connect(this.port, function (connectionError, url) {
				
				if(connectionError) { 
					/**
					 * Example ngrok err =>
					 * {
					 *   error_code: 102,
					 *   status_code: 400,
					 *   msg: 'invalid tunnel configuration',
					 *   details: { 
					 *     err: 'Tunnel \'2fc3ee4d-96e9-478e-bacf-3fd12eed2360\' specifies invalid address \'1.1111111e+12\': missing port in address 1.1111111e+12' 
					 *   }
					 * }
					 */
					 debug('connection error from ngrok => %o', connectionError);

					let error = new Error(connectionError.msg);
					error.name = 'ngrok_error';

					return reject({ error, connectionError }); 
				}
				
				return resolve(url);
			});

		}).catch(async (errorDetails) => {
			
			this.disconnect();
			
			let meta = new ErrorMetadata('connect', { 
				port: this.port,
				connectionError: errorDetails.connectionError
			});

			await errorReporter.error(errorDetails.error, meta);
			throw errorDetails.error;
		});
	}
	
	disconnect(callback?) {
		
		let callbackArgument;

		try {
			ngrok.kill();
		} catch(err) {
			callbackArgument = err;
		}

		if(callback && typeof callback === 'function') {
			return callback(callbackArgument);
		}

		return callbackArgument;
	}

	disconnectAsync() {
		return new Promise((resolve, reject) => {
			this.disconnect(err => {
				if(err) return reject(err);
				return resolve();
			});
		});
	}
}

export default Ngrok;