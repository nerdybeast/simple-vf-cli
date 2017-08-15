const inquirer = require('inquirer');
const _ = require('lodash');
const chalk = require('chalk');
const Bluebird = require('bluebird');
const fs = Bluebird.promisifyAll(require('fs-extra'));
const debug = require('debug')('svf:info cli');

import db from './db';
import m from './message';
import Org from './models/org';

let questions = {
	
	username(username) {
		
		let suffix = username ? ` (default: ${chalk.cyan(username)})` : '';

		return {
			type: 'input',
			name: 'username',
			message: `Username${suffix}:`
		};
	},

	password: {
		type: 'password',
		name: 'password',
		message: 'Password:'
	},

	getSecurityToken(questionVerbage: string = 'Security Token', securityToken?: string) {

		let suffix = securityToken ? ` (default: ${chalk.cyan(securityToken)})` : ' (hit enter to bypass)';

		return {
			type: 'input',
			name: 'securityToken',
			message: `${questionVerbage}${suffix}:`
		};
	},

	port: {
		type: 'input',
		name: 'port',
		message: 'Port that your localhost resource runs on (ex: 8080):'
	},
	outputDir: {
		type: 'input',
		name: 'outputDir',
		message: 'Output directory for your localhost resource (ex: c:/projects/your-app/dist):'
	},
	vfPageName: {
		type: 'input',
		name: 'page',
		message: 'Name of the visualforce page you\'re working on:'
	},
	orgName: {
		type: 'input',
		name: 'orgName',
		message: 'Please enter the name of the org (can be a simple alias):'
	},
	deleteDatabase: {
		type: 'confirm',
		name: 'deleteDatabase',
		message: 'Are you sure you want to delete all org and page entries?'
	},
	orgType: {
		type: 'list',
		name: 'orgType',
		message: 'Please select the type of org:',
		choices: [{
			name: 'sandbox',
			value: 'https://test.salesforce.com'
		}, {
			name: 'production',
			value: 'https://login.salesforce.com'
		}]
	},
	plugin: {
		type: 'list',
		name: 'plugin',
		message: 'Build system:',
		choices: [{
			name: 'ember-cli',
			value: {
				name: '@svf/plugin-ember-cli',
				
			}
		}, {
			name: 'other',
			value: null
		}]
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
		
		return fs.statAsync(outputDir).then(() => {
			return Promise.resolve(outputDir);
		}).catch(() => {

			return _base([{
				type: 'confirm',
				name: 'confirmOutputDir',
				message: `The output directory ${chalk.cyan(outputDir)} doesn\'t exist, continue?`
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

/**
 * Asks the user to enter a new org name.
 */
export function getOrgName() : Promise<string> {
	return _base([questions.orgName]).then(answers => {
		return answers.orgName;
	});
}

export function getOrgCredentials(org?: Org) : Promise<string[]> {
	
	debug(`getOrgCredentials() => org: %o`, org);

	let questionsToAsk = [];

	if(!org) questionsToAsk.push(questions.orgType);

	//Initialize this parameter to an object to help avoid null reference errors.
	org = org || new Org();

	let usernameQ = questions.username(org.username);
	questionsToAsk.push(usernameQ);

	questionsToAsk.push(questions.password);

	let securityTokenQ = questions.getSecurityToken(undefined, org.securityToken);
	questionsToAsk.push(securityTokenQ);

	return _base(questionsToAsk).then(answers => {
		
		debug(`getOrgCredentials() => answers: %o`, answers);

		answers.orgType = answers.orgType || org.loginUrl;

		//Will use these stored values, otherwise will use what the user has entered.
		answers[usernameQ.name] = answers[usernameQ.name] || org.username;
		answers[securityTokenQ.name] = answers[securityTokenQ.name].trim() || (org.securityToken || '');
		
		return answers;
	});
}

export function getNgrokTunnelDetails() : Promise<any> {
	return _base([questions.port, questions.vfPageName]);
}

/**
 * Asks the user to select an authed org.
 */
export function orgSelection(includeNewChoice: boolean = true) : Promise<Org> {
	
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
			message: 'Choose an org:',
			choices: orgs
		}]).then(answers => {
			return answers.orgChoice;
		});

	});

}

/**
 * Returns a page object for the given org.
 */
export function getPageSelectionByOrg(org: Org, allowOther: boolean = true) {

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

export function resolvePageName(pageName: string) : Promise<string> {
	return _resolvePageName(pageName);
}

export function getPageDetails(pageName: string) : Promise<any> {
	
	let port;

	return _resolvePageName(pageName).then(resolvedPageName => {

		pageName = resolvedPageName;

		return _base([questions.port]);

	}).then(answers => {

		port = answers.port;
		return _resolveOutputDirectory();

	}).then(outputDir => {

		return Promise.resolve({ pageName, port, outputDir });

	});
	
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

export function deleteDatabase() : Promise<boolean> {
	return _base([questions.deleteDatabase]).then(answers => Promise.resolve(answers.deleteDatabase));
}

export function getSecurityToken(questionVerbage: string) : Promise<string> {
	
	m.stop();

	return _base([questions.getSecurityToken(questionVerbage)]).then(answers => {
		m.start();
		return Promise.resolve(answers.securityToken);
	});
}

export function getBuildSystem() : Promise<string> {
	return _base([questions.plugin]).then(answers => Promise.resolve(answers.plugin));
}