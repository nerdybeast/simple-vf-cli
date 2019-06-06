import { RepositoryBase } from './RepositoryBase';
import { Org } from '../../models/org';
import { Inject, Injectable } from '@nestjs/common';
import FsExtra from 'fs-extra';

@Injectable()
export class OrgRepository extends RepositoryBase<Org> {

	constructor(@Inject('fs') fs: typeof FsExtra, @Inject('DB_PATH') dbPath: string) {
		super('org', fs, dbPath);
	}

	public async findByName(orgName: string) : Promise<Org|void> {
		const orgs = await this.findAll();
		return orgs.find(org => org.name === orgName);
	}
}