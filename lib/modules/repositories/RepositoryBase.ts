import fsExtra from 'fs-extra';
import { IDatabaseRecord } from '../../models/IDatabaseRecord';

export abstract class RepositoryBase<T extends IDatabaseRecord> {

	private recordType: string;
	private fs: typeof fsExtra;
	private dbPath: string;

	constructor(recordType: string, fs: typeof fsExtra, dbPath: string) {
		this.recordType = recordType;
		this.fs = fs;
		this.dbPath = dbPath;
	}

	public async getById(id: string) : Promise<T> {
		const data = await this.getData();
		return data.find(x => x._id === id);
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

	public async save(record: T) : Promise<T> {

		const data = await this.getData();
		const existingRecordIndex = data.findIndex(x => x._id === record._id);

		//Record is new
		if(existingRecordIndex === -1) {
			data.push(record);
		} else {
			data[existingRecordIndex] = record;
		}

		await this.commit(data);

		return record;
	}

	public async findAll() : Promise<T[]> {
		const data = await this.getData();
		return data.filter(x => x.type === this.recordType);
	}

	protected async getData() : Promise<T[]> {
		const data: T[] = await this.fs.readJson(this.dbPath);
		return data;
	}

	protected async commit(records: T[]) {
		await this.fs.writeJson(this.dbPath, records, {
			spaces: 2
		});
	}
}