#!/usr/bin/env node

const commander = require('commander');
const path = require('path');

import * as flow from './flow';
import { projectRoot } from './paths';

const packageJson = require(path.join(projectRoot, 'package.json'));

commander
	.version(packageJson.version);

commander
	.command('auth')
	.alias('a')
	.description('Adds authentication for a Salesforce org.')
	.action(flow.auth);

commander
	.command('new')
	.alias('n')
	.description('Creates a new Visualforce page and deploys it to Salesforce.')
	.action(flow.newPage);

commander
	.command('serve')
	.alias('s')
	.description('Serves up an app running locally directly in a Visualforce page.')
	.action(flow.serve);

commander
	.command('deploy')
	.alias('d')
	.description('Deploys an app to Salesforce as a Static Resource.')
	.action(flow.deployApp);

commander
	.command('list')
	.alias('ls')
	.description('Lists all authenticated Salesforce orgs and created Visualforce pages.')
	.action(flow.list);

commander
	.command('clear')
	.alias('c')
	.description('Clears all authenticated orgs and Visualforce pages locally (does not affect Salesforce).')
	.action(flow.deleteDatabase);

commander.parse(process.argv);

if(!commander.args.length) {
	commander.help();
}
