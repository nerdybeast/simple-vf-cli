import ask from './ask';
const { cyan } = require('chalk');

export default async function(portNumber?: number) {
	
	let suffix = portNumber ? `(default: ${cyan(portNumber)})` : `(example: 8080)`;

	let config = {
		type: 'input',
		name: 'port',
		message: `Port your local build system serves up on ${suffix}, value must be a number:`,
		default: portNumber,
		validate(userInput) {
			userInput = (userInput || '').trim();
			let hasValue = (userInput && userInput.length > 0);
			if(!hasValue) return 'Please enter a port number';
			if(!Number.isInteger(Number(userInput))) return 'Port must contain numbers only';
			return true;
		}
	};

	return ask(config);
}