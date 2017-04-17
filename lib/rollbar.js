'use strict';

const rollbar = require('rollbar');
const Promise = require('bluebird');
const debug = require('debug')('svf:info rollbar');
const packageJson = require('../package.json');
const path = require('path');
const dbPath = require('./db-path');
const sysInfo = require('./sys-info');

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

        //Some errors are not really fatal and if the user base for this project grows we will not want to log everything to rollbar.
        if(packageJson.appSettings.useIsFatalFilter && !e.isFatal) {
            cb(e);
        }

        params.sysInfo = sysInfo();
        
        //We can't use the Salesforce username as the "user" for rollbar because it's different from org to org, this should give us a
        //decent unique value to identify all the errors for a particular system.
        let user = { id: params.sysInfo.hostname };

        rollbar.handleErrorWithPayloadData(e, { methodName, params, user }, (rollbarError) => {
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