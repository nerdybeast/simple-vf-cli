const fs = require('fs');
const path = require('path');
const jsforce = require('jsforce');
const cryptoJS = require('crypto-js');
const _ = require('lodash');
const debug = require('debug')('svf:info salesforce');

import * as cli from './cli';
import db from './db';
import m from './message';
import { Org } from './models/org';
import { Page } from './models/page';
import StaticResourceOptions from './models/static-resource-options';
import * as templates from './templates';
import { getPluginModule } from './plugins'

export class Salesforce {
	
	private org: Org;
	private conn: any;

	constructor(org: Org) {

		this.org = org;
		
		this.conn = new jsforce.Connection({
			loginUrl: org.loginUrl,
			instanceUrl: org.instanceUrl,
			accessToken: org.accessToken
		});

		debug(`Salesforce class instantiated with => %o`, org);
	}

	async updateSetting(pageName: string, url: string, developmentMode) {
		
		await this.validateAuthentication();

		let [pageConfigQueryResult, userConfigQueryResult] = await Promise.all([
			this.conn.query(`Select Id, Name, DevelopmentMode__c, TunnelUrl__c From Simple_VF_Pages__c Where Name = '${pageName}'`),
			this.conn.query(`Select Id, Name, SetupOwnerId, DevelopmentMode__c From Simple_VF_Users__c Where SetupOwnerId = '${this.org.userId}'`)
		]);

		let promises = [];

		if(pageConfigQueryResult.totalSize > 0) {
			let pageConfig = pageConfigQueryResult.records[0];
			promises.push(this.conn.sobject('Simple_VF_Pages__c').update({ Id: pageConfig.Id, DevelopmentMode__c: developmentMode, TunnelUrl__c: url }));
		} else {
			promises.push(this.conn.sobject('Simple_VF_Pages__c').create({ Name: pageName, DevelopmentMode__c: developmentMode, TunnelUrl__c: url }));
		}

		if(userConfigQueryResult.totalSize > 0) {
			let userConfig = userConfigQueryResult.records[0];
			promises.push(this.conn.sobject('Simple_VF_Users__c').update({ Id: userConfig.Id, DevelopmentMode__c: developmentMode }));
		} else {
			promises.push(this.conn.sobject('Simple_VF_Users__c').create({ SetupOwnerId: this.org.userId, DevelopmentMode__c: developmentMode }));
		}

		let [pageConfig, userConfig] = await Promise.all(promises);

		return { pageConfig, userConfig };
	}

	async deployNewPage(page: Page) : Promise<string> {

		debug(`deployNewPage() page => %o`, page);

		let createdResources = [];

		try {

			await this.validateAuthentication();
			let pageQueryResult = await this.conn.query(`Select Id From ApexPage Where Name = '${page.name}'`);

			if(pageQueryResult.totalSize > 0) {
				return Promise.resolve(pageQueryResult.records[0].Id);
			}

			await this.processCustomSettings();

			let options = templates.controller(page.name);
			
			let controllerClass = await this.createSobject('ApexClass', {
				Name: options.name,
				Body: options.body
			});

			debug(`controllerClass => %o`, controllerClass);
			
			createdResources.push({ order: 4, type: 'ApexClass', id: controllerClass.id, isTooling: false });

			let staticResourceContent = Buffer.from('placeholder').toString('base64');
			let staticResourceOptions = this.createStaticResourceOptions(page, 'text/plain', staticResourceContent);
			
			let staticResource = await this.createSobject('StaticResource', staticResourceOptions, true);

			debug(`staticResource => %o`, staticResource);
			
			createdResources.push({ order: 2, type: 'StaticResource', id: staticResource.id, isTooling: true });

			let plugin = await getPluginModule(page.pluginName);
			let html = await plugin.getHtmlMarkup(page);
			let markup = templates.apexPageWrapper(page, html);

			let apexPage = await this.createSobject('ApexPage', {
				Name: page.name,
				MasterLabel: page.name,
				Markup: markup
			});
			
			debug(`apexPage => %o`, apexPage);
			
			createdResources.push({ order: 1, type: 'ApexPage', id: apexPage.id, isTooling: false });

			let controllerTestOptions = templates.controllerTest(page.name);
			
			let controllerTestClass = await this.createSobject('ApexClass', {
				Name: controllerTestOptions.name,
				Body: controllerTestOptions.body
			});

			debug(`controllerTestClass => %o`, controllerTestClass);
			
			createdResources.push({ order: 3, type: 'ApexClass', id: controllerTestClass.id, isTooling: false });

			return apexPage.id;

		} catch (error) {

			createdResources = _.sortBy(createdResources, ['order']);

			for(let resource of createdResources) {
				let connection = resource.isTooling ? this.conn.tooling : this.conn;
				let deleteResult = await connection.sobject(resource.type).delete(resource.id);
				debug(`Delete result for ${resource.type} ${resource.id} => %o`, deleteResult);
			}

			throw error;
		}

	}

