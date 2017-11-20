import mockAppSettingsLocation from '../utilities/mock-app-settings-location';
mockAppSettingsLocation('../../temp');

jest.mock('../../lib/cli/individual-questions/ask.ts', () => {
	return {
		default() {
			return 'https://test.salesforce.com';
		}
	};
});

import askOrgType from '../../lib/cli/individual-questions/org-type';

describe('Org type question', function() {

	test('Ask for org type', async function() {
		const orgType = await askOrgType();
		expect(orgType).toBe('https://test.salesforce.com');
	});

});