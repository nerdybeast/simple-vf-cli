import { join } from 'path';
import * as spawn from 'cross-spawn';
import * as cli from './cli';
import db from './db';
import message from './message';
import { projectRoot } from './paths';

const debug = require('debug')('svf:info plugin');

export async function determineBuildSystem() {

	let pluginDetails = await cli.getBuildSystem();

	//Will be true if the user chose the "other" option when choosing which build system they are using.
	if(pluginDetails.name === 'default') return Promise.resolve(pluginDetails);

	//let plugin = await getPlugin(pluginDetails.name);

	let modules = await installedModules();

	if(!(pluginDetails.name in modules)) {
		await installPlugins(pluginDetails.name);
		modules = await installedModules();
		await savePlugin(modules[pluginDetails.name]);
	}

	return Promise.resolve(pluginDetails);
}

// function getPlugin(pluginName: string) : Promise<any> {

// 	return db.find({
// 		selector: { type: 'plugin', name: pluginName }
// 	}).then(searchResult => {
// 		return searchResult.docs[0] || null;
// 	});

// }

function installPlugins(plugins) {
	
	if(typeof plugins === 'string') {
		plugins = [plugins];
	} 

	return new Promise((resolve, reject) => {

		message.start('Installing plugins...');

		let child = spawn('npm', ['install', ...plugins, '--save-optional', '--save-exact'], {
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

function installedModules() : Promise<any> {

	return new Promise((resolve, reject) => {

		message.start('Checking for installed plugins...');

		let result = null;

		let child = spawn('npm', ['list', '--json', '--depth=0'], {
			cwd: projectRoot
		});

		child.on('data', (data) => debug(`data => ${data}`));
		
		child.stdout.on('data', (data) => {
			debug(`child.stdout => ${data}`);
			result = JSON.parse(data).dependencies;
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

function savePlugin(npmListDetail) {

	let doc = Object.assign(npmListDetail, {
		_id: npmListDetail.from,
		name: npmListDetail.name,
		type: 'plugin'
	});

	return db.put(doc).then(putResult => {
		debug(`putResult on doc ${doc._id} => %o`, putResult);
		return db.getWithDefault(doc._id);
	});
}