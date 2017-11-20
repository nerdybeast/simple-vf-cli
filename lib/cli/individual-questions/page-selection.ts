import ask from './ask';

export default async function(choices: any[], message: string = 'Choose a page:') {
	return await ask({
		type: 'list',
		name: 'pageChoice',
		message,
		choices
	});
}