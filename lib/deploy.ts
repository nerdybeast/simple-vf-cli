const path = require('path');
const Promise = require('bluebird');
const archiver = require('archiver');
const fs = Promise.promisifyAll(require('fs-extra'));
const chalk = require('chalk');
const debug = require('debug')('svf:info deploy');

import Salesforce from './salesforce';
import db from './db';
import SvfError from './models/svf-error';
import Org from './models/org';

const TEMP_DIR_PATH = path.join(__dirname, '../temp');

function _createZip(page) {

	try {
		fs.statSync(page.outputDir);
	} catch(ex) {
		let error = new SvfError(`The output directory (${chalk.cyan(page.outputDir)}) defined for the page ${chalk.cyan(page.name)} does not exist, make sure your project has been built and that your build output directory exists.`);
		error.isFatal = false;
		return Promise.reject(error);
	}

	return new Promise((resolve, reject) => {

		let zipFilePath = path.join(TEMP_DIR_PATH, `${page.name}.zip`);

		let output = fs.createWriteStream(zipFilePath);
		let archive = archiver('zip');
		
		archive.directory(page.outputDir, '/');
		
		archive.pipe(output);
		archive.finalize();

		output.on('close', () => {
			return resolve(zipFilePath);
		});

		archive.on('error', (err) => {
			return reject(err);
		});

	});
}

export default function(org: Org, page) {

	return fs.ensureDirAsync(TEMP_DIR_PATH).then(() => {

		return _createZip(page);

	}).then(zipFilePath => {

		debug(`zipFilePath => ${zipFilePath}`);

		let sf = new Salesforce(org);
		return sf.saveStaticResource(page, zipFilePath);

	}).then(staticResourceId => {

		let promiseHash: any = {
			deleteTempDir: fs.emptyDirAsync(TEMP_DIR_PATH)
		};

		if(page.staticResourceId !== staticResourceId) {
			page.staticResourceId = staticResourceId;
			promiseHash.updateResult = db.update(page);
		}

		return Promise.props(promiseHash);

	}).catch(err => {

		debug('deploy error => %o', err);
		return Promise.reject(err);

	});

}