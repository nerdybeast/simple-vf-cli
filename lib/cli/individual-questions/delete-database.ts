import ask from './ask';

export default async function() {
	
	let config = {
		type: 'confirm',
		name: 'deleteDatabase',
		message: 'Are you sure you want to delete all org and page entries?'
	};

	return ask(config);
}