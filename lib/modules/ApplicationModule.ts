import { Module } from '@nestjs/common';
import { UserInterfaceModule } from './user-interface/UserInterfaceModule';
import { DebugModule } from './debug/DebugModule';

@Module({
	imports: [
		DebugModule,
		UserInterfaceModule
	]
})
export class ApplicationModule {

}