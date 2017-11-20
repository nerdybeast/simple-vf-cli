import ask from './ask';
const { cyan } = require('chalk');

export default async function(outputDir: string) {
	return ask({
		type: 'list',
		name: 'confirmOutputDir',
		message: `Choose, "Yes" to keep ${cyan(outputDir)}, choose "No" to re-enter the ouput directory path:`,
		default: false,
		choices: [{
			name: 'Yes',
			value: true
		}, {
			name: 'No',
			value: false
		}]
	});
}