import { Module } from '@nestjs/common';
import { DebugFactory } from './DebugFactory';
import { DebugPackageModule } from '../packages/DebugPackageModule';
import { MomentModule } from '../packages/MomentModule';

@Module({
	imports: [
		DebugPackageModule,
		MomentModule
	],
	providers: [
		DebugFactory
	],
	exports: [
		DebugFactory
	]
})
export class DebugModule {

}