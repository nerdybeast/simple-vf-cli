const inquirer = require('inquirer');
const _ = require('lodash');
const chalk = require('chalk');
const fs = require('fs-extra');
const debug = require('debug')('svf:info cli');
const path = require('path');

import db from './db';
import m, { Message } from './message';
import { Org } from './models/org';
import { Page } from './models/page';
import { Config } from './models/config';
import { PageConfig } from './interfaces/page-config';

function validateInput(userInput: string, errorMessage: string = 'Please enter a value') : boolean|string {
	userInput = (userInput || '').trim();
	let isValid = userInput.length > 0;
	return isValid || errorMessage;
}

async function ask(config) {

	let answers = await _base(config);
	debug(`${config.name} question raw answer => %o`, answers);

	return answers[config.name];
}

async function askUsername(username?: string) : Promise<string> {

	let config: any = {
		type: 'input',
		name: 'username',
		message: `Username:`,
		default: username,
		validate(userInput) { return validateInput(userInput, 'Username must contain a value'); }
	};

	return ask(config);
}

async function askPassword() {

	let config: any = {
		type: 'password',
		name: 'password',
		message: 'Password:',
		validate(userInput) { return validateInput(userInput, 'Password must contain a value'); }
	}

	return ask(config);
}

async function askSecurityToken(questionVerbage: string = 'Security Token', securityToken?: string) {
	
	//Inquirer.js treats an empty string as a legit default value so we need to force to undefined to avoid extra parenthesis in the user's output,
	//we need to avoid the output looking like this: "Security Token (hit enter to bypass): ()"
	if(!securityToken) securityToken = undefined;

	let suffix = securityToken ? `` : ' (hit enter to bypass)';

	let config: any = {
		type: 'input',
		name: 'securityToken',
		message: `${questionVerbage}${suffix}:`,
		default: securityToken
	};

	return ask(config);
}

async function askOrgType(orgType?: string) {

	let config = {
		type: 'list',
		name: 'orgType',
		message: 'Please select the type of org:',
		default: orgType,
		choices: [{
			name: 'sandbox',
			value: 'https://test.salesforce.com'
		}, {
			name: 'production',
			value: 'https://login.salesforce.com'
		}]
	};

	return ask(config);
}

async function askPort(portNumber?: number) {
	
	let suffix = portNumber ? `(default: ${chalk.cyan(portNumber)})` : `(example: 8080)`;

	let config = {
		type: 'input',
		name: 'port',
		message: `Port your local build system serves up on ${suffix}, value must be a number:`,
		default: portNumber,
		validate(userInput) {
			userInput = (userInput || '').trim();
			let hasValue = (userInput && userInput.length > 0);
			if(!hasValue) return 'Please enter a port number';
			if(!Number.isInteger(Number(userInput))) return 'Port must contain numbers only';
			return true;
		}
	};

	return ask(config);
}

async function askPageName() {

	let config = {
		type: 'input',
		name: 'page',
		message: 'Name of the visualforce page you\'re working on:'
	};

	return ask(config);
}

async function askOrgName(orgName?: string, questionVerbage?: string) {
	
	let config = {
		type: 'input',
		name: 'orgName',
		message: questionVerbage || `Please enter a name to act as an alias for this org:`,
		default: orgName,
		validate(userInput) { return validateInput(userInput, 'Org name must contain a value'); }
	};

	return ask(config);
}

async function askPlugin() {
	
	let config = {
		type: 'list',
		name: 'plugin',
		message: 'Build system:',
		choices: [{
			name: 'ember-cli',
			value: '@svf/plugin-ember-cli'
		}, {
			name: 'other',
			value: 'default'
		}]
	};

	return ask(config);
}

async function askDeleteDatabase() {

	let config = {
		type: 'confirm',
		name: 'deleteDatabase',
		message: 'Are you sure you want to delete all org and page entries?'
	};

	return ask(config);
}

async function askOutputDir() {
	
	let config = {
		type: 'input',
		name: 'outputDir',
		message: 'Output directory for your localhost resource (ex: c:/projects/your-app/dist):',
		validate(userInput) {
			
			let errors = [];

			let validatedInput = validateInput(userInput, 'output directory must contain a value');
			if(typeof validatedInput === 'string') errors.push(validatedInput);
			if(!path.isAbsolute(userInput)) errors.push(`path must be entered as an absolute value (example: c:/path/to/output/directory)`);

			return errors.length === 0 || `Error: ${errors.join(', ')}.`;
		}
	};

	let outputDir = await ask(config);
	return path.normalize(outputDir);
}

function _base(questions) {
	if(!Array.isArray(questions)) questions = [questions];
	return inquirer.prompt(questions);
}

/**
 * @description Returns the same string passed in otherwise, prompts the user to enter a new page name.
 * @returns {string}
 */
