import { Injectable } from '@nestjs/common';
import { OrgRepository } from '../repositories/OrgRepository';
import { QuestionsService } from '../questions/QuestionsService';
import { Org } from '../../models/org';
import { OrgCredentials } from '../../models/org-credentials';

@Injectable()
export class AuthService {

	private orgRepository: OrgRepository;
	private questionService: QuestionsService;

	constructor(orgRepository: OrgRepository, questionService: QuestionsService) {
		this.orgRepository = orgRepository;
		this.questionService = questionService;
	}

	public async getOrgName(existingOrgName?: string) : Promise<string> {

		//NOTE: "existingOrgName" may not be the exact value the user wants (perhaps they mis-typed)
		//It should only be used as the default value in a question, not returned from this method as
		//a short curcuit option.

		const allOrgs = await this.orgRepository.findAll();

		if(allOrgs.length !== 0) {

			const selectedOrg = await this.questionService.pickOrgFromList(allOrgs);

			if(selectedOrg !== null) {
				return selectedOrg.name;
			}
		}

		const orgName = await this.questionService.getOrgName(existingOrgName);

		return orgName;
	}

	public async getOrgCredentials(orgName?: string, orgCredentials?: OrgCredentials) : Promise<OrgCredentials> {

		let org;
		let defaultLoginUrl;
		let defaultUserName;
		let defaultSecurityToken;

		if(orgCredentials !== undefined) {

			defaultLoginUrl = orgCredentials.loginUrl;
			defaultUserName = orgCredentials.username;
			defaultSecurityToken = orgCredentials.securityToken;

		} else if(orgName !== undefined) {

			org = await this.orgRepository.findByName(orgName);

			if(org !== undefined) {
				defaultLoginUrl = org.loginUrl;
				defaultUserName = org.username;
				defaultSecurityToken = org.securityToken;
			}
		}

		const newOrgCredentials = new OrgCredentials();
		newOrgCredentials.loginUrl = await this.questionService.getLoginUrl(defaultLoginUrl);
		newOrgCredentials.username = await this.questionService.getUsername(defaultUserName);
		newOrgCredentials.password = await this.questionService.getPassword();
		newOrgCredentials.securityToken = await this.questionService.getSecurityToken(defaultSecurityToken);

		return newOrgCredentials;
	}

	public async saveOrg(org: Org) : Promise<void> {
		await this.orgRepository.save(org);
	}
}