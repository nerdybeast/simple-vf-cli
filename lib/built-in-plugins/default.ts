import { Plugin } from '../interfaces/plugin';
import { getPageDetails } from '../cli';

class DefaultPlugin implements Plugin {

	pageConfig(pageName?: string) {
		return getPageDetails(pageName);
	}

}

export default new DefaultPlugin();