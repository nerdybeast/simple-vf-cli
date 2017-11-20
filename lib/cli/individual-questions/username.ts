import validateString from '../validations/string';
import ask from './ask';

export default async function(username?: string) : Promise<string> {
	
	let config: any = {
		type: 'input',
		name: 'username',
		message: `Username:`,
		default: username,
		validate(userInput) { return validateString(userInput, 'Username must contain a value'); }
	};

	return ask(config);
}