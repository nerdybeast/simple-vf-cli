import { Debug } from '../utilities/debug';

const path = require('path');
const debug = new Debug('svf', 'project-root');

debug.verbose(`dirname => ${__dirname}`);

let projectRoot: string = path.join(__dirname, '../../');

debug.info(`project root full path => ${projectRoot}`);

export default projectRoot;