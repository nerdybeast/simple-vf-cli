'use strict';

const os = require('os');
const path = require('path');

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

export default path.join(homeDir, dbPath);