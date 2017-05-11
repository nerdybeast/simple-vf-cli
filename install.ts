const path = require('path');
const fs = require('fs-extra');
const inquirer = require('inquirer');
const chalk = require('chalk');
const debug = require('debug')('svf:info install');

import { appSettingsLocation } from './lib/paths';
import db from './lib/db';
import Config from './lib/models/config';

fs.ensureDirSync(appSettingsLocation);
let envPath = path.join(appSettingsLocation, '.env');

require('dotenv').config({
	path: envPath
});

let baseConfig = new Config();

askToAllowErrorTracking(process.env).then(answer => {

	baseConfig.ALLOW_ERROR_TRACKING = answer;
	return db.getWithDefault('config');

}).then(config => {

	debug(`config returned from db => %o`, config);

	if(config === null) {
		return updateConfig(baseConfig);
	}

	return Promise.resolve(config);

}).then(config => {

	debug(`config before file write => %o`, config);

	let fileContents = [
		`ALLOW_ERROR_TRACKING=${config.ALLOW_ERROR_TRACKING}`,
		`ROLLBAR_AUTH_TOKEN=${config.ROLLBAR_AUTH_TOKEN}`,
		`USE_IS_FATAL_FILTER=${config.USE_IS_FATAL_FILTER}`
	];
	
	fs.writeFileSync(envPath, fileContents.join('\n'), 'utf8');

});

function askToAllowErrorTracking(env) {

	let key = 'ALLOW_ERROR_TRACKING';

	//If the user answered true last install to allow error tracking, don't ask them again.
	if(key in process.env && process.env[key] === true) {
		return Promise.resolve(process.env[key]);
	}

	return inquirer.prompt([{
		type: 'list',
		name: key,
		message: `Do you want to allow simple-vf to collect errors and anonymous usage statistics? This can be changed any time using the ${chalk.bold.cyan('\`svf config\`')} command.`,
		choices: [
			{ name: 'yes (recommended)', value: true },
			{ name: 'no', value: false }
		]
	}]).then(answers => Promise.resolve(answers[key]));
}

function updateConfig(config: Config) {

	let mergedConfig = Object.assign(config, {
		_id: 'config'
	});

	return db.put(mergedConfig).then(putResult => {
		debug(`db postResult => %o`, putResult);
		return db.getWithDefault('config');
	});

}