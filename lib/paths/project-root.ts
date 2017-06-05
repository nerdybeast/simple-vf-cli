import path = require('path');

let backTrack = __dirname.includes('dist') ? '../../../' : '../../';
let projectRoot: string = path.join(__dirname, backTrack);

export default projectRoot;