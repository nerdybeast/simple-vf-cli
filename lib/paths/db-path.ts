import { join } from 'path';

const os = require('os');

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

export default join(homeDir, dbPath);