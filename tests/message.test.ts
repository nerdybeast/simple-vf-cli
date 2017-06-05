import message from '../lib/message';

describe('Testing "../lib/message" module', function() {

	let initialText = 'initial';

	test('Should be alive when initialized', function() {
		expect(message._isAlive).toBe(true);
	});

	test('Starting a message should set the text', function() {
		message.start(initialText);
		expect(message._message.text).toBe(initialText);
	});

	test('Stopping the message should not kill the instance', function() {
		message.stop();
		expect(message._isAlive).toBe(true);
	});

	test('Starting the message again without new text should use the previous text', function() {
		message.start();
		expect(message._message.text).toBe(initialText);
	});

	test('Starting the message again without new text should use the previous text', function() {
		message.stop();

		let newText = 'Here is a new message';
		message.start(newText);
		
		expect(message._message.text).toBe(newText);
	});
});