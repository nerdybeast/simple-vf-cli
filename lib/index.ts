import { NestFactory } from '@nestjs/core';
import * as flow from './flow';
import { NestApplicationContextOptions } from '@nestjs/common/interfaces/nest-application-context-options.interface';
import { ApplicationModule } from './modules/ApplicationModule';
import { UserInterfaceService } from './modules/user-interface/UserInterfaceService';
import commander from 'commander';

export async function bootstrap(version: string, isDevelopment: boolean) {

	const applicationContextOptions: NestApplicationContextOptions = { };

	if(!isDevelopment) {
		//Will prevent default nest js logging (not user friendly) during the app creation process.
		applicationContextOptions.logger = false;
	}

	const application = await NestFactory.createApplicationContext(ApplicationModule, applicationContextOptions);
	const uiService = application.get<UserInterfaceService>(UserInterfaceService);

	let actionToRun;

	commander
		.version(version);
	
	commander
		.command('connect')
		.alias('c')
		.description('Adds authentication for a Salesforce org.')
		.action(() => actionToRun = uiService.auth());
	
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
		.alias('cl')
		.description('Clears all authenticated orgs and Visualforce pages locally (does not affect Salesforce).')
		.action(flow.deleteDatabase);
	
	commander.parse(process.argv);
	
	if(!commander.args.length) {
		commander.help();
	}

	if(actionToRun) {
		await actionToRun;
	}
}

