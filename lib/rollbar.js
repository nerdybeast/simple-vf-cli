'use strict';

const rollbar = require('rollbar');
const Promise = require('bluebird');
const debug = require('debug')('svf:info rollbar');
const packageJson = require('../package.json');
const path = require('path');
const dbPath = require('./db-path');

require('dotenv').config({
    path: path.join(dbPath, '.env')
});

class Rollbar {

    constructor() {
        
        debug(`process.env.ALLOW_ERROR_TRACKING => %o`, process.env.ALLOW_ERROR_TRACKING);

        rollbar.init(packageJson.appSettings.rollbarAuthToken, {
            enabled: process.env.ALLOW_ERROR_TRACKING === 'true'
        });
    }

    exception(e, { methodName = 'unknown', params = {} } = {}, cb) {
        
        if(!cb || typeof cb !== 'function') throw new Error(`Cannot call Rollbar.exception() without providing a callback function.`);

        rollbar.handleErrorWithPayloadData(e, { methodName, params }, (rollbarError) => {
            if(rollbarError) debug(`Error calling rollbar api => %o`, rollbarError);
            return cb(e);
        });
    }

    exceptionAsync(e, { methodName = 'unknown', params = {} } = {}) {
        return new Promise((resolve, reject) => {
            this.exception(e, { methodName, params }, (processedError) => reject(processedError));
        });
    }
}

module.exports = new Rollbar();