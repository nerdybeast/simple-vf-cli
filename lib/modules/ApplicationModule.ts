import { Module } from '@nestjs/common';
import { UserInterfaceModule } from './user-interface/UserInterfaceModule';

@Module({
	imports: [
		UserInterfaceModule
	]
})
export class ApplicationModule {

}