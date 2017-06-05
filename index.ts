#!/usr/bin/env node

const commander = require('commander');
const path = require('path');

import * as flow from './lib/flow';
import { projectRoot } from './lib/paths';

const packageJson = require(path.join(projectRoot, 'package.json'));

commander
	.version(packageJson.version);

commander
	.command('auth [org]')
	.alias('a')
	.description('Adds authentication for an org.')
	.action(flow.auth);

commander
	.command('new [name]')
	.alias('n')
	.description('Creates a new Visualforce page for the given name and deploys that page to Salesforce.')
	.action(flow.newPage);

commander
	.command('serve [org]')
	.alias('s')
	.description('Creates a public tunnel to a local host resource.')
	.action(flow.serve);

commander
	.command('deploy')
	.alias('d')
	.description('Deploys an app as a static resource.')
	.action(flow.deployApp);

commander
	.command('list')
	.alias('ls')
	.description('Lists all org and page entries.')
	.action(flow.list);

commander
	.command('clear')
	.alias('c')
	.description('Clears all org and page entries.')
	.action(flow.deleteDatabase);

commander.parse(process.argv);

if(!commander.args.length) {
	commander.help();
}


