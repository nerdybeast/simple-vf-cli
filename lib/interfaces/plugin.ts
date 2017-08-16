import { PageConfig } from './page-config';

export interface Plugin {

	pageConfig(pageName?: string) : Promise<PageConfig>;

}