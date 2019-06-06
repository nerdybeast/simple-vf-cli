import db from './db';
import errorReporter from './error-reporter';
import { ErrorMetadata } from './models/error-metadata';
import { Org } from './models/org';
import { Page } from './models/page';
import { askOrgSelection, askPageSelection, askToDeleteDatabase, askForOrgName, askToStopTunnel } from './cli';
import m from './message';
import { Salesforce } from './salesforce';
import Ngrok from './ngrok';
import Watcher from './watcher';
import deploy from './deploy';
import { determineBuildSystem, getPluginModule } from './plugins';
import processAuth from './logic/process-auth';
import { Debug } from './utilities/debug';
import { deleteAllData, OrgRepository, PageRepository } from './JsonDB';

const jsforce = require('jsforce');
const chalk = require('chalk');
const debug = new Debug('svf', 'flow');

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
		let page = await askPageSelection(org, true);

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

		let shouldDelete = await askToDeleteDatabase();

		if(!shouldDelete) {
			m.success('Delete cancelled');
			return;
		}

		deleteAllData();

		m.success('Delete successful');

	} catch(error) {
		handleError(error, meta);
	}
}

export async function deployApp() : Promise<void> {

	let meta = new ErrorMetadata('deployApp');

	try {

		let org = await askOrgSelection('Choose which org to deploy to', false);
		let page = await askPageSelection(org, false);
		let deployResult = await deploy(org, page);

	} catch(error) {
		handleError(error, meta);
	}
}

export async function list() {

	let meta = new ErrorMetadata('list');

	try {
	
		const orgRepository = new OrgRepository();
		const pageRepository = new PageRepository();

		let [orgs, pages] = await Promise.all([
			orgRepository.findAll(),
			pageRepository.findAll()
		]);

		orgs.sort(sortByName).forEach(org => {
			
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

			currentOrgPages.sort(sortByName).forEach(page => {

				if(page._id) {
					let pageName = chalk.cyan(page.name.padEnd(padding));
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
	debug.error('Error', error);
	await errorReporter.error(error, meta);
	m.catchError(error);
}

/**
 * @description Prompts the user to enter an org name if one was not supplied.
 */
async function _resolveOrgName(orgName: string, userMessage?: string, allowOther?: boolean) : Promise<string> {
	
	debug.verbose(`_resolveOrgName() orgName`, orgName);
	debug.verbose(`_resolveOrgName() allowOther`, allowOther);

	if(orgName) return orgName;

	let selectedOrg = await askOrgSelection(userMessage, allowOther);

	if(selectedOrg) return selectedOrg.name;

	return await askForOrgName();
}

async function _resolvePageObject(pluginName: string, org: Org) : Promise<Page> {
	
	debug.verbose(`_resolvePageObject() pluginName`, pluginName);
	debug.verbose(`_resolvePageObject() org`, org);

	let plugin = await getPluginModule(pluginName);
	let pageConfig = await plugin.pageConfig();

	let page = new Page();
	page.name = pageConfig.name;
	page.belongsTo = org._id;
	page.port = Number(pageConfig.port);
	page.outputDir = pageConfig.outputDirectory;
	page.pluginName = pluginName;

	const pageRepository = new PageRepository();
	const result = await pageRepository.post(page);

	return result;
}

async function _deployNewPage(org: Org, page: Page) {

	debug.verbose(`_deployNewPage() org`, org);
	debug.verbose(`_deployNewPage() page`, page);

	m.start(`Deploying new page ${chalk.cyan(page.name)}...`);

	try {

		let sf = new Salesforce(org);
		let pageId = await sf.deployNewPage(page);

		page.salesforceId = pageId;

		const pageRepository = new PageRepository();
		const pageUpdateResult = await pageRepository.update(page);
		m.success(`Successfully created page ${chalk.cyan(page.name)} ${chalk.cyan(`(Id: ${pageUpdateResult.salesforceId})`)}`);

		return pageUpdateResult;

	} catch (error) {

		debug.error(`failed to deploy page "${page.name}"`, error);
		
		m.fail(`Failed to create page!`);
		throw error;
	}
}

async function _startTunnel(org, page) {

	debug.verbose(`_startTunnel() org`, org);
	debug.verbose(`_startTunnel() page`, page);
	
	let sf = new Salesforce(org);
	let watcher = new Watcher(org, page);
	let ngrok = new Ngrok(page.port);
	
	try {

		await watcher.start();

		m.start('Starting ngrok tunnel...');

		let [url, customSettings] = await Promise.all([
			ngrok.connect(), 
			sf.processCustomSettings()
		]);
		
		m.success(`Tunnel started at: ${chalk.cyan(url)}`);
	
		//Re-query the org in case the processCustomSettings() method updated the org credentials.
		const orgRepository = new OrgRepository();
		org = await orgRepository.getWithDefault(org._id);
	
		await _togglePageSettings(org, page, url, true);

		let answer = (await askToStopTunnel()) || '';
	
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
	debug.verbose(`${METHOD_NAME} page`, page);
	debug.verbose(`${METHOD_NAME} org`, org);
	debug.verbose(`${METHOD_NAME} url`, url);
	debug.verbose(`${METHOD_NAME} developmentMode`, developmentMode);

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

	debug.verbose(`_validateIfOrgIsAuthed() orgName`, orgName);
	
	try {
	
		const orgRepository = new OrgRepository();
		let org = await orgRepository.getWithDefault(orgName);
		
		if(org) return org;

		return processAuth(orgName);

	} catch (error) {
		let meta = new ErrorMetadata('_validateIfOrgIsAuthed', { orgName });
		await errorReporter.error(error, meta);
		throw error;
	}
}

function sortByName(a: any, b: any) {

	const A = a.name.toUpperCase();
	const B = b.name.toUpperCase();

	let comparisonValue = 0;

	if(A > B) {
		comparisonValue = 1;
	} else if(A < B) {
		comparisonValue = -1;
	}

	return comparisonValue;
}