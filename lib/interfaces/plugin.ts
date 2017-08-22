import { PageConfig } from './page-config';
import Org from '../models/org';

export interface Plugin {

	pageConfig(pageName?: string) : Promise<PageConfig>;

	onFileChange(org: Org, page, file);
}