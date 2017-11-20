import ask from './ask';

export default async function(orgType?: string) {
	
	let config = {
		type: 'list',
		name: 'orgType',
		message: 'Please select the type of org:',
		default: orgType,
		choices: [{
			name: 'sandbox',
			value: 'https://test.salesforce.com'
		}, {
			name: 'production',
			value: 'https://login.salesforce.com'
		}]
	};

	return ask(config);
}