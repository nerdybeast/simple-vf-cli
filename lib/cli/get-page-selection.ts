import { PageRepository } from '../JsonDB';
import { Debug } from '../utilities/debug';
import { Org } from '../models/org';
import { Page } from '../models/page';
import getPageSelection from './individual-questions/page-selection';

const debug = new Debug('svf', 'get-page-selection');

/**
 * Returns a page object for the given org.
 */
export default async function(org: Org, allowOther: boolean = true) : Promise<Page> {

	try {

		const pageRepository = new PageRepository();
		let pages = await pageRepository.getAllPagesByOrg(org._id);

		const choices = pages.map(page => {
			return {
				name: `${page.name} (${page.port} | ${page.outputDir})`,
				value: page
			};
		});

		if(allowOther) {
			choices.push({
				name: 'other',
				value: null
			});
		}

		return getPageSelection(choices);

	} catch (error) {
		debug.error(`get page by org error`, error);
		throw error;
	}
}