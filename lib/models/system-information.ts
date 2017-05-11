import os = require('os');

class SystemInformation {
	node: string;
	v8: string;
	rss: number;
	heapTotal: number;
	heapUsed: number;
	uptime: number;
	cwd: string;
	platform: string;
	hostname: string;

	constructor() {

		let { node, v8 } = process.versions;

		//The process.memoryUsage() method returns an object describing the memory usage of the Node.js process measured in bytes.
		let { rss, heapTotal, heapUsed } = process.memoryUsage();

		this.node = node;
		this.v8 = v8;
		this.rss = rss;
		this.heapTotal = heapTotal;
		this.heapUsed = heapUsed;
		this.uptime = process.uptime();
		this.cwd = process.cwd();
		this.platform = process.platform;
		this.hostname = os.hostname();
	}
}

export default SystemInformation;