#!/usr/bin/env node

import * as flow from './flow';
import { projectRoot } from './paths';
import { join } from 'path';

const commander = require('commander');
const packageJson = require(join(projectRoot, 'package.json'));

const debugOption = {
	name: '--debug',
	description: 'Used only for development, has no effect otherwise.'
};

commander
	.version(packageJson.version);

commander
	.command('auth')
	.alias('a')
	.description('Adds authentication for a Salesforce org.')
	.option(debugOption.name, debugOption.description)
	.action(flow.auth);

commander
	.command('new')
	.alias('n')
	.description('Creates a new Visualforce page and deploys it to Salesforce.')
	.option(debugOption.name, debugOption.description)
	.action(flow.newPage);

commander
	.command('serve')
	.alias('s')
	.description('Serves up an app running locally directly in a Visualforce page.')
	.option(debugOption.name, debugOption.description)
	.action(flow.serve);

commander
	.command('deploy')
	.alias('d')
	.description('Deploys an app to Salesforce as a Static Resource.')
	.option(debugOption.name, debugOption.description)
	.action(flow.deployApp);

commander
	.command('list')
	.alias('ls')
	.description('Lists all authenticated Salesforce orgs and created Visualforce pages.')
	.option(debugOption.name, debugOption.description)
	.action(flow.list);

commander
	.command('clear')
	.alias('c')
	.description('Clears all authenticated orgs and Visualforce pages locally (does not affect Salesforce).')
	.option(debugOption.name, debugOption.description)
	.action(flow.deleteDatabase);

commander.parse(process.argv);

if(!commander.args.length) {
	commander.help();
}
