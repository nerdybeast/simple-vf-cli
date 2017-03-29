'use strict';

const fs = require('fs');
const path = require('path');
const jsforce = require('jsforce');
const Promise = require('bluebird');
const cryptoJS = require('crypto-js');
const debug = require('debug')('svf:info salesforce');
const templates = require('./templates');
const db = require('./db');
const m = require('./message');
const cli = require('./cli');

class Salesforce {
    
    constructor(org) {

        this.org = org;
        
        this.conn = new jsforce.Connection({
            loginUrl: org.loginUrl,
            instanceUrl: org.instanceUrl,
            accessToken: org.accessToken
        });

        debug(`Salesforce class instantiated with => %o`, org);
    }

    updateSetting(pageName, url, developmentMode) {
        
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

            return this.processCustomSettings().then(() => {
            
                return this.conn.sobject('ApexClass').create({
                    Name: page.name,
                    Body: templates.controller(page.name)
                });

            }).then(apexClassResult => {

                return this.conn.sobject('ApexPage').create({
                    Name: page.name,
                    MasterLabel: page.name,
                    Markup: templates.visualforcePage(page.name)
                });

            }).then(pageCreateResult => {
                
                if(pageCreateResult.success) {
                    return Promise.resolve(pageCreateResult.id);
                }

                return Promise.reject(pageCreateResult);
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
            
            if(!page.staticResourceId) {
                return this.getSobjectByName('StaticResource', page.name).then(staticResource => {
                    return staticResource !== null ? staticResource.Id : null;
                });
            }

            return Promise.resolve(page.staticResourceId);

        }).then(staticResourceId => {

            let options = {
                cacheControl: 'Private',
                name: page.name,
                contentType: 'application/zip'
            };

            if(staticResourceId) {
                //NOTE: This "Id" property HAS TO BE PascalCased so that jsforce will properly add it into the url.
                options.Id = staticResourceId;
            }

            debug(`options sent when saving a static resource => %o`, options);

            let bitmap = fs.readFileSync(zipFilePath);
            options.body = new Buffer(bitmap).toString('base64');

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
}

module.exports = Salesforce;