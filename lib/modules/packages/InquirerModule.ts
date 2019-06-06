import { Module, Provider } from '@nestjs/common';
import inquirer from 'inquirer';
import autocomplete from 'inquirer-autocomplete-prompt';

const inquirerProvider: Provider = {
	provide: 'inquirer',
	useFactory() {
		inquirer.registerPrompt('autocomplete', autocomplete);
		return inquirer;
	}
};

@Module({
	providers: [inquirerProvider],
	exports: [inquirerProvider]
})
export class InquirerModule {

}