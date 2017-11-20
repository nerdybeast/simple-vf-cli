import ask from './ask';

export default async function() {
	
	let config = {
		type: 'list',
		name: 'plugin',
		message: 'Build system:',
		choices: [{
			name: 'ember-cli',
			value: '@svf/plugin-ember-cli'
		}, {
			name: 'other',
			value: 'default'
		}]
	};

	return ask(config);
}