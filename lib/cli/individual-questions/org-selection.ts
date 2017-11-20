import ask from './ask';

export default async function(choices: any[], userMessage: string) {
	return await ask({
		type: 'list',
		name: 'orgChoice',
		message: userMessage,
		choices
	});
}