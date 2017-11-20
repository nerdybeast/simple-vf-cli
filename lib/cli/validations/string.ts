export default function(userInput: string, errorMessage: string = 'Please enter a value') : boolean|string {
	userInput = (userInput || '').trim();
	let isValid = userInput.length > 0;
	return isValid || errorMessage;
}