import { Plugin } from '../interfaces/plugin';
import { PageConfig } from '../interfaces/page-config';
import { askForPageConfig } from '../cli';
import { Org } from '../models/org';
import { Page } from '../models/page';
import { defaultHtml } from '../templates';

class DefaultPlugin implements Plugin {

	pageConfig(pageName?: string) : Promise<PageConfig> {
		return askForPageConfig(pageName);
	}

	onFileChange(org: Org, page, file) { }

	getHtmlMarkup(page) : Promise<string> {
		return defaultHtml(page);
	}

	prepareForDevelopment(org: Org, page: Page) : Promise<void> {
		return;
	}
}

export default new DefaultPlugin();