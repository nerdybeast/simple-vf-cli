import ask from './ask';
import validateString from '../validations/string';
import { isAbsolute, normalize } from 'path';

export default async function() {
	
	let config = {
		type: 'input',
		name: 'outputDir',
		message: 'Output directory for your localhost resource (ex: c:/projects/your-app/dist):',
		validate(userInput) {
			
			let errors = [];

			let validatedInput = validateString(userInput, 'output directory must contain a value');
			if(typeof validatedInput === 'string') errors.push(validatedInput);
			if(!isAbsolute(userInput)) errors.push(`path must be entered as an absolute value (example: c:/path/to/output/directory)`);

			return errors.length === 0 || `Error: ${errors.join(', ')}.`;
		}
	};

	let outputDir = await ask(config);
	return normalize(outputDir);
}