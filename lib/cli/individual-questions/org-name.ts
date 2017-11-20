import ask from './ask';
import validateString from '../validations/string';

export default async function(orgName?: string, questionVerbage?: string) {
	
	let config = {
		type: 'input',
		name: 'orgName',
		message: questionVerbage || `Please enter a name to act as an alias for this org:`,
		default: orgName,
		validate(userInput) { return validateString(userInput, 'Org name must contain a value'); }
	};

	return ask(config);
}