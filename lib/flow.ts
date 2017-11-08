const jsforce = require('jsforce');
const chalk = require('chalk');
const cryptoJs = require('crypto-js');
const _ = require('lodash');
const debug = require('debug')('svf:info flow');

import db from './db';
import errorReporter from './error-reporter';
import { ErrorMetadata } from './models/error-metadata';
import { Org } from './models/org';
import { Page } from './models/page';
import * as cli from './cli';
import m from './message';
import { Salesforce } from './salesforce';
import Ngrok from './ngrok';
import Watcher from './watcher';
import deploy from './deploy';
import { determineBuildSystem, getPluginModule } from './plugins';
import processAuth from './logic/process-auth';

export async function auth() : Promise<Org> {
	
	let meta = new ErrorMetadata('auth');

	try {
		
		let orgName = await _resolveOrgName(undefined, 'Choose which org to authenticate with:', true);
		return await processAuth(orgName);

	} catch (error) {
		handleError(error, meta);
	}

}

export async function newPage(org?: Org) {

	let meta = new ErrorMetadata('newPage', { org });

	try {

		let orgName = (org && "_id" in org) ? org.name : undefined;
		let chosenOrgName = await _resolveOrgName(orgName, 'Choose destination org for the new Visualforce page:', true);
		
		org = await _validateIfOrgIsAuthed(chosenOrgName);

		let pluginName = await determineBuildSystem();
		let page = await _resolvePageObject(pluginName, org);

		return await _deployNewPage(org, page);

	} catch(error) {
		handleError(error, meta);
	}

}

export async function serve() : Promise<void> {
	
	let meta = new ErrorMetadata('serve');

	try {

		let orgName = await _resolveOrgName(undefined, undefined, true);
		let org = await _validateIfOrgIsAuthed(orgName);
		let page = await cli.getPageSelectionByOrg(org, true);

		if(!page) {
			page = await newPage(org);
		}

		await _startTunnel(org, page);

	} catch(error) {
		handleError(error, meta);
	}

}

export async function deleteDatabase() : Promise<void> {

	let meta = new ErrorMetadata('deleteDatabase');

	try {

		let shouldDelete = await cli.deleteDatabase();

		if(!shouldDelete) {
			m.success('Delete cancelled');
			return;
		}

		let destroyResult = await db.destroy();
		debug(`Database destroy result => %o`, destroyResult);

		m.success('Delete successful');

	} catch(error) {
		handleError(error, meta);
	}
}

export async function deployApp() : Promise<void> {

	let meta = new ErrorMetadata('deployApp');

	try {

		let org = await cli.orgSelection('Choose which org to deploy to', false);
		let page = await cli.getPageSelectionByOrg(org, false);
		let deployResult = await deploy(org, page);

	} catch(error) {
		handleError(error, meta);
	}
}

