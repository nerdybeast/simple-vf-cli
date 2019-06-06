import { Module } from '@nestjs/common';
import { OSModule } from '../packages/OSModule';
import { ConfigService } from './ConfigService';

@Module({
	imports: [
		OSModule
	],
	providers: [
		ConfigService
	],
	exports: [
		ConfigService
	]
})
export class ConfigModule {

}