const watch = require('node-watch');
const chalk = require('chalk');
const debug = require('debug')('svf:info watcher');

import { getPluginModule } from './plugins';

class Watcher {

	private _watcher: any = null;

	constructor(private org, private page) {
		debug(`Watcher page => %o`, page);
	}

	async start() : Promise<void> {
		
		if(this._watcher !== null) return;

		const plugin = await getPluginModule(this.page.pluginName);

		this._watcher = watch(this.page.outputDir);
		debug(`Watcher started for path: ${chalk.cyan(this.page.outputDir)}`);

		this._watcher.on('change', (event, file) => {
			debug(`File Change: ${file}`);
			plugin.onFileChange(this.org, this.page, file);
		});

		this._watcher.on('error', (err) => {
			debug(`File Watch Error: %o`, err);
		});
	}

	stop() : void {

		if(this._watcher === null) return;

		this._watcher.close();
		debug(`Watcher successfully stopped`);
	}
}

export default Watcher;