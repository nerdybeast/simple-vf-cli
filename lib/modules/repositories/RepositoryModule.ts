import { Module } from '@nestjs/common';
import { OrgRepository } from './OrgRepository';
import FsExtra from 'fs-extra';
import { join } from 'path';
import { FSExtraModule } from '../packages/FSExtraModule';
import { ConfigModule } from '../config/ConfigModule';
import { ConfigService } from '../config/ConfigService';

@Module({
	imports: [
		FSExtraModule,
		ConfigModule
	],
	providers: [
		OrgRepository,
		{
			provide: 'DB_PATH',
			inject: [
				'fs',
				ConfigService
			],
			useFactory: async (fs: typeof FsExtra, configService: ConfigService) => {

				const dbPath = join(configService.appSettingsLocation(), 'simple-vf-cli.db.json');
				const fileExists = await fs.pathExists(dbPath);

				if(!fileExists) {
					await fs.ensureFile(dbPath);
					await fs.writeJson(dbPath, []);
				} else {
					try {
						await fs.readJson(dbPath);
					} catch(error) {
						await fs.writeJson(dbPath, [])
					}
				}

				return dbPath;
			}
		}
	],
	exports: [
		OrgRepository
	]
})
export class RepositoryModule {

}