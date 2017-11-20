import { PageConfig } from '../interfaces/page-config';
import { askForPageName, askForPortNumber } from '../cli';
import resolveOutputDirectory from './resolve-output-directory';

/**
 * Retrieves the page config details like name, port, output directory. This method is used by the default plugin.
 */
export default async function(pageName?: string) : Promise<PageConfig> {
	
	let name = await askForPageName();
	let port = await askForPortNumber();
	let outputDirectory = await resolveOutputDirectory();

	return { name, port, outputDirectory };
}