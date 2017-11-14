import projectRoot from '../paths/project-root';
import { appSettingsLocation } from '../paths';
import * as fs from 'fs-extra';
import { join } from 'path';

const packageJson = require(join(projectRoot, 'package.json'));

export class Config {
	ALLOW_ERROR_TRACKING: boolean;
	ROLLBAR_AUTH_TOKEN: string;
}

export async function getRollbarAuthToken() {
	
	//Can only be true if repo is cloned onto dev's machine meaning they are most likely developing in this project.
	if(await fs.pathExists(join(projectRoot, 'lib'))) {
		return 'e389c4de92694d668fd8a30391c4f8d0';
	}

	if(packageJson.version.includes('beta')) {
		return '58c3ecf40cec4e328fca3fded6ce150b';
	}

	return 'ddd5e5c736804c00999f8dddb7d6af29';
}