'use strict';

const inquirer = require('inquirer');
const _ = require('lodash');
const Promise = require('bluebird');
const chalk = require('chalk');
const fs = Promise.promisifyAll(require('fs-extra'));
const debug = require('debug')('svf:info cli');
const db = require('./db');
const m = require('./message');

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

    securityToken({ questionVerbage, securityToken } = {}) {

        let suffix = securityToken ? ` (default: ${chalk.cyan(securityToken)})` : ' (hit enter to bypass)';

        return {
            type: 'input',
            name: 'securityToken',
            message: `${questionVerbage || 'Security Token'}${suffix}:`
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

function _resolveOutputDirectory(outputDir) {

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
module.exports.resolveOutputDirectory = function(outputDir) {
    return _resolveOutputDirectory(outputDir);
}

module.exports.askBasicInput = function(options) {
    return _base([Question.basicInput(options)]);
}

/**
 * Asks the user to enter a new org name.
 */
module.exports.getOrgName = function() {
    return _base([questions.orgName]).then(answers => {
        return answers.orgName;
    });
}

module.exports.getOrgCredentials = function(org) {
    
    debug(`getOrgCredentials() => org: %o`, org);

    let questionsToAsk = [];

    if(!org) questionsToAsk.push(questions.orgType);

    //Initialize this parameter to an object to help avoid null reference errors.
    org = org || {};

    let usernameQ = questions.username(org.username);
    questionsToAsk.push(usernameQ);

    questionsToAsk.push(questions.password);

    let securityTokenQ = questions.securityToken({ securityToken: org.securityToken});
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

module.exports.getNgrokTunnelDetails = function() {
    return _base([questions.port, questions.vfPageName]);
}

/**
 * Asks the user to select an authed org.
 */
module.exports.orgSelection = function(includeNewChoice) {
    
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
module.exports.getPageSelectionByOrg = function(org, allowOther) {

    let selector = { type: 'page' };

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

module.exports.resolvePageName = function(pageName) {
    return _resolvePageName(pageName);
}

module.exports.getPageDetails = function(pageName) {
    
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

module.exports.manageTunnel = function() {
    return _base([{
        type: 'input',
        name: 'stopTunnel',
        message: `Hit 'enter' to stop development mode or type ${chalk.cyan('deploy')} and hit 'enter' to stop development mode and immediately deploy your app:`
    }]).then(answers => {
        return Promise.resolve(answers.stopTunnel);
    });
}

module.exports.deleteDatabase = function() {
    return _base([questions.deleteDatabase]).then(answers => Promise.resolve(answers.deleteDatabase));
}

module.exports.getSecurityToken = function(questionVerbage) {
    
    m.stop();

    return _base([questions.securityToken({ questionVerbage })]).then(answers => {
        m.start();
        return Promise.resolve(answers.securityToken);
    });
}