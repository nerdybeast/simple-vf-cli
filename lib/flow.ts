const Bluebird = require('bluebird');
const jsforce = require('jsforce');
const chalk = require('chalk');
const cryptoJs = require('crypto-js');
const _ = require('lodash');
const debug = require('debug')('svf:info flow');

import db from './db';
import { default as rollbar } from './rollbar';
import ErrorMetadata from './models/error-metadata';
import Org from './models/org';
import * as cli from './cli';
import m from './message';
import Salesforce from './salesforce';
import Ngrok from './ngrok';
import Watcher from './watcher';
import deploy from './deploy';
import { determineBuildSystem } from './plugins';

export function auth(orgName, allowOtherOption) {

	let meta = new ErrorMetadata('auth', {
		orgName,
		
		//Calling this method from the command line passes the entire commander instance as the 2nd argument
		//into this function. If the second argument is not an object, that means we passed something in.
		allowOtherOption: typeof allowOtherOption !== 'object' ? allowOtherOption : undefined
	});

	try {

		debug(`auth() => orgName:${orgName}, allowOtherOption:${allowOtherOption}`);

		allowOtherOption = (typeof allowOtherOption === 'boolean') ? allowOtherOption : true;

		return _resolveOrgName(orgName, allowOtherOption).then(resolvedOrgName => {
			
			//Will be "truthy" if the user supplied an org name with the auth command (ex: `svf auth myOrg`)
			//or they chose an existing org name from the list of already authed orgs.
			if(resolvedOrgName) {
				return Bluebird.resolve(resolvedOrgName);
			}

			//Will prompt the user to enter the new org name. Reaching this point means the user did not enter
			//an org name with the auth command and they chose the "other" option when selecting from the list
			//of already authed orgs.
			return cli.getOrgName();

		}).then(selectedOrgName => {

			//Will execute a login request for the current org and save it to the database.
			return _processAuth(selectedOrgName);

		}).catch(err => {
			rollbar.exception(err, meta, () => m.catchError(err));
		});

	} catch(e) {
		rollbar.exception(e, meta, () => m.catchError(e));
	}
}

export function newPage(pageName, org) {

	let meta = new ErrorMetadata('newPage', { pageName, org });

	try {

		debug(`newPage() => pageName: %o`, pageName);
		debug(`newPage() => org: %o`, org);

		let orgName = (org && "_id" in org) ? org.name : null;

		return _resolveOrgName(orgName, true).then(resolvedOrgName => {

			return _validateIfOrgIsAuthed(resolvedOrgName);

		}).then(resolvedOrg => {

			org = resolvedOrg;
			return _resolvePageName(pageName);

		}).then(async resolvedPageName => {

			let plugin = await determineBuildSystem();

			pageName = resolvedPageName;
			return _resolveVisualforcePage(pageName, org);

		}).then(resolvedPage => {

			return _deployNewPage(org, resolvedPage);

		}).catch(err => {
			rollbar.exception(err, meta, () => m.catchError(err));
		});
	
	} catch(e) {
		rollbar.exception(e, meta, () => m.catchError(e));
	}
}

export function serve(orgName) {
	
	let meta = new ErrorMetadata('serve', { orgName });

	try {

		debug(`serve() => orgName:`, orgName);

		//Will hold the org object for the given org name.
		let org;

		//Will ask the user to enter an org name if they did not give one with the serve command.
		return _resolveOrgName(orgName, true).then(resolvedOrgName => {
			
			//Will make sure that the org is authed.
			return _validateIfOrgIsAuthed(resolvedOrgName);

		}).then(resolvedOrg => {

			org = resolvedOrg;
			return cli.getPageSelectionByOrg(org, true);

		}).then(pageSelection => {

			if(!pageSelection) {
				return newPage(null, org);
			}

			return Bluebird.resolve(pageSelection);

		}).then(resolvedPage => {

			return _resolvePageObject(resolvedPage, org);

		}).then(page => {

			return _startTunnel(org, page);

		}).catch(err => {
			rollbar.exception(err, meta, () => m.catchError(err));
		});

	} catch(e) {
		rollbar.exception(e, meta, () => m.catchError(e));
	}
}

