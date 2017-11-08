const path = require('path');
const fs = require('fs-extra');
const inquirer = require('inquirer');
const chalk = require('chalk');
const debug = require('debug')('svf:info install');

import { appSettingsLocation } from './paths';
import db from './db';
import { Config, getRollbarAuthToken } from './models/config';
import { askToAllowErrorTracking } from './cli';

fs.ensureDirSync(appSettingsLocation);
let envPath = path.join(appSettingsLocation, '.env');

async function setup() {

	let [ config, rollbarAuthToken ] = await Promise.all([
		await db.getWithDefault('config', new Config()),
		getRollbarAuthToken()
	]);

	debug(`config returned from db => %o`, config);
	debug(`rollbar auth token => %o`, rollbarAuthToken);

	config.ALLOW_ERROR_TRACKING = await askToAllowErrorTracking(config);
	config.ROLLBAR_AUTH_TOKEN = rollbarAuthToken;

	config = await updateConfig(config);

	let fileContents = [
		`ALLOW_ERROR_TRACKING=${config.ALLOW_ERROR_TRACKING}`,
		`ROLLBAR_AUTH_TOKEN=${config.ROLLBAR_AUTH_TOKEN}`
	];
	
	await fs.writeFile(envPath, fileContents.join('\n'), 'utf8');
}

async function updateConfig(config: Config) : Promise<Config> {

	let mergedConfig = Object.assign(config, {
		_id: 'config'
	});

	debug(`config before db update => %o`, config);

	let updateResult = await db.put(mergedConfig);
	return db.getWithDefault('config');
}

setup();