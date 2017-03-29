'use strict';

const os = require('os');
const path = require('path');
const packageJson = require('../package.json');

let homeDir = os.homedir();
let platform = os.platform();
let appName = packageJson.name;

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

module.exports = path.join(homeDir, dbPath);