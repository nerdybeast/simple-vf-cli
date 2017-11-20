import { Debug } from '../utilities/debug';
import { Org } from '../models/org';
import { OrgCredentials } from '../models/org-credentials';
import askOrgType from './individual-questions/org-type';
import askUsername from './individual-questions/username';
import askPassword from './individual-questions/password';
import askSecurityToken from './individual-questions/security-token';

const debug = new Debug('svf', 'get-org-credentials');

export default async function(org?: Org) : Promise<OrgCredentials> {
	
	debug.verbose(`getOrgCredentials() org`, org);

	//Initialize this parameter to an object to help avoid null reference errors.
	org = org || new Org();

	let orgType = await askOrgType(org.loginUrl);
	let username = await askUsername(org.username);
	let password = await askPassword();
	let securityToken = await askSecurityToken(undefined, org.securityToken)

	let credentials = { orgType, username, password, securityToken };
	debug.verbose(`getOrgCredentials() return value`, credentials);

	return credentials;
}