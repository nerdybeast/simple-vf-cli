import { RepositoryBase } from './RepositoryBase';
import { Org } from '../../models/org';
import { Inject, Injectable } from '@nestjs/common';
import FsExtra from 'fs-extra';
import { OrgNotFoundException } from './OrgNotFoundException';

@Injectable()
export class OrgRepository extends RepositoryBase<Org> {

	constructor(@Inject('fs') fs: typeof FsExtra, @Inject('DB_PATH') dbPath: string) {
		super('org', fs, dbPath);
	}

	public async findByName(orgName: string) : Promise<Org> {

		const orgs = await this.findAll();
		const org = orgs.find(org => org.name === orgName);

		if(!org) {
			throw new OrgNotFoundException(orgName);
		}

		return org;
	}
}