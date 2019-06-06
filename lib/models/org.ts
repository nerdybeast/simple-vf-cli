import { IDatabaseRecord } from './IDatabaseRecord';

export class Org implements IDatabaseRecord {
	loginUrl: string;
	instanceUrl: string;
	username: string;
	securityToken: string;
	userId: string;
	orgId: string;
	accessToken: string;
	name: string;
	_id: string;
	type: string = 'org';
}