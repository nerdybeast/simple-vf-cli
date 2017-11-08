const path = require('path');
const PouchDB = require('pouchdb');
const randomString = require('randomstring');
const fs = require('fs-extra');
const debug = require('debug')('svf:info db');
import errorReporter from './error-reporter';
import { ErrorMetadata } from './models/error-metadata';
import { appSettingsLocation } from './paths';
import { Org } from './models/org';
import { Page } from './models/page';

PouchDB.plugin(require('pouchdb-find'));

PouchDB.plugin({

	getWithDefault(id, defaultValue = null) {

		if(!id) {
			return Promise.resolve(defaultValue);
		}

		return this.get(id).catch(async (err) => {

			debug(`getWithDefault() error => %o`, err);

			if(err.name !== 'not_found') {

				let ex = new Error(err.message);
				ex = convertRollbarError(ex, err);
				
				let meta = new ErrorMetadata('getWithDefault', { id });
				await errorReporter.error(ex, meta);

				throw err;
			}

			return Promise.resolve(defaultValue);
		});
	},

	update(doc) {

		return this.getWithDefault(doc._id).then(foundDoc => {

			if(foundDoc) {
				doc._rev = foundDoc._rev;
			}

			return this.put(doc);

		}).then(updateResult => {

			debug(`updateResult on doc ${doc._id} => %o`, updateResult);
			return this.getWithDefault(doc._id);

		}).catch(async (err) => {

			debug(`updateResult error on doc ${doc._id} => %o`, err);
			
			let ex = new Error(err.message);
			ex = convertRollbarError(ex, err);

			//Strip out just these properties to send to rollbar, we don't want to send sensitive user info.
			let { type, _id } = doc;

			let meta = new ErrorMetadata('update', { type, _id });
			await errorReporter.error(ex, meta);

			throw err;
		});

	},

	getEncryptionKey() {

		let dbKey = 'ENCRYPTION_KEY';
		
		return this.getWithDefault(dbKey).then(doc => {

			if(doc) {
				return Promise.resolve(doc.encryptionKey);
			}

			let newDoc = {
				_id: dbKey,
				encryptionKey: randomString.generate(16),
				type: 'encryption'
			};

			return this.put(newDoc).then(putResult => {
				debug(`putResult for inserting new encryption key => %o`, putResult);
				return Promise.resolve(newDoc.encryptionKey);
			});

		}).catch(async (err) => {
			
			let ex = new Error(err.message);
			ex = convertRollbarError(ex, err);

			let meta = new ErrorMetadata('getEncryptionKey');
			await errorReporter.error(ex, meta);
			
			throw err;
		});

	},

	getAllOrgs() : Promise<Org[]> {
		return this.find({
			selector: { type: 'auth' }
		}).then(searchResult => {
			return searchResult.docs;
		});
	},

	async getAllPages(orgId?: string) : Promise<Page[]> {
		
		let selector: any = {
			type: 'page'
		};

		if(orgId) selector.belongsTo = orgId;

		let pagesQueryResult = await this.find({ selector });
		return pagesQueryResult.docs;
	}
	
});

let db;

try {

	fs.ensureDirSync(appSettingsLocation);
	let fullDbPath = path.join(appSettingsLocation, '.simple-vf-db');
	debug(`DB will be create at => ${fullDbPath}`);

	db = new PouchDB(fullDbPath);
	db.on('created', (dbInfo) => debug(`${dbInfo.name} created`));

	let changes = db.changes({
		live: true,
		since: 'now',
		include_docs: true
	});

	changes.on('change', (change) => debug(`db change result => %o`, change));

	changes.on('error', async (err) => {

		debug(`db change err => %o`, err);

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
