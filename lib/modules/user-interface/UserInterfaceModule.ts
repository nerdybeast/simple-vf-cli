import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/AuthModule';
import { UserInterfaceService } from './UserInterfaceService';
import { SalesforceModule } from '../salesforce-client/SalesforceModule';
import { DebugModule } from '../debug/DebugModule';
import { PasswordModule } from '../password/PasswordModule';

@Module({
	imports: [
		AuthModule,
		SalesforceModule,
		DebugModule,
		PasswordModule
	],
	providers: [
		UserInterfaceService
	],
	exports: [
		UserInterfaceService
	]
})
export class UserInterfaceModule {

}