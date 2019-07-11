import { Module } from '@nestjs/common';
import { WorkerService } from './WorkerService';
import { ChildProcessModule } from '../packages/ChildProcessModule';

@Module({
	imports: [
		ChildProcessModule
	],
	providers: [
		WorkerService
	],
	exports: [
		WorkerService
	]
})
export class WorkerModule {

}