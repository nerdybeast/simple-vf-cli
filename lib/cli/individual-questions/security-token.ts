import ask from './ask';

export default async function(questionVerbage: string = 'Security Token', securityToken?: string) {
	
	//Inquirer.js treats an empty string as a legit default value so we need to force to undefined to avoid extra parenthesis in the user's output,
	//we need to avoid the output looking like this: "Security Token (hit enter to bypass): ()"
	if(!securityToken) securityToken = undefined;

	let suffix = securityToken ? `` : ' (hit enter to bypass)';

	let config: any = {
		type: 'input',
		name: 'securityToken',
		message: `${questionVerbage}${suffix}:`,
		default: securityToken
	};

	return ask(config);
}