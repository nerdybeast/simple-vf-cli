import { IDatabaseRecord } from './IDatabaseRecord';

export class Page implements IDatabaseRecord {
	type: string = 'page';
	_id: string;
	name: string;
	outputDir: string;
	salesforceId: string;
	staticResourceId: string;
	pluginName: string;
	belongsTo: string;
	port: number;
}