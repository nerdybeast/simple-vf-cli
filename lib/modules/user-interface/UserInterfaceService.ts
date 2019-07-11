import { Injectable } from '@nestjs/common';
import { AuthService } from '../auth/AuthService';
import { SalesforceFactory } from '../salesforce-client/SalesforceFactory';
import { Org } from '../../models/org';
import { DebugService } from '../debug/DebugService';
import { OrgCredentials } from '../../models/org-credentials';
import { DebugFactory } from '../debug/DebugFactory';
import { PasswordService } from '../password/PasswordService';
import { QuestionsService } from '../questions/QuestionsService';
import { PluginService } from '../plugin/PluginService';

@Injectable()
export class UserInterfaceService {

	private authService: AuthService;
	private salesforceFactory: SalesforceFactory;
	private debugService: DebugService;
	private passwordService: PasswordService;
	private questionService: QuestionsService;
	private pluginService: PluginService;

	constructor(authService: AuthService, salesforceFactory: SalesforceFactory, debugFactory: DebugFactory, passwordService: PasswordService, questionService: QuestionsService, pluginService: PluginService) {
		this.authService = authService;
		this.salesforceFactory = salesforceFactory;
		this.debugService = debugFactory.create('UserInterfaceService');
		this.passwordService = passwordService;
		this.questionService = questionService;
		this.pluginService = pluginService;
	}

	public async auth(existingOrgName?: string, existingOrgCredentials?: OrgCredentials, bypassOrgNameQuestion: boolean = false) : Promise<Org> {

		let orgName;
		let orgCredentials;

		try {

			if(bypassOrgNameQuestion) {
				orgName = existingOrgName;
			} else {
				orgName = await this.authService.getOrgName(existingOrgName);
			}
			
			//Org name is fed in to see if the user has auth'd this org already. If an existing org is found
			//the user will get some default values present in the terminal for the org credentials.
			orgCredentials = await this.authService.getOrgCredentials(orgName, existingOrgCredentials);
			
			const jsforceConnection = this.salesforceFactory.create({
				loginUrl: orgCredentials.loginUrl
			});

			const password = orgCredentials.password + (orgCredentials.securityToken ? orgCredentials.securityToken : '');
			const loginResult = await jsforceConnection.login(orgCredentials.username, password);

			const org = new Org();
			org._id = loginResult.organizationId;
			org.loginUrl = orgCredentials.loginUrl;
			org.name = orgName;
			org.orgId = loginResult.organizationId;
			org.securityToken = orgCredentials.securityToken;
			org.userId = loginResult.id;
			org.username = orgCredentials.username;

			//These properties are only available on the jsforce connection after the login call has been ran.
			org.accessToken = jsforceConnection.accessToken;
			org.instanceUrl = jsforceConnection.instanceUrl;

			await this.authService.saveOrg(org);

			await this.passwordService.save(org._id, password);

		} catch (error) {

			this.debugService.log('auth error', {
				name: error.name,
				message: error.message,
				stack: error.stack
			});

			if(error.message.includes('INVALID_LOGIN') || error.message.includes('LOGIN_MUST_USE_SECURITY_TOKEN')) {
				//reporter.warning(error.message, { orgName }, error);
				//message.catchError(error);
				return await this.auth(orgName, orgCredentials, true);
			}
		}
	}

	public async page() : Promise<void> {

		try {

			await this.pluginService.getRemotePlugins();

			let orgName: string = await this.authService.getOrgName();
			const orgIsSaved: boolean = await this.authService.orgIsSaved(orgName);

			if(!orgIsSaved) {
				const org = await this.auth(orgName, undefined, true);
				orgName = org.name;
			}

			const isNewPage = await this.questionService.basicList('', [{
				name: 'new',
				value: true
			}, {
				name: 'existing',
				value: false
			}]);

			if(!isNewPage) {

			}

		} catch (error) {
			
		}
	}
}