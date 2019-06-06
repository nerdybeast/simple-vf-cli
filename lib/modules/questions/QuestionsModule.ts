import { Module } from '@nestjs/common';
import { QuestionsService } from './QuestionsService';
import { InquirerModule } from '../packages/InquirerModule';

@Module({
	imports: [
		InquirerModule
	],
	providers: [
		QuestionsService
	],
	exports: [
		QuestionsService
	]
})
export class QuestionsModule {

}