export function deleteDatabase() {

	let meta = new ErrorMetadata('deleteDatabase');

	try {

		return cli.deleteDatabase().then(shouldDelete => {

			if(shouldDelete) {
				return db.destroy().then(destroyResult => {
					debug(`Database destroy result => %o`, destroyResult);
					return Bluebird.resolve('Delete successful.');
				});
			}

			return Bluebird.resolve('Delete cancelled.');

		}).then(deleteResult => {

			m.success(deleteResult);

		}).catch(err => {
			rollbar.exception(err, meta, () => m.catchError(err));
		});

	} catch(e) {
		rollbar.exception(e, meta, () => m.catchError(e));
	}
}

export function deployApp() {

	let meta = new ErrorMetadata('deployApp');

	try {

		let org;

		return cli.orgSelection(false).then(orgChoice => {

			org = orgChoice;
			return cli.getPageSelectionByOrg(org, false);

		}).then(page => {

			return deploy(org, page);

		}).then(result => {

			debug(`deploy result => %o`, result);
			return Bluebird.resolve(result);

		}).catch(err => {
			rollbar.exception(err, meta, () => m.catchError(err));
		});

	} catch(e) {
		rollbar.exception(e, meta, () => m.catchError(e));
	}
}

export function list() {

	Bluebird.props({
		orgs: db.getAllOrgs(),
		pages: db.getAllPages()
	}).then(hash => {

		_.sortBy(hash.orgs, ['name']).forEach(org => {

			let username = chalk.yellow(`(${org.username})`);
			console.log(`${org.name} ${username}`);

			let pages = hash.pages.filter(page => {
				return page.belongsTo === org._id;
			});

			if(pages.length === 0) {
				pages.push({ name: 'No pages found for this org' });
			}

			pages = _.sortBy(pages, ['name']);

			let padding = pages.reduce((prev, page) => {
				return page.name.length > prev ? page.name.length : prev;
			}, 0);
			
			_.sortBy(pages, ['name']).forEach(page => {

				if(page._id) {
					let pageName = chalk.cyan(_.padEnd(page.name, padding));
					let outputDir = chalk.cyan(` - ${page.outputDir}`);
					console.log(`  - ${pageName} ${outputDir}`);
				} else {
					console.log(`  - ${page.name}`);
				}

			});
		});

	});
}

/**
 * @description Prompts the user to enter an org name if one was not supplied.
 * @returns string
 */
function _resolveOrgName(orgName, allowOther) {
	
	debug(`_resolveOrgName() => orgName:`, orgName);
	debug(`_resolveOrgName() => allowOther:`, allowOther);

	//Will be true if the user did supply the org name with the command.
	if(orgName) { return Bluebird.resolve(orgName); }
	
	//Prompts the user to select an authed org or "other".
	return cli.orgSelection(allowOther).then(selectedOrg => {
		
		//NOTE: "selectedOrg" will be null if the user chose the "other" option.
		return Bluebird.resolve(selectedOrg !== null ? selectedOrg.name : null);

	});
}

/**
 * @description Prompts the user to enter a page name if one was not supplied.
 * @returns string
 */
function _resolvePageName(pageName) {
	
	debug(`_resolvePageName() => pageName:`, pageName);

	//Will be true if the user did supply the page name with the command.
	if(pageName) { return Bluebird.resolve(pageName); }
	
	//Prompts the user to select an authed org or "other".
	return cli.resolvePageName(pageName).then(selectedPageName => {
		
		//NOTE: "selectedPageName" will be null if the user chose the "other" option.
		return Bluebird.resolve(selectedPageName);

	});
}

/**
 * @description Logs the user into Salesforce and saves their auth credentials into the database.
 * @returns An auth object.
 */
