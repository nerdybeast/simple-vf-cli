import db from '../db';
import { Debug } from '../utilities/debug';
import { Org } from '../models/org';
import { Page } from '../models/page';
import getPageSelection from './individual-questions/page-selection';
import * as _ from 'lodash';

const debug = new Debug('svf', 'get-page-selection');

/**
 * Returns a page object for the given org.
 */
export default async function(org: Org, allowOther: boolean = true) : Promise<Page> {
	
	try {
		
		let pages = <Page[]>(await db.getAllPages(org._id));

		let choices = _.map(pages, (page) => {
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