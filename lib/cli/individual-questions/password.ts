import ask from './ask';
import validateString from '../validations/string';

export default async function() {
	
	let config: any = {
		type: 'password',
		name: 'password',
		message: 'Password:',
		validate(userInput) { return validateString(userInput, 'Password must contain a value'); }
	}

	return ask(config);
}