function _processAuth(orgName) {

	debug(`_processAuth() => orgName:`, orgName);

	//Will hold the jsforce connection details.
	let conn;

	//Will hold the auth object for the newly authed org.
	let org = new Org();

	//Will hold the userInfo about the current jsforce connection.
	let userInfo;

	//Will hold the user's username & password.
	let credentials;

	return db.getWithDefault(orgName).then(doc => {

		//Prompt the user for their username & password;
		return cli.getOrgCredentials(doc);

	}).then(answers => {

		credentials = answers;
		conn = new jsforce.Connection({ loginUrl: credentials.orgType });

		let password = credentials.password;
		
		if(credentials.securityToken) {
			password += credentials.securityToken;
		}

		m.start('Authenticating into org...');

		return Bluebird.props({
			loginResult: conn.login(credentials.username, password),
			encryptionKey: db.getEncryptionKey()
		});

	}).then(hash => {

		debug(`login() result => %o`, hash.loginResult);
		m.success(`Successfully authenticated: ${chalk.cyan(conn.instanceUrl)}`);

		org.loginUrl = credentials.orgType;
		org.instanceUrl = conn.instanceUrl;
		org.username = credentials.username;
		org.password = cryptoJs.AES.encrypt(credentials.password, hash.encryptionKey).toString();
		org.securityToken = credentials.securityToken;
		org.userId = hash.loginResult.id;
		org.orgId = hash.loginResult.organizationId;
		org.accessToken = conn.accessToken;
		org.name = orgName;
		org._id = orgName;

		return db.update(org);

	}).then(() => {

		return Bluebird.resolve(org);

	}).catch(err => {
		m.fail(`Authentication to ${chalk.cyan(orgName)} failed.`);
		return Bluebird.reject(err);
	});

}

function _resolveVisualforcePage(pageName, org) {

	debug(`_resolveVisualforcePage() => pageName:`, pageName);
	debug(`_resolveVisualforcePage() => org:`, org);

	let errors = [];
	if(!pageName) errors.push(`"pageName" parameter must contain a value (given: ${pageName})`);
	if(!org) errors.push(`"org" parameter must be an instance of an org object (given: ${org})`);
	if(errors.length > 0) return Bluebird.reject(new Error(`Errors occurred calling flow._resolveVisualforcePage => ${errors.join(', ')}.`));

	return db.find({
		selector: {
			name: pageName,
			belongsTo: org._id
		}
	}).then(queryResult => {
		
		let doc = queryResult.docs.length > 0 ? queryResult.docs[0] : null;
		return Bluebird.resolve(doc);
	
	}).then(page => {

		page = page || { name: pageName };
		return _resolvePageObject(page, org);

	});
}

function _resolvePageObject(page, org) {
	
	debug(`_resolvePageObject() => page:`, page);
	debug(`_resolvePageObject() => org:`, org);

	if(page._id) return Bluebird.resolve(page);

	return cli.getPageDetails(page.name).then(answers => {

		debug(`_resolvePageObject() => getPageDetails answers:`, answers);

		//TODO: Error handling if this page already exists under this org...
		return db.post({
			type: 'page',
			belongsTo: org._id,
			name: answers.pageName,
			port: Number(answers.port),
			outputDir: answers.outputDir,
			staticResourceId: null
		});

	}).then(postResult => {

		debug(`_resolvePageObject() => postResult:`, postResult);
		return db.getWithDefault(postResult.id);

	});

}

