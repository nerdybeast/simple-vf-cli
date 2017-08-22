const jsforce = require('jsforce');
const chalk = require('chalk');
const cryptoJs = require('crypto-js');
const _ = require('lodash');
const debug = require('debug')('svf:info flow');

import * as Bluebird from 'bluebird';
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
import { determineBuildSystem, getPluginModule } from './plugins';

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

		// return _resolveOrgName(orgName, 'Choose which org to authenticate with:', allowOtherOption).then(resolvedOrgName => {
			
		// 	//Will be "truthy" if the user supplied an org name with the auth command (ex: `svf auth myOrg`)
		// 	//or they chose an existing org name from the list of already authed orgs.
		// 	if(resolvedOrgName) {
		// 		return Promise.resolve(resolvedOrgName);
		// 	}

		// 	//Will prompt the user to enter the new org name. Reaching this point means the user did not enter
		// 	//an org name with the auth command and they chose the "other" option when selecting from the list
		// 	//of already authed orgs.
		// 	return cli.getOrgName();

		// })
		return cli.resolveOrgName(orgName).then(selectedOrgName => {

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

		return _resolveOrgName(orgName, 'Choose destination org for the new Visualforce page:', true).then(resolvedOrgName => {

			return _validateIfOrgIsAuthed(resolvedOrgName);

		}).then(resolvedOrg => {

			org = resolvedOrg;
			return _resolvePageName(pageName);

		}).then(async resolvedPageName => {

			let pluginName = await determineBuildSystem();

			pageName = resolvedPageName;
			return _resolveVisualforcePage(pageName, org, pluginName);

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
		return _resolveOrgName(orgName, undefined, true).then(resolvedOrgName => {
			
			//Will make sure that the org is authed.
			return _validateIfOrgIsAuthed(resolvedOrgName);

		}).then(resolvedOrg => {

			org = resolvedOrg;
			return cli.getPageSelectionByOrg(org, true);

		}).then(pageSelection => {

			if(!pageSelection) {
				return newPage(null, org);
			}

			return Promise.resolve(pageSelection);

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
					return Promise.resolve('Delete successful.');
				});
			}

			return Promise.resolve('Delete cancelled.');

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

		return cli.orgSelection(undefined, false).then(orgChoice => {

			org = orgChoice;
			return cli.getPageSelectionByOrg(org, false);

		}).then(page => {

			return deploy(org, page);

		}).then(result => {

			debug(`deploy result => %o`, result);
			return Promise.resolve(result);

		}).catch(err => {
			rollbar.exception(err, meta, () => m.catchError(err));
		});

	} catch(e) {
		rollbar.exception(e, meta, () => m.catchError(e));
	}
}

export async function list() {

	try {
	
		let [orgs, pages] = await Promise.all([db.getAllOrgs(), db.getAllPages()]);

		_.sortBy(orgs, ['name']).forEach(org => {
			
			let username = chalk.yellow(`(${org.username})`);
			console.log(`Org: ${org.name} ${username}`);

			pages = pages.filter(page => {
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
					console.log(`  > ${pageName} ${outputDir}`);
				} else {
					console.log(`  > ${page.name}`);
				}

			});
		});

	} catch (error) {
		return Promise.reject(error);
	}
}

/**
 * @description Prompts the user to enter an org name if one was not supplied.
 * @returns string
 */
function _resolveOrgName(orgName: string, userMessage?: string, allowOther?: boolean) : Promise<string> {
	
	debug(`_resolveOrgName() => orgName:`, orgName);
	debug(`_resolveOrgName() => allowOther:`, allowOther);

	//Will be true if the user did supply the org name with the command.
	if(orgName) { return Promise.resolve(orgName); }
	
	//Prompts the user to select an authed org or "other".
	return cli.orgSelection(userMessage, allowOther).then(selectedOrg => {
		
		//NOTE: "selectedOrg" will be null if the user chose the "other" option.
		return Promise.resolve(selectedOrg !== null ? selectedOrg.name : null);

	});
}

/**
 * @description Prompts the user to enter a page name if one was not supplied.
 * @returns string
 */
function _resolvePageName(pageName) {
	
	debug(`_resolvePageName() => pageName:`, pageName);

	//Will be true if the user did supply the page name with the command.
	if(pageName) { return Promise.resolve(pageName); }
	
	//Prompts the user to select an authed org or "other".
	return cli.resolvePageName(pageName).then(selectedPageName => {
		
		//NOTE: "selectedPageName" will be null if the user chose the "other" option.
		return Promise.resolve(selectedPageName);

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

		return Promise.resolve(org);

	}).catch(err => {
		m.fail(`Authentication to ${chalk.cyan(orgName)} failed.`);
		return Promise.reject(err);
	});

}

