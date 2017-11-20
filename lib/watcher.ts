import { getPluginModule } from './plugins';
import { Debug } from './utilities/debug';

const watch = require('node-watch');
const chalk = require('chalk');
const debug = new Debug('svf', 'watcher');

class Watcher {

	private _watcher: any = null;

	constructor(private org, private page) {
		debug.verbose(`watcher page`, page);
	}

	async start() : Promise<void> {
		
		if(this._watcher !== null) return;

		const plugin = await getPluginModule(this.page.pluginName);

		await plugin.prepareForDevelopment(this.org, this.page);

		this._watcher = watch(this.page.outputDir);
		debug.info(`Watcher started for path: ${chalk.cyan(this.page.outputDir)}`);

		this._watcher.on('change', (event, file) => {
			debug.verbose(`file change: ${file}`);
			plugin.onFileChange(this.org, this.page, file);
		});

		this._watcher.on('error', (err) => {
			debug.error(`file watch error`, err);
		});
	}

	stop() : void {

		if(this._watcher === null) return;

		this._watcher.close();
		debug.info(`Watcher successfully stopped`);
	}
}

export default Watcher;