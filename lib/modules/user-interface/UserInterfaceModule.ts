import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/AuthModule';
import { UserInterfaceService } from './UserInterfaceService';
import { SalesforceModule } from '../salesforce-client/SalesforceModule';
import { PasswordModule } from '../password/PasswordModule';
import { QuestionsModule } from '../questions/QuestionsModule';
import { PluginModule } from '../plugin/PluginModule';

@Module({
	imports: [
		AuthModule,
		SalesforceModule,
		PasswordModule,
		QuestionsModule,
		PluginModule
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