function _deployNewPage(org, page) {

	debug(`_deployNewPage() => org:`, org);
	debug(`_deployNewPage() => page:`, page);
	
	let errors = [];
	if(!org) errors.push(`"org" parameter must contain a value (given: ${org})`);
	if(!page) errors.push(`"page" parameter must contain a value (given: ${page})`);
	if(errors.length > 0) return Bluebird.reject(new Error(`Errors occurred calling flow._deployNewPage => ${errors.join(', ')}.`));

	m.start(`Deploying new page ${chalk.cyan(page.name)}...`);

	let sf = new Salesforce(org);
	return sf.deployNewPage(page).then(pageId => {

		page.salesforceId = pageId;
		return db.update(page);

	}).then(updatedPage => {

		m.success(`Successfully created page ${chalk.cyan(page.name)} ${chalk.cyan(`(Id: ${updatedPage.salesforceId})`)}`);
		return Bluebird.resolve(updatedPage);

	}).catch(err => {

		debug(`_deployNewPage err => %o`, err);

		m.fail(`Failed to create page!`);
		return Bluebird.reject(err);

	});

}

function _startTunnel(org, page) {

	debug(`_startTunnel() => org:`, org);
	debug(`_startTunnel() => page:`, page);
	
	m.start('Starting ngrok tunnel...')

	let sf = new Salesforce(org);
	let watcher = new Watcher(page.outputDir);
	let ngrok = new Ngrok(page.port);
	let url;

	return Bluebird.props({
		url: ngrok.connect(),
		customSettings: sf.processCustomSettings()
	}).then(hash => {
		
		url = hash.url;

		m.success(`Tunnel started at: ${chalk.cyan(url)}`);

		//Re-query the org in case the processCustomSettings() method updated the org credentials.
		return db.getWithDefault(org._id);

	}).then(fetchedOrg => {

		org = fetchedOrg;
		return _togglePageSettings(org, page, url, true);

	}).then(() => {

		watcher.start();
		return cli.manageTunnel();

	}).then(answer => {
		
		answer = answer || '';

		let promiseHash = {
			deployPromise: null,
			disconnectPromise: ngrok.disconnectAsync(),
			settingsPromise: _togglePageSettings(org, page, null, false)
		};

		if(answer.toLowerCase() === 'deploy') {
			promiseHash.deployPromise = deploy(org, page);
		}

		watcher.stop();
		return Bluebird.props(promiseHash);

	}).catch(err => {

		ngrok.disconnect();
		watcher.stop();

		m.fail('Failed to establish tunnel');
		
		return Bluebird.reject(err);
	});
}

function _togglePageSettings(org, page, url, developmentMode) {
	
	let METHOD_NAME = '_togglePageSettings()';
	debug(`${METHOD_NAME} => page: %o`, page);
	debug(`${METHOD_NAME} => org: %o`, org);
	debug(`${METHOD_NAME} => url: %o`, url);
	debug(`${METHOD_NAME} => developmentMode: %o`, developmentMode);

	m.start(`${developmentMode ? 'Enabling' : 'Disabling'} development mode in ${chalk.cyan(org.name)}...`);

	let sf = new Salesforce(org);
	return sf.updateSetting(page.name, url, developmentMode).then(updateResult => {

		if(updateResult.pageConfigPromise.success) {
			m.success(`Development mode ${developmentMode ? 'enabled' : 'disabled'} for page ${chalk.cyan(page.name)}`);
		} else {
			m.fail(`Failed to ${developmentMode ? 'enable' : 'disable'} development mode for page ${chalk.cyan(page.name)}`);
		}

	}).catch(err => {
		m.fail(`An error occurred communicating with ${chalk.cyan(org.name)}`);
		return Bluebird.reject(err);
	});
}

function _validateIfOrgIsAuthed(orgName) {

	let meta = new ErrorMetadata('_validateIfOrgIsAuthed', { orgName });

	debug(`_validateIfOrgIsAuthed() => orgName:`, orgName);

	return db.getWithDefault(orgName).then(org => {

		//Will be true if this org does not yet exist in the database.
		if(!org) {
			
			return cli.getOrgName().then(selectedOrgName => {
				orgName = selectedOrgName;
				return _processAuth(orgName);
			});
		}

		return Bluebird.resolve(org);

	}).catch(err => {
		
		return rollbar.exceptionAsync(err, meta);

	});

}