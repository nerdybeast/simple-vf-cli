import { Injectable, Inject } from '@nestjs/common';
import { Inquirer, Question } from 'inquirer';
import { Org } from '../../models/org';

@Injectable()
export class QuestionsService {

	private inquirer: Inquirer;

	constructor(@Inject('inquirer') inquirer: Inquirer) {
		this.inquirer = inquirer;
	}

	public async getOrgName(defaultOrgName?: string) : Promise<string> {

		const orgName = await this.ask<string>({
			type: 'input',
			message: 'Please enter the name of your Salesforce org (does not have to be the actual name of the org):',
			default: defaultOrgName,
			validate(userInput: string) {
				return QuestionsService.validateStringAnswer(userInput, 'You must enter a name for your Salesforce org');
			}
		});

		return orgName.trim();
	}

	/**
	 * Asks the user for the org type like "sandbox" or "production" but returns the login url.
	 * @param defaultValue 
	 */
	public async getLoginUrl(defaultLoginUrl?: string) : Promise<string> {

		const loginUrl = await this.ask<string>({
			type: 'list',
			message: 'Please select the type of org:',
			default: defaultLoginUrl,
			choices: [{
				name: 'sandbox',
				value: 'https://test.salesforce.com'
			}, {
				name: 'production',
				value: 'https://login.salesforce.com'
			}]
		});

		return loginUrl;
	}

	public async getUsername(defaultUserName?: string) {

		const username = await this.ask<string>({
			type: 'input',
			message: 'Username:',
			default: defaultUserName,
			validate(userInput: string) {
				return QuestionsService.validateStringAnswer(userInput, 'Username must contain a value');
			}
		});

		return username.trim();
	}

	public async getPassword() : Promise<string> {

		const password = await this.ask<string>({
			type: 'password',
			message: 'Password:',
			validate(userInput: string) {
				return QuestionsService.validateStringAnswer(userInput, 'Password must contain a value');
			}
		});

		return password.trim();
	}

	public async getSecurityToken(defaultSecurityToken?: string) : Promise<string> {

		let securityToken = await this.ask<string>({
			type: 'input',
			message: 'Security token (hit enter to bypass):',
			default: defaultSecurityToken,
			validate(userInput: string) {

				if(!userInput) {
					return true;
				}

				return QuestionsService.validateStringAnswer(userInput, 'If entered, the security token must be a valid value');
			}
		});

		if(typeof securityToken === 'string') {
			securityToken = securityToken.trim() || null;
		}

		return securityToken;
	}

	public async pickOrgFromList(existingOrgs: Org[], questionText: string = 'Choose an org:', includeOtherOption: boolean = true) : Promise<Org|null> {

		const choices = existingOrgs.map(org => {
			return {
				name: org.name,
				value: org
			};
		});

		if(includeOtherOption) {
			choices.push({
				name: 'other',
				value: null
			});
		}

		const selectedOrg = await this.ask<Org|null>({
			type: 'list',
			message: questionText,
			//@ts-ignore
			choices
		});

		return selectedOrg;
	}

	private async ask<T>(question: Question) : Promise<T> {
		question.name = question.name || 'answer';
		let answers = await this.inquirer.prompt(question);
		return answers[question.name];
	}

	private static validateStringAnswer(userInput: string, errorMessage: string) : string|boolean {
		userInput = (userInput || '').trim();
		if(userInput) return true;
		return errorMessage;
	}
}