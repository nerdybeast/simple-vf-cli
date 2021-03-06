import { appSettingsLocation } from './paths';
import db from './db';
import { Config, getRollbarAuthToken } from './models/config';
import { askToAllowErrorTracking } from './cli';
import { Debug } from './utilities/debug';
import * as fs from 'fs-extra';
import { join } from 'path';

const inquirer = require('inquirer');
const chalk = require('chalk');
const debug = new Debug('svf', 'install');
const appSettingsDir = appSettingsLocation();

fs.ensureDirSync(appSettingsDir);
let envPath = join(appSettingsDir, '.env');

async function setup() {

	let [ config, rollbarAuthToken ] = await Promise.all([
		await db.getWithDefault('config', new Config()),
		getRollbarAuthToken()
	]);

	debug.verbose(`config returned from db`, config);
	debug.verbose(`rollbar auth token`, rollbarAuthToken);

	config.ALLOW_ERROR_TRACKING = await askToAllowErrorTracking(config);
	config.ROLLBAR_AUTH_TOKEN = rollbarAuthToken;

	config = await updateConfig(config);

	let fileContents = [
		`ALLOW_ERROR_TRACKING=${config.ALLOW_ERROR_TRACKING}`,
		`ROLLBAR_AUTH_TOKEN=${config.ROLLBAR_AUTH_TOKEN}`
	];
	
	await fs.writeFile(envPath, fileContents.join('\n'));
}

async function updateConfig(config: Config) : Promise<Config> {

	let mergedConfig = Object.assign(config, {
		_id: 'config'
	});

	debug.verbose(`config before db update`, config);

	let updateResult = await db.put(mergedConfig);
	return db.getWithDefault('config');
}

setup();