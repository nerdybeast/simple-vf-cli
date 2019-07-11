import { Injectable } from '@nestjs/common';
import { OrgRepository } from '../repositories/OrgRepository';
import { QuestionsService } from '../questions/QuestionsService';
import { Org } from '../../models/org';
import { OrgCredentials } from '../../models/org-credentials';
import { OrgNotFoundException } from '../repositories/OrgNotFoundException';

@Injectable()
export class AuthService {

	private orgRepository: OrgRepository;
	private questionService: QuestionsService;

	constructor(orgRepository: OrgRepository, questionService: QuestionsService) {
		this.orgRepository = orgRepository;
		this.questionService = questionService;
	}

	/**
	 * Will ask the user to pick an existing org name or enter a new one. The org name returned from this method
	 * does not mean the org is saved in the database.
	 * @param existingOrgName 
	 */
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

			try {

				org = await this.orgRepository.findByName(orgName);
				defaultLoginUrl = org.loginUrl;
				defaultUserName = org.username;
				defaultSecurityToken = org.securityToken;

			} catch(error) {
				if(!(error instanceof OrgNotFoundException)) {
					throw error;
				}
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

	public async orgIsSaved(orgName: string) : Promise<boolean> {

		try {

			await this.orgRepository.findByName(orgName);
			return true;

		} catch(error) {

			if(error instanceof OrgNotFoundException) {
				return false;
			}

			throw error;
		}

	}
}