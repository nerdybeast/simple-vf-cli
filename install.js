'use strict';

const path = require('path');
const fs = require('fs-extra');
const inquirer = require('inquirer');
const chalk = require('chalk');
const dbPath = require('./lib/db-path');
const db = require('./lib/db');
const debug = require('debug')('svf:info install');

fs.ensureDirSync(dbPath);

require('dotenv').config({
    path: path.join(dbPath, '.env')
});

if('ALLOW_ERROR_TRACKING' in process.env) {
   return process.exit(0);
}

let answers;

inquirer.prompt([{
    type: 'list',
    name: 'allowErrorTracking',
    message: `Do you want to allow simple-vf to collect errors and anonymous usage statistics? This can be changed any time using the ${chalk.bold.cyan('\`svf config\`')} command.`,
    choices: [
        { name: 'yes (recommended)', value: true },
        { name: 'no', value: false }
    ]
}]).then(promptAnswers => {

    answers = promptAnswers;

    if(!answers.allowErrorTracking) {
        return process.exit(0);
    }

    return db.getWithDefault('config');

}).then(config => {

    debug(`config returned from db => %o`, config);

    if(config === null) {

        return db.put({
            _id: 'config',
            ALLOW_ERROR_TRACKING: answers.allowErrorTracking
        }).then(putResult => {
            debug(`db postResult => %o`, putResult);
            return db.getWithDefault('config');
        });

    }

    return Promise.resolve(config);

}).then(config => {

    debug(`config before file write => %o`, config);

    let fileContents = [
        `ALLOW_ERROR_TRACKING=${config.ALLOW_ERROR_TRACKING}`
    ];
    
    fs.writeFileSync(path.join(dbPath, '.env'), fileContents.join('\n'), 'utf8');

});