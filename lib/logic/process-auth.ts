import { Message } from '../message';
import { Org } from '../models/org';
import db from '../db';
import { askOrgCredentials } from '../cli';
import reporter from '../error-reporter';
import { Debug } from '../utilities/debug';
import { OrgRepository } from '../JsonDB';

const jsforce = require('jsforce');
const chalk = require('chalk');
const debug = new Debug('svf', 'process-auth');

export default async function processAuth(orgName: string, org?: Org) : Promise<Org> {

	let message = new Message();
	let newOrg = new Org();
	
	try {
		
		const orgRepository = new OrgRepository();
		let savedOrg = org || (await orgRepository.getWithDefault(orgName));
		let credentials = await askOrgCredentials(savedOrg);
		
		//Eagerly set these properties so that we can provide the user with retry effect when their login fails.
		newOrg._id = orgName;
		newOrg.name = orgName;
		newOrg.loginUrl = credentials.loginUrl;
		newOrg.username = credentials.username;
		newOrg.securityToken = credentials.securityToken;
	
		let { loginResult, encryptionKey, instanceUrl, accessToken } = await runLoginPromises(credentials, orgName);

		message.start(`Saving information for ${chalk.cyan(orgName)}...`);

		newOrg.instanceUrl = instanceUrl;
		newOrg.userId = loginResult.id;
		newOrg.orgId = loginResult.organizationId;
		newOrg.accessToken = accessToken;
	
		newOrg = await orgRepository.update(newOrg);

		message.success(`Information successfully saved.`);

		return newOrg;

	} catch (error) {
		
		debug.error(`processAuth error`, error);
		
		if(error.message.includes('INVALID_LOGIN') || error.message.includes('LOGIN_MUST_USE_SECURITY_TOKEN')) {
			reporter.warning(error.message, { orgName }, error);
			message.catchError(error);
			return await processAuth(orgName, newOrg);
		}

		throw error;
	}

}

async function runLoginPromises(credentials, orgName) {

	let message = new Message();
	message.start(`Authenticating to ${chalk.cyan(orgName)}...`);

	try {
	
		let conn = new jsforce.Connection({ loginUrl: credentials.orgType });
		let password = credentials.password + (credentials.securityToken || '');
	
		let [loginResult, encryptionKey] = await Promise.all([
			conn.login(credentials.username, password),
			db.getEncryptionKey()
		]);

		debug.info(`jsforce.login() loginResult`, loginResult);
		message.success(`Successfully authenticated to: ${chalk.cyan(conn.instanceUrl)}`);

		let { instanceUrl, accessToken } = conn;
		return { loginResult, encryptionKey, instanceUrl, accessToken };

	} catch (error) {
		
		debug.error(`runLoginPromises() error`, error);
		message.fail(`Authentication to ${chalk.cyan(orgName)} failed.`);

		throw error;
	}

}