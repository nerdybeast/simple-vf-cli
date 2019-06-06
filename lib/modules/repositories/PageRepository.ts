import { RepositoryBase } from './RepositoryBase';
import { Inject, Injectable } from '@nestjs/common';
import FsExtra from 'fs-extra';
import { Page } from '../../models/page';

@Injectable()
export class PageRepository extends RepositoryBase<Page> {

	constructor(@Inject('fs') fs: typeof FsExtra, @Inject('DB_PATH') dbPath: string) {
		super('Page', fs, dbPath);
	}

	public async getAllPagesByOrg(orgId: string) : Promise<Page[]> {
		const allPages = await this.findAll();
		return allPages.filter(page => page.belongsTo === orgId);
	}
}