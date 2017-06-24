const fs = require('fs');
const path = require('path');
const jsforce = require('jsforce');
const Promise = require('bluebird');
const cryptoJS = require('crypto-js');
const _ = require('lodash');
const debug = require('debug')('svf:info salesforce');

import * as cli from './cli';
import db from './db';
import m from './message';
import Org from './models/org';
import StaticResourceOptions from './models/static-resource-options';
import * as templates from './templates';

class Salesforce {
	
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

	updateSetting(pageName: string, url: string, developmentMode) {
		
		return this.validateAuthentication().then(() => {

			return Promise.props({
				pageConfig: this.conn.query(`Select Id, Name, DevelopmentMode__c, TunnelUrl__c From Simple_VF_Pages__c Where Name = '${pageName}'`),
				userConfig: this.conn.query(`Select Id, Name, SetupOwnerId, DevelopmentMode__c From Simple_VF_Users__c Where SetupOwnerId = '${this.org.userId}'`)
			});

		}).then(hash => {

			let pageConfigPromise, userConfigPromise;

			if(hash.pageConfig.totalSize > 0) {
				let pageConfig = hash.pageConfig.records[0];
				pageConfigPromise = this.conn.sobject('Simple_VF_Pages__c').update({ Id: pageConfig.Id, DevelopmentMode__c: developmentMode, TunnelUrl__c: url });
			} else {
				pageConfigPromise = this.conn.sobject('Simple_VF_Pages__c').create({ Name: pageName, DevelopmentMode__c: developmentMode, TunnelUrl__c: url });
			}

			if(hash.userConfig.totalSize > 0) {
				let userConfig = hash.userConfig.records[0];
				userConfigPromise = this.conn.sobject('Simple_VF_Users__c').update({ Id: userConfig.Id, DevelopmentMode__c: developmentMode });
			} else {
				userConfigPromise = this.conn.sobject('Simple_VF_Users__c').create({ SetupOwnerId: this.org.userId, DevelopmentMode__c: developmentMode });
			}

			return Promise.props({ pageConfigPromise, userConfigPromise });

		});

	}

	deployNewPage(page) {

		return this.validateAuthentication().then(() => {

			return this.conn.query(`Select Id From ApexPage Where Name = '${page.name}'`);

		}).then(queryResult => {

			if(queryResult.totalSize > 0) {
				return Promise.resolve(queryResult.records[0].Id);
			}

			let newApexPage;
			let createdResources = [];

			return this.processCustomSettings().then(() => {
			
				let options = templates.controller(page.name);

				return this.createSobject('ApexClass', {
					Name: options.name,
					Body: options.body
				});

			}).then(controllerClass => {

				debug(`controllerClass => %o`, controllerClass);

				createdResources.push({ order: 4, type: 'ApexClass', id: controllerClass.id, isTooling: false });

				let bitmap = fs.readFileSync(path.join(__dirname, 'static/placeholder.txt'));
				let staticResourceContent = new Buffer(bitmap).toString('base64');
				let staticResourceOptions = this.createStaticResourceOptions(page, 'text/plain', staticResourceContent);
				
				return this.createSobject('StaticResource', staticResourceOptions, true);

			}).then(staticResource => {

				debug(`staticResource => %o`, staticResource);

				createdResources.push({ order: 2, type: 'StaticResource', id: staticResource.id, isTooling: true });

				let options = templates.visualforcePage(page.name);

				return this.createSobject('ApexPage', {
					Name: options.name,
					MasterLabel: options.name,
					Markup: options.body
				});

			}).then(apexPage => {

				debug(`apexPage => %o`, apexPage);

				createdResources.push({ order: 1, type: 'ApexPage', id: apexPage.id, isTooling: false });

				newApexPage = apexPage;

				let options = templates.controllerTest(page.name);
				
				return this.createSobject('ApexClass', {
					Name: options.name,
					Body: options.body
				});

			}).then(controllerTestClass => {

				debug(`controllerTestClass => %o`, controllerTestClass);

				createdResources.push({ order: 3, type: 'ApexClass', id: controllerTestClass.id, isTooling: false });

				return Promise.resolve(newApexPage.id);

			}).catch(err => {

				let cleanupMap = _.sortBy(createdResources, ['order']);

				return Promise.each(cleanupMap, (resource) => {
					
					debug(`deleting ${resource.type} => ${resource.id}`);

					let connection = resource.isTooling ? this.conn.tooling : this.conn;
					return connection.sobject(resource.type).delete(resource.id);

				}).then(deleteResult => {

					debug(`deleteResult => %o`, deleteResult);
					return Promise.reject(err);

				});

			});
		});
	}

