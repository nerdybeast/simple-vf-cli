import { askForOutputDirectory, confirmOutputDirectory } from './index';
import { Message } from '../message';
import { stat as fsStat } from 'fs-extra';
const { cyan } = require('chalk');

export default async function resolveOutputDirectory(outputDir?: string) {
	
	if(outputDir) {
		
		try {
			
			await fsStat(outputDir);
			return outputDir;

		} catch (error) {
			
			console.log();
			Message.warn(`The output directory ${cyan(outputDir)} doesn\'t exist yet!`);
			console.log();

			let confirmedOutputDir = await confirmOutputDirectory(outputDir);

			if(confirmedOutputDir) return outputDir;

			return resolveOutputDirectory();
		}
	}

	let chosenOutputDir = await askForOutputDirectory();
	return resolveOutputDirectory(chosenOutputDir);
}