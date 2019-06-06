import { Module, Provider } from '@nestjs/common';
import { SalesforceFactory } from './SalesforceFactory';
import { JsforceModule } from '../packages/JsforceModule';

@Module({
	imports: [
		JsforceModule
	],
	providers: [
		SalesforceFactory
	],
	exports: [
		SalesforceFactory
	]
})
export class SalesforceModule {

}