	async processCustomSettings() : Promise<any> {
		
		await this.validateAuthentication();

		let [hasSimpleVfPages, hasSimpleVfUsers] = await Promise.all([
			this.hasSobject(templates.simpleVfPages.fullName),
			this.hasSobject(templates.simpleVfUsers.fullName)
		]);

		let toBeCreatedMeta = [];
		
		if(!hasSimpleVfPages) toBeCreatedMeta.push(templates.simpleVfPages);
		if(!hasSimpleVfUsers) toBeCreatedMeta.push(templates.simpleVfUsers);

		if(toBeCreatedMeta.length === 0) return Promise.resolve();

		return this.conn.metadata.create('CustomObject', toBeCreatedMeta);
	}

	hasSobject(sobjectName: string) : Promise<boolean> {
		return this.conn.sobject(sobjectName).describe().then(() => true).catch(() => false);
	}

	async validateAuthentication() : Promise<void> {

		try {
			
			await this.conn.identity();

		} catch (error) {

			if(error.errorCode !== 'INVALID_SESSION_ID') throw error;

			//For backwards compatability when we were not prompting the user to enter a security token.
			let securityTokenPromise = typeof this.org.securityToken !== 'string' ? cli.getSecurityToken('No security token set for this org, you may enter that now') : this.org.securityToken;

			let [encryptionKey, securityToken] = await Promise.all([ db.getEncryptionKey(), securityTokenPromise ]);

			let password = cryptoJS.AES.decrypt(this.org.password, encryptionKey).toString(cryptoJS.enc.Utf8) + securityToken;

			let [org, userInfo] = await Promise.all([
				<Org>db.getWithDefault(this.org._id),
				this.conn.login(this.org.username, password)
			]);

			//Set the new accessToken on the org object so that it can be saved into the database.
			org.accessToken = this.conn.accessToken;
			org.securityToken = securityToken;
			
			//Reset the accessToken stored in this class instance.
			this.org = org;

			return db.update(org);
		}
	}

	async saveStaticResource(page: Page, zipFilePath) {

		debug(`saveStaticResource() page => %o`, page);

		m.start('Deploying static resource to Salesforce...');

		try {
			
			await this.validateAuthentication();

			if(!page.staticResourceId) {
				let staticResource = await this.getSobjectByName('StaticResource', page.name);
				page.staticResourceId = staticResource !== null ? staticResource.Id : null;
			}

			let bitmap = fs.readFileSync(zipFilePath);
			let body = new Buffer(bitmap).toString('base64');

			let options = this.createStaticResourceOptions(page, 'application/zip', body);

			let sobject = this.conn.tooling.sobject('StaticResource');
			let staticResourceResult = await (('Id' in options) ? sobject.update(options) : sobject.create(options));
			debug(`save static resource result => %o`, staticResourceResult);

			m.success('Static resource successfully deployed.');
			return staticResourceResult.id;

		} catch (error) {
			m.fail('Failed to save static resource in Salesforce.');
			throw error;
		}
	}

	async getSobjectByName(sobject, name) {
		let queryResult = await this.conn.query(`Select Id, Name From ${sobject} Where Name = '${name}'`);
		debug(`getSobjectByName() queryResult => %o`, queryResult);
		return queryResult.totalSize > 0 ? queryResult.records[0] : null;
	}

	createStaticResourceOptions(page: Page, contentType: string, body: string) : StaticResourceOptions {

		let options = new StaticResourceOptions();
		options.cacheControl = 'Private';
		options.name = page.name;
		options.contentType = contentType;
		
		if(page.staticResourceId) {
			options.Id = page.staticResourceId;
		}

		debug(`static resource creation options => %o`, options);

		//Set this body property AFTER the debug statement otherwise, the console output will run for days.
		options.body = body;

		return options;
	}

	async createSobject(sobjectName: string, options: any, isTooling: boolean = false) {
		
		try {
			
			let api = isTooling ? this.conn.tooling : this.conn;
			let sobjectResult = await api.sobject(sobjectName).create(options);
			debug(`create sobject result => %o`, sobjectResult);

			return sobjectResult;

		} catch (error) {
			
			debug(`create sobject error => %o`, error);

			if(error.errorCode === 'DUPLICATE_VALUE' && error.message.includes('<unknown>')) {
				error.message = `Duplicate value found: An Sobject of type "${sobjectName}" already exists with the name "${options.Name}"`;
			}

			throw error;
		}
	}
}