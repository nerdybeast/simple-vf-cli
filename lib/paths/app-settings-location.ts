import { join } from 'path';

const os = require('os');

export default function appSettingsLocation() {
	
	let homeDir = os.homedir();
	let platform = os.platform();
	let appName = 'simple-vf-cli';
	
	let dbPath = '';
	
	switch(platform) {
		case 'win32':
			dbPath = `AppData/Local/${appName}`;
			break;
		case 'darwin':
			dbPath = `Library/Preferences/${appName}`;
			break;
		default:
			dbPath = `.${appName}`;
			break;
	}

	return join(homeDir, dbPath);
}