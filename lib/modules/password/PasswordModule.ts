import { Module } from '@nestjs/common';
import { KeytarModule } from '../packages/KeytarModule';
import { PasswordService } from './PasswordService';

@Module({
	imports: [
		KeytarModule
	],
	providers: [
		PasswordService
	],
	exports: [
		PasswordService
	]
})
export class PasswordModule {

}