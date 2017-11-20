import { Config } from '../../models/config';
import ask from './ask';
const chalk = require('chalk');

export default async function(config: Config) : Promise<boolean> {
	
	//If the user answered true last install to allow error tracking, don't ask them again.
	if(config.ALLOW_ERROR_TRACKING) { return config.ALLOW_ERROR_TRACKING; }

	return ask({
		type: 'list',
		name: 'allowErrorTracking',
		message: `Do you want to allow simple-vf to collect errors and anonymous usage statistics? This can be changed any time using the ${chalk.bold.cyan('\`svf config\`')} command.`,
		choices: [
			{ name: 'yes (recommended)', value: true },
			{ name: 'no', value: false }
		]
	});
}