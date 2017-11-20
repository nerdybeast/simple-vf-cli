import stringValidation from '../lib/cli/validations/string';
import numberValidation from '../lib/cli/validations/integer';

describe('Cli validations', function() {

	const errorMessage = 'error';

	test('String Validation - passing in a known good value', function() {
		expect(stringValidation('actual value', errorMessage)).toBe(true);
	});

	test('String Validation - passing in a known good value with padding', function() {
		expect(stringValidation('    actual value    ', errorMessage)).toBe(true);
	});

	test('String Validation - passing in an empty string', function() {
		expect(stringValidation('', errorMessage)).toBe(errorMessage);
	});

	test('String Validation - passing in null', function() {
		expect(stringValidation(null, errorMessage)).toBe(errorMessage);
	});

	test('Number Validation - passing in a known good value', function() {
		expect(numberValidation('1234')).toBe(true);
	});

	test('Number Validation - passing in a known good value with extra spaces', function() {
		expect(numberValidation('    1234    ')).toBe(true);
	});

	test('Number Validation - passing in a mix of numbers and letters', function() {
		const result = numberValidation('1a2b3c4d');
		expect(typeof result).toBe('string');
	});

	test('Number Validation - passing in an empty value', function() {
		const result = numberValidation('');
		expect(typeof result).toBe('string');
	});

});