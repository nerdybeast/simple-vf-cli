'use strict';

const watch = require('node-watch');
const chalk = require('chalk');
const debug = require('debug')('svf:info watcher');

class Watcher {

	private _filePath: string;
	private _watcher: any = null;

	constructor(filePath: string) {
		this._filePath = filePath;
	}

	start() : void {
		
		if(this._watcher !== null) return;

		this._watcher = watch(this._filePath);
		debug(`Watcher started for path: ${chalk.cyan(this._filePath)}`);

		this._watcher.on('change', (file) => {
			debug(`File Change: ${file}`);
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