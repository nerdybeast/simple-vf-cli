export default function(userInput: string) : boolean|string {
	userInput = (userInput || '').trim();
	let hasValue = (userInput && userInput.length > 0);
	if(!hasValue) return 'Please enter a port number';
	if(!Number.isInteger(Number(userInput))) return 'Port must contain numbers only';
	return true;
}