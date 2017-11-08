import { PageConfig } from './page-config';
import { Org } from '../models/org';
import { Page } from '../models/page';

export interface Plugin {
	pageConfig(pageName?: string) : Promise<PageConfig>;
	onFileChange(org: Org, page: Page, file: string) : void;
	getHtmlMarkup(page: Page) : Promise<string>;
	prepareForDevelopment(org: Org, page: Page) : Promise<void>;
}