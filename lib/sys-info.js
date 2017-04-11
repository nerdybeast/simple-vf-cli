'use strict';

const os = require('os');

module.exports = function() {

	let { node, v8 } = process.versions;

	//The process.memoryUsage() method returns an object describing the memory usage of the Node.js process measured in bytes.
	let { rss, heapTotal, heapUsed, external } = process.memoryUsage();

	let sysInfo = { node, v8, rss, heapTotal, heapUsed, external };

	sysInfo.uptime = process.uptime();
	sysInfo.cwd = process.cwd();
	sysInfo.platform = process.platform;
	sysInfo.hostname = os.hostname();

	return sysInfo;
};