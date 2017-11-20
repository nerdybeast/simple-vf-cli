import * as inquirer from 'inquirer';
import { Debug } from '../../utilities/debug';

const debug = new Debug('svf', 'ask');

export default async function(config) {
	
	let answers = await inquirer.prompt(config);
	debug.verbose(`${config.name} question raw answer`, answers);

	return answers[config.name];
}