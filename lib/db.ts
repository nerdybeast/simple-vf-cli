import errorReporter from './error-reporter';
import { ErrorMetadata } from './models/error-metadata';
import { appSettingsLocation } from './paths';
import { Org } from './models/org';
import { Page } from './models/page';
import { Debug } from './utilities/debug';

const path = require('path');
const PouchDB = require('pouchdb');
const randomString = require('randomstring');
const fs = require('fs-extra');
const debug = new Debug('svf', 'db');

PouchDB.plugin(require('pouchdb-find'));

PouchDB.plugin({

	async getWithDefault(id, defaultValue = null) {

		if(!id) {
			debug.verbose(`no document id provided, returning default value`, defaultValue);
			return defaultValue;
		}

		try {

			//NOTE: You have to await pouchdb "native" functions when inside an async method, not sure why though.
			//Without waiting it's like it doesn't return a promise like it should be...
			let doc = await this.get(id);
			debug.verbose(`getWithDefault result`, doc);

			return doc;

		} catch (error) {
		
			debug.verbose(`raw error from getWithDefault for doc "${id}"`, error);

			if(error.name !== 'not_found') {
				let meta = new ErrorMetadata('getWithDefault', { id });
				await processError(meta, `failed to get document "${id}"`, error);
			}

			debug.verbose(`id "${id}" not found in the database, returning the default value`, defaultValue);

			return defaultValue;
		}
	},

	async update(doc) {

		try {
			
			let foundDoc = await this.getWithDefault(doc._id);

			if(foundDoc) {
				doc._rev = foundDoc._rev;
			}

			let updateResult = await this.put(doc);
			debug.verbose(`update result on document "${doc._id}"`, updateResult);

			return this.getWithDefault(doc._id);

		} catch (error) {
			
			//Strip out just these properties to send to rollbar, we don't want to send sensitive user info.
			let { type, _id } = doc;

			let meta = new ErrorMetadata('update', { type, _id });

			await processError(meta, `failed to update document "${doc._id}"`, error);
		}
	},

	async getEncryptionKey() {

		try {
		
			let dbKey = 'ENCRYPTION_KEY';
			const doc = await this.getWithDefault(dbKey);

			if(doc) { return doc.encryptionKey; }

			let putResult = await this.put({
				_id: dbKey,
				encryptionKey: randomString.generate(16),
				type: 'encryption'
			});

			debug.verbose(`adding new encryption key to the database result`, putResult);

			return (await this.getWithDefault(dbKey)).encryptionKey;

		} catch (error) {
			let meta = new ErrorMetadata('getEncryptionKey');
			await processError(meta, `failed to get/set the encryption key in the database`, error);
		}
	},

	async getAllOrgs() : Promise<Org[]> {
		
		try {
			
			const searchResult = await this.find({
				selector: { type: 'auth' }
			});

			return searchResult.docs;

		} catch (error) {
			let meta = new ErrorMetadata('getAllOrgs');
			await processError(meta, `failed to find database records with a type of "auth"`, error);
		}
	},

	async getAllPages(orgId?: string) : Promise<Page[]> {
		
		try {
		
			let selector: any = {
				type: 'page'
			};
	
			if(orgId) selector.belongsTo = orgId;
	
			let pagesQueryResult = await this.find({ selector });
			return pagesQueryResult.docs;

		} catch (error) {
			let meta = new ErrorMetadata('getAllOrgs');
			await processError(meta, `failed to find database records with a type of "page"`, error);
		}
	}
	
});

async function processError(meta, message, error) {

	debug.error(message, error);
	
	let ex = new Error(error.message);
	ex = convertRollbarError(ex, error);

	await errorReporter.error(ex, meta);
	
	throw error;
}

let db;

try {

	fs.ensureDirSync(appSettingsLocation);
	let fullDbPath = path.join(appSettingsLocation, '.simple-vf-db');
	debug.info(`database will be created at`, fullDbPath);

	db = new PouchDB(fullDbPath);
	db.on('created', (dbInfo) => debug.verbose(`${dbInfo.name} created`));

	let changes = db.changes({
		live: true,
		since: 'now',
		include_docs: true
	});

	changes.on('change', (change) => debug.verbose(`database change result`, change));

	changes.on('error', async (err) => {

		debug.error(`database change error`, err);

		let ex = new Error(err.message);
		ex = convertRollbarError(ex, err);

		await errorReporter.warning('pouchdb doc change error', null, ex);
	});

} catch(ex) {

	let meta = new ErrorMetadata('db.ts file', { appSettingsLocation });
	errorReporter.critical(ex, meta, 'Error initializing PouchDB');
}

function convertRollbarError(ex, rollbarError) {
	ex.name = rollbarError.name;
	ex.originalError = rollbarError;
	return ex;
}

export default db;
