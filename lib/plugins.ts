import * as fs from 'fs-extra';
import { join } from 'path';
import * as spawn from 'cross-spawn';
import * as cli from './cli';
import db from './db';
import message from './message';
import { projectRoot, appSettingsLocation } from './paths';
import { ModuleDetails } from './interfaces/module-details';
import { Plugin } from './interfaces/plugin';

const debug = require('debug')('svf:info plugins');
let _pluginDirectory = `${appSettingsLocation}/plugins`;

export async function determineBuildSystem() {

	let pluginName = await cli.getBuildSystem();

	//Will be true if the user chose the "other" option when choosing which build system they are using.
	if(pluginName === 'default') return Promise.resolve(pluginName);

	message.start(`Verifying plugin installation...`);

	await ensureAppSettingsPackageJsonExists();

	let [dbPlugins, remotePlugins, installedPlugins] = await Promise.all([ 
		getPluginFromDb(pluginName),
		npmSearch('@svf/plugin'),
		getInstalledPlugins()
	]);

	let dbPlugin = dbPlugins.find(x => x.name === pluginName);
	debug(`determineBuildSystem() dbPlugin => %o`, dbPlugin);

	let remotePlugin = remotePlugins.find(x => x.name === pluginName);
	debug(`determineBuildSystem() remotePlugin => %o`, remotePlugin);

	let installedPlugin = installedPlugins.find(x => x.name === pluginName);
	debug(`determineBuildSystem() installedPlugin => %o`, installedPlugin);

	if(!pluginIsCurrent(dbPlugin, installedPlugin, remotePlugin)) {
		
		message.update('New version detected, updating now...');

		await installPlugins(remotePlugin);
		let installedModules = await getInstalledPlugins();
		await savePlugin(installedModules.find(x => x.name === pluginName));

		message.success('Plugin updated successfully');
	}

	message.success('Plugin verification complete');

	return Promise.resolve(pluginName);
}

export async function getPluginModule(name: string) : Promise<Plugin> {

	let pluginLocation = name === 'default' ? './built-in-plugins/default' : `${_pluginDirectory}/node_modules/${name}`;
	debug(`getPluginModule() => pluginLocation:`, pluginLocation);

	const { default: plugin } = await import(pluginLocation);
	debug(`getPluginModule() => plugin:`, plugin);

	return plugin;
}

function getPluginFromDb(pluginName: string) : Promise<any> {
	return db.find({
		selector: { type: 'plugin', name: pluginName }
	}).then(searchResult => {
		debug('plugin search result => %o', searchResult);
		return searchResult.docs || [];
	});
}

function hasModuleInstalled(moduleName: string, installedModules: ModuleDetails[]) : boolean {
	return installedModules.some(x => x.name === moduleName);
}

function installPlugins(plugins: ModuleDetails | ModuleDetails[]) {
	
	if(!Array.isArray(plugins)) {
		plugins = [plugins];
	}

	let pluginNames = plugins.map(x => `${x.name}@${x.version}`);

	return new Promise((resolve, reject) => {

		let child = spawn('npm', ['install', ...pluginNames, '--save', '--save-exact'], {
			cwd: _pluginDirectory
		});

		child.on('data', (data) => debug(`installPlugins data => ${data}`));

		child.stdout.on('data', (data) => {
			debug(`installPlugins child.stdout => ${data}`); //ex: child.stdout => + star-wars-api@1.0.1
		});

		child.stderr.on('data', (data) => debug(`installPlugins child.stderr => ${data}`));

		child.on('close', (code) => {
			
			//TODO: Error handling if code !== 0;
			debug(`installPlugins code => ${code}`);

			return resolve();
		});

		child.on('error', (error) => {
			return reject(error);
		});

	});
}

async function getInstalledPlugins() : Promise<ModuleDetails[]> {

	let packageJson = await fs.readJson(`${_pluginDirectory}/package.json`);
	debug(`getInstalledPlugins() packageJson => %o`, packageJson);

	packageJson.dependencies = packageJson.dependencies || {};

	return Object.keys(packageJson.dependencies).map(dependencyName => {
		let version = packageJson.dependencies[dependencyName];
		return {
			version,
			name: dependencyName,
			resolved: null
		};
	});
}

function npmSearch(criteria: string) : Promise<ModuleDetails[]> {

	return new Promise((resolve, reject) => {

		let stdout = [];
		
		let child = spawn('npm', ['search', criteria, '--json']);

		child.on('data', (data) => debug(`npmSearch data => ${data}`));
		
		child.stdout.on('data', (data) => {
			
			debug(`npmSearch child.stdout => ${data}`);
			stdout.push(data);
		});

		child.stderr.on('data', (data) => {
			debug(`npmSearch child.stderr => ${data}`);
		});

		child.on('close', (code) => {
			
			//TODO: Error handling if code !== 0;
			debug(`npmSearch code => ${code}`);

			let finalStdout = stdout.join("");
			return resolve(JSON.parse(finalStdout));
		}); 

		child.on('error', (error) => {
			return reject(error);
		});

	});
}

function savePlugin(moduleDetails: ModuleDetails) : Promise<any> {

	let doc = Object.assign(moduleDetails, {
		_id: moduleDetails.name,
		type: 'plugin'
	});

	return db.update(doc).then(updateResult => db.getWithDefault(doc._id));
}

/**
 * Returns true if current plugin is synced up with the version on npm.
 * @param dbPlugin 
 * @param installedPlugin 
 * @param remotePlugin 
 */
function pluginIsCurrent(dbPlugin: ModuleDetails, installedPlugin: ModuleDetails, remotePlugin: ModuleDetails) : boolean {
	debug(`pluginIsCurrent() dbPlugin => %o`, dbPlugin);
	debug(`pluginIsCurrent() installedPlugin => %o`, installedPlugin);
	debug(`pluginIsCurrent() remotePlugin => %o`, remotePlugin);
	return dbPlugin && installedPlugin && dbPlugin.version === remotePlugin.version && installedPlugin.version === remotePlugin.version;
}

async function ensureAppSettingsPackageJsonExists() : Promise<void> {

	try {
		
		let packageJsonFile = `${_pluginDirectory}/package.json`;
		let exists = await fs.pathExists(packageJsonFile);

		if(!exists) await fs.outputJson(packageJsonFile, { name: 'temp', version: '0.0.0' });
		return Promise.resolve();

	} catch (error) {
		debug('An error occurred reading/creating the plugin package.json file => %o', error);
		return Promise.reject(error);
	}
}