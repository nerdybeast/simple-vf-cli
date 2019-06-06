import { Module } from '@nestjs/common';
import { RepositoryModule } from '../repositories/RepositoryModule';
import { QuestionsModule } from '../questions/QuestionsModule';
import { AuthService } from './AuthService';

@Module({
	imports: [
		RepositoryModule,
		QuestionsModule
	],
	providers: [
		AuthService
	],
	exports: [
		AuthService
	]
})
export class AuthModule {

}