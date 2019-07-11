import { Module } from '@nestjs/common';
import { FSExtraModule } from '../packages/FSExtraModule';
import { ConfigModule } from '../config/ConfigModule';
import { PluginService } from './PluginService';
import { WorkerModule } from '../worker/WorkerModule';

@Module({
	imports: [
		FSExtraModule,
		ConfigModule,
		WorkerModule
	],
	providers: [
		PluginService
	],
	exports: [
		PluginService
	]
})
export class PluginModule {

}