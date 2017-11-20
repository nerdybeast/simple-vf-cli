import ask from './ask';
const { cyan } = require('chalk');

export default async function() : Promise<string> {
	return ask({
		type: 'input',
		name: 'stopTunnel',
		message: `Hit 'enter' to stop development mode or type ${cyan('deploy')} and hit 'enter' to stop development mode and immediately deploy your app:`
	});
}