const path = require('path');
const debug = require('debug')('svf:info project-root');

debug(`dirname => ${__dirname}`);

let projectRoot: string = path.join(__dirname, '../../');

debug(`project root full path => ${projectRoot}`);

export default projectRoot;