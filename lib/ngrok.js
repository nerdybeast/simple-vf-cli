'use strict';

const ngrok = require('ngrok');
const Promise = require('bluebird');
const rollbar = require('./rollbar');
const debug = require('debug')('svf:info ngrok');

class Ngrok {
    constructor(port) {
        this.port = port;
    }
    connect() {

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

                    let error = new Error(connectionError.msg);
                    error.name = 'ngrok_error';
                    error.originalError = connectionError;

                    debug('error from ngrok => %o', error);

                    return reject(error); 
                }
                
                return resolve(url);
            });

        }).catch(err => {
            
            this.disconnect();
            
            let meta = {
                methodName: 'connect',
                params: { port: this.port }
            };

            return rollbar.exceptionAsync(err, meta);
        });
    }
    
    disconnect(callback) {
        
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

module.exports = Ngrok;