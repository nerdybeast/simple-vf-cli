const inquirer = require('inquirer');
const _ = require('lodash');
const chalk = require('chalk');
const fs = require('fs-extra');
const debug = require('debug')('svf:info cli');

import db from './db';
import m from './message';
import { Org } from './models/org';
import { Page } from './models/page';
import { PageConfig } from './interfaces/page-config';

function validateInput(userInput: string, errorMessage: string = 'Please enter a value') : boolean|string {
	userInput = (userInput || '').trim();
	let isValid = userInput.length > 0;
	return isValid || errorMessage;
}

async function ask(config) {

	let answers = await _base(config);
	debug(`${config.name} question answer => %o`, answers);

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

let questions = {
	outputDir: {
		type: 'input',
		name: 'outputDir',
		message: 'Output directory for your localhost resource (ex: c:/projects/your-app/dist):'
	}
};

let Question = {
	basicInput: function(options) {
		return {
			type: 'input',
			name: options.name || 'input',
			message: options.message
		};
	}
};

function _base(questions) {
	if(!Array.isArray(questions)) questions = [questions];
	return inquirer.prompt(questions);
}

/**
 * @description Returns the same string passed in otherwise, prompts the user to enter a new page name.
 * @returns {string}
 */
function _resolvePageName(pageName) {
	
	if(pageName) { return Promise.resolve(pageName); }

	let pageNameQuestion = Question.basicInput({
		message: 'Please enter the new VisualForce page name:'
	});

	return _base([pageNameQuestion]).then(answers => {
		return Promise.resolve(answers.input);
	});
}

function _resolveOutputDirectory(outputDir?: string) {

	if(outputDir) {
		
		return fs.stat(outputDir).then(() => {
			return Promise.resolve(outputDir);
		}).catch(() => {

			return _base([{
				type: 'confirm',
				name: 'confirmOutputDir',
				message: `The output directory ${chalk.cyan(outputDir)} doesn\'t exist yet, continue anyway? Select "no" to re-enter the path to the build system ouput directory:`
			}]).then(answer => {

				debug(`confirm answer => %o`, answer);

				if(answer.confirmOutputDir) {
					return Promise.resolve(outputDir);
				}

				return _resolveOutputDirectory();
			});

		});

	}

	return _base([questions.outputDir]).then(answers => {
		return _resolveOutputDirectory(answers.outputDir);
	});
}
export function resolveOutputDirectory(outputDir: string) : Promise<string> {
	return _resolveOutputDirectory(outputDir);
}

export function askBasicInput(options: any) : Promise<any> {
	return _base([Question.basicInput(options)]);
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
export function orgSelection(userMessage: string = 'Choose an org:', includeNewChoice: boolean = true) : Promise<Org> {
	
	debug(`orgSelection() userMessage => ${userMessage}`);

	return db.find({
		selector: { type: 'auth' }
	}).then(searchResult => {

		let orgs = _.map(searchResult.docs, (doc) => {
			return {
				name: `${doc._id} (${doc.username})`,
				value: doc
			};
		});

		if(includeNewChoice) {
			orgs.push({
				name: 'other',
				value: null
			});
		}

		if(orgs.length === 0) {
			return Promise.resolve(null);
		}

		return _base([{
			type: 'list',
			name: 'orgChoice',
			message: userMessage,
			choices: orgs
		}]).then(answers => {
			return answers.orgChoice;
		});

	});

}

/**
 * Returns a page object for the given org.
 */
export function getPageSelectionByOrg(org: Org, allowOther: boolean = true) : Promise<Page> {

	let selector = { type: 'page', belongsTo: undefined };

	if(org) {
		selector.belongsTo = org._id;
	}

	return db.find({ selector }).then(queryResult => {

		debug(`page queryResult => %o`, queryResult);

		let pages = _.map(queryResult.docs, (doc) => {
			return {
				name: `${doc.name} (${doc.port} | ${doc.outputDir})`,
				value: doc
			};
		});

		if(allowOther) {
			pages.push({
				name: 'other',
				value: null
			});
		}

		return _base([{
			type: 'list',
			name: 'pageChoice',
			message: 'Choose a page:',
			choices: pages
		}]);

	}).then(answers => {
		return answers.pageChoice;
	});
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
	return _base([{
		type: 'input',
		name: 'stopTunnel',
		message: `Hit 'enter' to stop development mode or type ${chalk.cyan('deploy')} and hit 'enter' to stop development mode and immediately deploy your app:`
	}]).then(answers => {
		return Promise.resolve(answers.stopTunnel);
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