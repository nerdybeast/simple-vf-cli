import { join } from 'path';
import * as spawn from 'cross-spawn';
import * as cli from './cli';
import db from './db';
import message from './message';

const debug = require('debug')('svf:info plugin');

export async function determineBuildSystem() {

	let pluginName = await cli.getBuildSystem();
	let plugin = await getPlugin(pluginName);

	if(!plugin) await installPlugins(pluginName);

	return Promise.resolve(plugin);
}

function getPlugin(pluginName: string) : Promise<any> {

	return db.find({
		selector: { type: 'plugin', name: pluginName }
	}).then(searchResult => {
		return searchResult.docs[0] || null;
	});

}

function installPlugins(plugins) {
	
	if(typeof plugins === 'string') {
		plugins = [plugins];
	} 

	return new Promise((resolve, reject) => {

		message.start('Installing plugins...');

		let cwd = join(__dirname, '../../');
		debug(`Current working directory => ${cwd}`);

		let child = spawn('npm', ['install', ...plugins, '-g'], { cwd });

		child.on('data', (data) => debug(`data => ${data}`)); 

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