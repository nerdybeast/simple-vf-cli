import { Debug } from '../utilities/debug';
import { join } from 'path';

const debug = new Debug('svf', 'project-root');

debug.verbose(`dirname => ${__dirname}`);

let projectRoot: string = join(__dirname, '../../');

debug.info(`project root full path => ${projectRoot}`);

export default projectRoot;