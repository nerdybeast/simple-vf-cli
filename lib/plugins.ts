import { join } from 'path';
import * as spawn from 'cross-spawn';
import * as cli from './cli';
import db from './db';
import message from './message';
import { projectRoot } from './paths';
import { ModuleDetails } from './interfaces/module-details';

const debug = require('debug')('svf:info plugin');

export async function determineBuildSystem() {

	let pluginName = await cli.getBuildSystem();

	//Will be true if the user chose the "other" option when choosing which build system they are using.
	if(pluginName === 'default') return Promise.resolve(pluginName);

	//let plugin = await getPlugin(pluginDetails.name);

	// let installedModules = await getInstalledModules();

	// if(!hasModuleInstalled(pluginName, installedModules)) {
	// 	await installPlugins(pluginName);
	// 	installedModules = await getInstalledModules();
	// 	await savePlugin(installedModules.find(x => x.name === pluginName));
	// }

	return Promise.resolve(pluginName);
}

function getPlugin(pluginName: string) : Promise<any> {

	return db.find({
		selector: { type: 'plugin', name: pluginName }
	}).then(searchResult => {
		return searchResult.docs[0] || null;
	});

}

function hasModuleInstalled(moduleName: string, installedModules: ModuleDetails[]) : boolean {
	return installedModules.some(x => x.name === moduleName);
}

function installPlugins(plugins) {
	
	if(typeof plugins === 'string') {
		plugins = [plugins];
	} 

	return new Promise((resolve, reject) => {

		message.start('Installing plugins...');

		let child = spawn('npm', ['install', ...plugins, '--no-save'], {
			cwd: projectRoot
		});

		child.on('data', (data) => debug(`data => ${data}`));

		child.stdout.on('data', (data) => {

			debug(`child.stdout => ${data}`); //ex: child.stdout => + star-wars-api@1.0.1

		});

		child.stderr.on('data', (data) => debug(`child.stderr => ${data}`));

		child.on('close', (code) => {
			
			//TODO: Error handling if code !== 0;
			debug(`code => ${code}`);

			message.success('Successfully installed required plugins');
			return resolve();
		}); 

		child.on('error', (error) => {
			message.fail(`An error has occured installing the required plugins: ${error.message}`);
			return reject(error);
		});

	});
}

function getInstalledModules() : Promise<ModuleDetails[]> {

	return new Promise((resolve, reject) => {

		message.start('Checking for installed plugins...');

		let result: ModuleDetails[] = [];

		let child = spawn('npm', ['list', '--json', '--depth=0'], {
			cwd: projectRoot
		});

		child.on('data', (data) => debug(`data => ${data}`));
		
		child.stdout.on('data', (data) => {
			
			debug(`child.stdout => ${data}`);
			let dependencies = JSON.parse(data).dependencies;
			
			result = Object.keys(dependencies).map(key => {
				let dependency = dependencies[key];
				return {
					version: dependency.version,
					name: key,
					resolved: dependency.resolved
				};
			});
		});

		child.stderr.on('data', (data) => {
			debug(`child.stderr => ${data}`);
			//return reject(new Error(data));
		});

		child.on('close', (code) => {
			
			//TODO: Error handling if code !== 0;
			debug(`code => ${code}`);

			message.success('Plugin search complete');
			return resolve(result);
		}); 

		child.on('error', (error) => {
			message.fail(`An error has occured installing the required plugins: ${error.message}`);
			return reject(error);
		});
	});
}

function savePlugin(moduleDetails: ModuleDetails) : Promise<any> {

	let doc = Object.assign(moduleDetails, {
		_id: moduleDetails.name,
		type: 'plugin'
	});

	return db.put(doc).then(putResult => {
		debug(`putResult on doc ${doc._id} => %o`, putResult);
		return db.getWithDefault(doc._id);
	});
}