export async function list() {

	let meta = new ErrorMetadata('list');

	try {
	
		let [orgs, pages] = await Promise.all([
			<Org[]>db.getAllOrgs(), 
			<Page[]>db.getAllPages()
		]);

		_.sortBy(orgs, ['name']).forEach(org => {
			
			let username = chalk.yellow(`(${org.username})`);
			console.log(`Org: ${org.name} ${username}`);

			let currentOrgPages = pages.filter(page => {
				return page.belongsTo === org._id;
			});

			if(currentOrgPages.length === 0) {
				let defaultPage = new Page();
				defaultPage.name = 'No pages found for this org';
				currentOrgPages.push(defaultPage);
			}

			let padding = currentOrgPages.reduce((prev, page) => {
				return page.name.length > prev ? page.name.length : prev;
			}, 0);
			
			_.sortBy(currentOrgPages, ['name']).forEach(page => {

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
		handleError(error, meta);
	}
}

async function handleError(error: any, meta: ErrorMetadata) : Promise<void> {
	await errorReporter.error(error, meta);
	m.catchError(error);
}

/**
 * @description Prompts the user to enter an org name if one was not supplied.
 */
async function _resolveOrgName(orgName: string, userMessage?: string, allowOther?: boolean) : Promise<string> {
	
	debug(`_resolveOrgName() => orgName:`, orgName);
	debug(`_resolveOrgName() => allowOther:`, allowOther);

	if(orgName) return orgName;

	let selectedOrg = await cli.orgSelection(userMessage, allowOther);

	if(selectedOrg) return selectedOrg.name;

	return await cli.getOrgName();
}

async function _resolvePageObject(pluginName: string, org: Org) : Promise<Page> {
	
	debug(`_resolvePageObject() => pluginName:`, pluginName);
	debug(`_resolvePageObject() => org:`, org);

	let plugin = await getPluginModule(pluginName);
	let pageConfig = await plugin.pageConfig();

	let page = new Page();
	page.name = pageConfig.name;
	page.belongsTo = org._id;
	page.port = Number(pageConfig.port);
	page.outputDir = pageConfig.outputDirectory;
	page.pluginName = pluginName;

	let postResult = await db.post(page);
	debug(`_resolvePageObject() => postResult:`, postResult);

	let result = await db.getWithDefault(postResult.id);
	debug(`_resolvePageObject() => result:`, postResult);

	return result;
}

async function _deployNewPage(org: Org, page: Page) {

	debug(`_deployNewPage() => org:`, org);
	debug(`_deployNewPage() => page:`, page);

	m.start(`Deploying new page ${chalk.cyan(page.name)}...`);

	try {

		let sf = new Salesforce(org);
		let pageId = await sf.deployNewPage(page);

		page.salesforceId = pageId;

		let pageUpdateResult = await db.update(page);
		m.success(`Successfully created page ${chalk.cyan(page.name)} ${chalk.cyan(`(Id: ${pageUpdateResult.salesforceId})`)}`);

		return pageUpdateResult;

	} catch (error) {

		debug(`_deployNewPage err => %o`, error);
		
		m.fail(`Failed to create page!`);
		throw error;
	}
}

async function _startTunnel(org, page) {

	debug(`_startTunnel() => org:`, org);
	debug(`_startTunnel() => page:`, page);
	
	m.start('Starting ngrok tunnel...');

	let sf = new Salesforce(org);
	let watcher = new Watcher(org, page);
	let ngrok = new Ngrok(page.port);
	
	try {

		let [url, customSettings] = await Promise.all([ngrok.connect(), sf.processCustomSettings()]);
		
		m.success(`Tunnel started at: ${chalk.cyan(url)}`);
	
		//Re-query the org in case the processCustomSettings() method updated the org credentials.
		org = await db.getWithDefault(org._id);
	
		await _togglePageSettings(org, page, url, true);
	
		await watcher.start();

		let answer = (await cli.manageTunnel()) || '';
	
		let disconnectPromises: any[] = [
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

		throw error;
	}
}

async function _togglePageSettings(org: Org, page: Page, url: string, developmentMode: boolean) : Promise<void> {
	
	let METHOD_NAME = '_togglePageSettings()';
	debug(`${METHOD_NAME} => page: %o`, page);
	debug(`${METHOD_NAME} => org: %o`, org);
	debug(`${METHOD_NAME} => url: %o`, url);
	debug(`${METHOD_NAME} => developmentMode: %o`, developmentMode);

	m.start(`${developmentMode ? 'Enabling' : 'Disabling'} development mode in ${chalk.cyan(org.name)}...`);

	try {

		let sf = new Salesforce(org);
		let { pageConfig, userConfig } = await sf.updateSetting(page.name, url, developmentMode);

		if(pageConfig.success) {
			m.success(`Development mode ${developmentMode ? 'enabled' : 'disabled'} for page ${chalk.cyan(page.name)}`);
		} else {
			m.fail(`Failed to ${developmentMode ? 'enable' : 'disable'} development mode for page ${chalk.cyan(page.name)}`);
		}

	} catch (error) {
		m.fail(`An error occurred communicating with ${chalk.cyan(org.name)}`);
		throw error;
	}
}

async function _validateIfOrgIsAuthed(orgName: string) : Promise<Org> {

	debug(`_validateIfOrgIsAuthed() => orgName:`, orgName);
	let meta = new ErrorMetadata('_validateIfOrgIsAuthed', { orgName });

	try {
	
		let org = await db.getWithDefault(orgName);
		
		if(org) return org;

		return processAuth(orgName);

	} catch (error) {
		await errorReporter.error(error, meta);
		throw error;
	}
}