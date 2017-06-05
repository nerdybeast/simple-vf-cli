const path = require('path');
import projectRoot from '../lib/paths/project-root';

describe('Testing "../lib/paths/project-root" module', function() {

	let knownRootPath = path.join(__dirname, '../');

	test('project-root module returns path that matches the known path', function() {
		expect(projectRoot).toBe(knownRootPath);
	});

});