const path = require('path');
const archiver = require('archiver');
const fs = require('fs-extra');
const chalk = require('chalk');
const debug = require('debug')('svf:info deploy');

import Salesforce from './salesforce';
import db from './db';
import SvfError from './models/svf-error';
import { Org } from './models/org';
import { Page } from './models/page';

const TEMP_DIR_PATH = path.join(__dirname, '../temp');

function _createZip(page: Page) : Promise<string> {

	try {
		fs.statSync(page.outputDir);
	} catch(ex) {
		let error = new SvfError(`The output directory (${chalk.cyan(page.outputDir)}) defined for the page ${chalk.cyan(page.name)} does not exist, make sure your project has been built and that your build output directory exists.`);
		error.isFatal = false;
		return Promise.reject(error);
	}

	return new Promise((resolve, reject) => {

		let zipFilePath = <string>path.join(TEMP_DIR_PATH, `${page.name}.zip`);
		debug(`zipFilePath for the zip folder that will be uploaded => ${zipFilePath}`);

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

export default async function(org: Org, page: Page) {

	await fs.ensureDir(TEMP_DIR_PATH);
	let zipFilePath = await _createZip(page);

	let sf = new Salesforce(org);
	let staticResourceId = await sf.saveStaticResource(page, zipFilePath);

	let promises = [fs.emptyDir(TEMP_DIR_PATH)];

	if(page.staticResourceId !== staticResourceId) {
		page.staticResourceId = staticResourceId;
		promises.push(db.update(page));
	}

	let [deleteTempDir, updateResult] = await Promise.all(promises);
	let result = { deleteTempDir, updateResult };

	debug(`deploy() result => %o`, result);

	return result;
}