import { Org } from '../models/org';
import askOrgSelection from './individual-questions/org-selection';
import { Debug } from '../utilities/debug';
import { OrgRepository } from '../JsonDB';

const debug = new Debug('svf', 'get-org-selection');

/**
 * Asks the user to select an authed org.
 */
export default async function(userMessage: string = 'Choose an org:', includeNewChoice: boolean = true) : Promise<Org> {
	
	try {

		const orgRepository = new OrgRepository();
		let orgs = await orgRepository.findAll();

		if(orgs.length === 0) return null;

		const choices = orgs.map(org => {
			return {
				name: `${org._id} (${org.username})`,
				value: org
			};
		})

		if(includeNewChoice) {
			choices.push({
				name: 'other',
				value: null
			});
		}

		return askOrgSelection(choices, userMessage);

	} catch (error) {
		debug.error(`error with org selection list `, error);
		throw error;
	}
}