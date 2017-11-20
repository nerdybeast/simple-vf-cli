import ask from './ask';

export default async function() {
	return ask({
		type: 'input',
		name: 'pageName',
		message: 'Please enter the new VisualForce page name:'
	});
}