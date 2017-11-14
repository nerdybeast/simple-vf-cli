import { Salesforce } from './salesforce';
import db from './db';
import { Org } from './models/org';
import { Page } from './models/page';
import { Debug } from './utilities/debug';
import * as fs from 'fs-extra';
import { join } from 'path';

const archiver = require('archiver');
const chalk = require('chalk');
const debug = new Debug('svf', 'deploy');
const TEMP_DIR_PATH = join(__dirname, '../temp');

function _createZip(page: Page) : Promise<string> {

	try {
		fs.statSync(page.outputDir);
	} catch(ex) {
		let error = new Error(`The output directory (${chalk.cyan(page.outputDir)}) defined for the page ${chalk.cyan(page.name)} does not exist, make sure your project has been built and that your build output directory exists.`);
		return Promise.reject(error);
	}

	return new Promise((resolve, reject) => {

		let zipFilePath = join(TEMP_DIR_PATH, `${page.name}.zip`);
		debug.info(`zipFilePath for the zip folder that will be uploaded`, zipFilePath);

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

	debug.info(`deploy() result`, result);

	return result;
}