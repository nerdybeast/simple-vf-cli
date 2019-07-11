import { Module, Global } from '@nestjs/common';
import { DebugFactory } from './DebugFactory';
import { DebugPackageModule } from '../packages/DebugPackageModule';
import { MomentModule } from '../packages/MomentModule';

/**
 * Registering this as a global module so that we can have debug logs everywhere.
 * NOTE: This module is only registered once in the ApplicationModule.
 * See: https://docs.nestjs.com/modules#global-modules
 */
@Global()
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