	processCustomSettings() {
		
		return this.validateAuthentication().then(() => {
			
			return Promise.props({
				hasSimpleVfPages: this.hasSobject(templates.simpleVfPages.fullName),
				hasSimpleVfUsers: this.hasSobject(templates.simpleVfUsers.fullName)
			});
		
		}).then(hash => {

			let toBeCreatedMeta = [];

			if(!hash.hasSimpleVfPages) { 
				toBeCreatedMeta.push(templates.simpleVfPages); 
			}

			if(!hash.hasSimpleVfUsers) { 
				toBeCreatedMeta.push(templates.simpleVfUsers); 
			}

			if(toBeCreatedMeta.length === 0) {
				return Promise.resolve();
			}

			return this.conn.metadata.create('CustomObject', toBeCreatedMeta);

		});
	}

	hasSobject(sobjectName) {
		return this.conn.sobject(sobjectName).describe()
			.then(() => Promise.resolve(true))
			.catch(() => Promise.resolve(false));
	}

	validateAuthentication() {

		return this.conn.identity().then(() => Promise.resolve()).catch(err => {
			
			if(err.errorCode !== 'INVALID_SESSION_ID') {
				return Promise.reject(err);
			}

			let securityToken = '';

			debug(`validateAuthentication() this.org.securityToken => ${this.org.securityToken}`);

			return Promise.props({
				encryptionKey: db.getEncryptionKey(),
				securityToken: typeof this.org.securityToken !== 'string' ? cli.getSecurityToken('No security token set for this org, you may enter that now') : this.org.securityToken
			}).then(hash => {

				securityToken = hash.securityToken;
				let password = cryptoJS.AES.decrypt(this.org.password, hash.encryptionKey).toString(cryptoJS.enc.Utf8) + securityToken;

				return Promise.props({
					org: db.getWithDefault(this.org._id),
					userInfo: this.conn.login(this.org.username, password)
				});

			}).then(hash => {

				debug(`validateAuthentication re-login userInfo => %o`, hash.userInfo);

				//Set the new accessToken on the org object so that it can be saved into the database.
				hash.org.accessToken = this.conn.accessToken;
				hash.org.securityToken = securityToken;
				
				//Reset the accessToken stored in this class instance.
				this.org = hash.org;

				return db.update(hash.org);

			});
		});
	}

	saveStaticResource(page, zipFilePath) {

		debug(`saveStaticResource() page => %o`, page);

		m.start('Deploying static resource to Salesforce...');

		return this.validateAuthentication().then(() => {
			
			//TODO: If we find a static resource in the org matching this page name, we need to update the page object

			if(!page.staticResourceId) {
				return this.getSobjectByName('StaticResource', page.name).then(staticResource => {
					page.staticResourceId = staticResource !== null ? staticResource.Id : null;
					return page;
				});
			}

			return Promise.resolve(page);

		}).then(page => {

			let bitmap = fs.readFileSync(zipFilePath);
			let body = new Buffer(bitmap).toString('base64');

			let options = this.createStaticResourceOptions(page, 'application/zip', body);

			let sobject = this.conn.tooling.sobject('StaticResource');
			return ('Id' in options) ? sobject.update(options) : sobject.create(options);

		}).then(result => {

			if(result.success) {
				m.success('Static resource successfully deployed.');
				return Promise.resolve(result.id);
			}

			return Promise.reject(result);

		}).catch(err => {

			m.fail('Failed to save static resource in Salesforce.');
			return Promise.reject(err);

		});

	}

	getSobjectByName(sobject, name) {

		return this.conn.query(`Select Id, Name From ${sobject} Where Name = '${name}'`).then(queryResult => {

			debug(`getSobjectByName() queryResult => %o`, queryResult);
			return queryResult.totalSize > 0 ? queryResult.records[0] : null;

		});

	}

	createStaticResourceOptions(page: any, contentType: string, body: string) : StaticResourceOptions {

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

	createSobject(sobjectName: string, options: any, isTooling: boolean = false) {

		let api = isTooling ? this.conn.tooling : this.conn;

		return api.sobject(sobjectName).create(options).catch(err => {

			if(err.errorCode === 'DUPLICATE_VALUE' && err.message.includes('<unknown>')) {
				err.message = `Duplicate value found: An Sobject of type "${sobjectName}" already exists with the name "${options.Name}"`;
			}

			return Promise.reject(err);
		});
	}
}

export default Salesforce;