function _resolveVisualforcePage(pageName, org, pluginName) {

	debug(`_resolveVisualforcePage() => pageName:`, pageName);
	debug(`_resolveVisualforcePage() => org:`, org);

	let errors = [];
	if(!pageName) errors.push(`"pageName" parameter must contain a value (given: ${pageName})`);
	if(!org) errors.push(`"org" parameter must be an instance of an org object (given: ${org})`);
	if(errors.length > 0) return Promise.reject(new Error(`Errors occurred calling flow._resolveVisualforcePage => ${errors.join(', ')}.`));

	return db.find({
		selector: {
			name: pageName,
			belongsTo: org._id
		}
	}).then(async queryResult => {
		
		if(queryResult.docs.length > 0) {
			
			let doc = queryResult.docs[0];

			if(!doc.plugin) {
				doc.plugin = pluginName;
				doc = await db.update(doc);
			}

			return Promise.resolve(doc);
		}

		return Promise.resolve({
			name: pageName,
			pluginName
		});
	
	}).then(page => {

		return _resolvePageObject(page, org);

	});
}

async function _resolvePageObject(page, org) {
	
	debug(`_resolvePageObject() => page:`, page);
	debug(`_resolvePageObject() => org:`, org);

	if(page._id) return Promise.resolve(page);

	const plugin = await getPluginModule(page.pluginName);

	return plugin.pageConfig().then(pageConfig => {

		debug(`_resolvePageObject() => getPageDetails pageConfig:`, pageConfig);

		//TODO: Error handling if this page already exists under this org...
		return db.post({
			type: 'page',
			belongsTo: org._id,
			name: pageConfig.name,
			port: Number(pageConfig.port),
			outputDir: pageConfig.outputDirectory,
			staticResourceId: null,
			pluginName: page.pluginName
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
	if(errors.length > 0) return Promise.reject(new Error(`Errors occurred calling flow._deployNewPage => ${errors.join(', ')}.`));

	m.start(`Deploying new page ${chalk.cyan(page.name)}...`);

	let sf = new Salesforce(org);

	return sf.deployNewPage(page).then(pageId => {

		page.salesforceId = pageId;
		return db.update(page);

	}).then(updatedPage => {

		m.success(`Successfully created page ${chalk.cyan(page.name)} ${chalk.cyan(`(Id: ${updatedPage.salesforceId})`)}`);
		return Promise.resolve(updatedPage);

	}).catch(err => {

		debug(`_deployNewPage err => %o`, err);

		m.fail(`Failed to create page!`);
		return Promise.reject(err);

	});

}

async function _startTunnel(org, page) {

	debug(`_startTunnel() => org:`, org);
	debug(`_startTunnel() => page:`, page);
	
	m.start('Starting ngrok tunnel...')

	let sf = new Salesforce(org);
	let watcher = new Watcher(org, page);
	let ngrok = new Ngrok(page.port);
	
	try {

		let [url, customSettings] = await Promise.all([ngrok.connect(), sf.processCustomSettings()]);
		
		m.success(`Tunnel started at: ${chalk.cyan(url)}`);
	
		//Re-query the org in case the processCustomSettings() method updated the org credentials.
		org = await db.getWithDefault(org._id);
	
		await _togglePageSettings(org, page, url, true);
	
		watcher.start();
		let answer = (await cli.manageTunnel()) || '';
	
		let disconnectPromises = [
			ngrok.disconnectAsync(),
			_togglePageSettings(org, page, null, false)
		];
	
		if(answer.toLowerCase() === 'deploy') {
			disconnectPromises.push(deploy(org, page));
		}
	
		watcher.stop();
		await Promise.all(disconnectPromises);

	} catch (error) {
		
		ngrok.disconnect();
		watcher.stop();

		m.fail('Failed to establish tunnel');

		return Promise.reject(error);
	}
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
		return Promise.reject(err);
	});
}

function _validateIfOrgIsAuthed(orgName: string) : Promise<Org> {

	let meta = new ErrorMetadata('_validateIfOrgIsAuthed', { orgName });

	debug(`_validateIfOrgIsAuthed() => orgName:`, orgName);

	return db.getWithDefault(orgName).then(org => {

		//Will be true if this org does not yet exist in the database.
		if(!org) {
			
			return cli.resolveOrgName(orgName).then(selectedOrgName => {
				orgName = selectedOrgName;
				return _processAuth(orgName);
			});
		}

		return Promise.resolve(org);

	}).catch(err => {
		
		return rollbar.exceptionAsync(err, meta);

	});

}