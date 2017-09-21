import { Plugin } from '../interfaces/plugin';
import { PageConfig } from '../interfaces/page-config';
import { getPageDetails } from '../cli';
import { Org } from '../models/org';
import { defaultHtml } from '../templates';

class DefaultPlugin implements Plugin {

	pageConfig(pageName?: string) : Promise<PageConfig> {
		return getPageDetails(pageName);
	}

	onFileChange(org: Org, page, file) { }

	getHtmlMarkup(page) : Promise<string> {
		return defaultHtml(page);
	}
}

export default new DefaultPlugin();