async function _resolvePageName(pageName) {
	
	if(pageName) pageName;

	return ask({
		type: 'input',
		name: 'pageName',
		message: 'Please enter the new VisualForce page name:'
	});
}

async function _resolveOutputDirectory(outputDir?: string) {

	if(outputDir) {
		
		try {
			
			await fs.stat(outputDir);
			return outputDir;

		} catch (error) {
			
			console.log();
			Message.warn(`The output directory ${chalk.cyan(outputDir)} doesn\'t exist yet!`);
			console.log();

			let confirmOutputDir = await ask({
				type: 'list',
				name: 'confirmOutputDir',
				message: `Choose, "Yes" to keep ${chalk.cyan(outputDir)}, choose "No" to re-enter the ouput directory path:`,
				default: false,
				choices: [{
					name: 'Yes',
					value: true
				}, {
					name: 'No',
					value: false
				}]
			});

			if(confirmOutputDir) return outputDir;

			return _resolveOutputDirectory();
		}
	}

	let chosenOutputDir = await askOutputDir();
	return _resolveOutputDirectory(chosenOutputDir);
}

export async function askToAllowErrorTracking(config: Config) : Promise<boolean> {

	//If the user answered true last install to allow error tracking, don't ask them again.
	if(config.ALLOW_ERROR_TRACKING) { return config.ALLOW_ERROR_TRACKING; }

	return ask({
		type: 'list',
		name: 'allowErrorTracking',
		message: `Do you want to allow simple-vf to collect errors and anonymous usage statistics? This can be changed any time using the ${chalk.bold.cyan('\`svf config\`')} command.`,
		choices: [
			{ name: 'yes (recommended)', value: true },
			{ name: 'no', value: false }
		]
	});
}

export async function getOrgCredentials(org?: Org) : Promise<any> {
	
	debug(`getOrgCredentials() => org: %o`, org);

	//Initialize this parameter to an object to help avoid null reference errors.
	org = org || new Org();

	let orgType = await askOrgType(org.loginUrl);
	let username = await askUsername(org.username);
	let password = await askPassword();
	let securityToken = await askSecurityToken(undefined, org.securityToken)

	let credentials = { orgType, username, password, securityToken };
	debug(`getOrgCredentials() => %o`, credentials);

	return credentials;
}

/**
 * Asks the user to select an authed org.
 */
export async function orgSelection(userMessage: string = 'Choose an org:', includeNewChoice: boolean = true) : Promise<Org> {

	try {
		
		let orgs = await db.getAllOrgs();

		if(orgs.length === 0) return null;

		let choices = _.map(orgs, (org) => {
			return {
				name: `${org._id} (${org.username})`,
				value: org
			};
		});

		if(includeNewChoice) {
			choices.push({
				name: 'other',
				value: null
			});
		}

		return await ask({
			type: 'list',
			name: 'orgChoice',
			message: userMessage,
			choices
		});

	} catch (error) {
		debug(`error with org selection list => %o`, error);
		throw error;
	}
}

/**
 * Returns a page object for the given org.
 */
export async function getPageSelectionByOrg(org: Org, allowOther: boolean = true) : Promise<Page> {

	try {
		
		let pages = await db.getAllPages(org._id);

		let choices = _.map(pages, (page) => {
			return {
				name: `${page.name} (${page.port} | ${page.outputDir})`,
				value: page
			};
		});

		if(allowOther) {
			choices.push({
				name: 'other',
				value: null
			});
		}

		return await ask({
			type: 'list',
			name: 'pageChoice',
			message: 'Choose a page:',
			choices
		});

	} catch (error) {
		debug(`get page by org error => %o`, error);
		throw error;
	}
}

/**
 * Retrieves the page config details like name, port, output directory. This method is used by the default plugin.
 */
export async function getPageDetails(pageName: string) : Promise<PageConfig> {
	
	let name = await _resolvePageName(pageName);
	let port = await askPort();
	let outputDirectory = await _resolveOutputDirectory();

	return { name, port, outputDirectory };
}

export function manageTunnel() : Promise<string> {
	return ask({
		type: 'input',
		name: 'stopTunnel',
		message: `Hit 'enter' to stop development mode or type ${chalk.cyan('deploy')} and hit 'enter' to stop development mode and immediately deploy your app:`
	});
}

export async function deleteDatabase() : Promise<boolean> {
	return await askDeleteDatabase();
}

export async function getSecurityToken(questionVerbage: string) : Promise<string> {
	m.stop();
	let securityToken = await askSecurityToken(questionVerbage);
	m.start();
	return securityToken;
}

export async function getBuildSystem() : Promise<string> {
	return await askPlugin();
}

export async function getOrgName(orgName?: string) : Promise<string> {
	return await askOrgName(orgName);
}