import { join } from 'path';
import NodeJsonDB from 'node-json-db';
import uuid from 'uuid/v4';
import { appSettingsLocation } from './paths';
import { Org } from './models/org';
import { Page } from './models/page';
import { IDatabaseRecord } from './models/IDatabaseRecord';

function createDatabaseInstance() : NodeJsonDB {
	const dbPath = join(appSettingsLocation(), 'simple-vf-cli.db.json');
	const dbInstance = new NodeJsonDB(dbPath, true, true);
	return dbInstance;
}

export function deleteAllData() {
	createDatabaseInstance().delete('/');
}

abstract class Repository<T extends IDatabaseRecord> {

	protected db: NodeJsonDB;
	protected path: string;

	constructor(path: string) {
		this.db = createDatabaseInstance();
		this.path = path;
	}

	public async getById(id: string) : Promise<T> {
		return this.getData().find(x => x._id === id);
	}

	public async getWithDefault(id: string, defaultValue: any = null) : Promise<T> {

		if(!id) {
			return defaultValue;
		}

		const record = await this.getById(id);

		if(record) {
			return record;
		}

		return defaultValue;
	}

	public async post(record: T) : Promise<T> {
		record._id = record._id || uuid();
		this.db.push(`${this.path}[]`, record);
		return record;
	}

	public async findAll() : Promise<T[]> {
		return this.getData();
	}

	/**
	 * Used to create a record that has its id set already.
	 * @param record 
	 */
	public async put(record: T) : Promise<T> {
		return this.post(record);
	}

	public async update(record: T) : Promise<T> {
		const records = this.getData();
		const index = records.findIndex(x => x._id === record._id);
		this.db.push(`${this.path}[${index}]`, record);
		return record;
	}

	private getData() : T[] {
		try {
			return this.db.getData(this.path) || [];
		} catch (error) {

			//Path in the db doesn't exist yet;
			if(error.id && error.id === 5) {
				this.db.push(this.path, []);
				return [];
			}

			throw error;
		}
	}
}

export class OrgRepository extends Repository<Org> {

	constructor() {
		super('/orgs');
	}

}

export class PageRepository extends Repository<Page> {

	constructor() {
		super('/pages');
	}

	public async getAllPagesByOrg(orgId: string) : Promise<Page[]> {
		const allPages = await this.findAll();
		return allPages.filter(page => page.belongsTo === orgId);
	}
}