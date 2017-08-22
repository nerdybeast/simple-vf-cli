import { Plugin } from '../interfaces/plugin';
import { getPageDetails } from '../cli';
import Org from '../models/org';

class DefaultPlugin implements Plugin {

	pageConfig(pageName?: string) {
		return getPageDetails(pageName);
	}

	onFileChange(org: Org, page, file) { }

}

export default new DefaultPlugin();