import { Injectable, Inject } from '@nestjs/common';
import jsforceModule, { Connection, ConnectionOptions } from 'jsforce';

@Injectable()
export class SalesforceFactory {

	private jsforce: typeof jsforceModule;

	constructor(@Inject('jsforce') jsforce: typeof jsforceModule) {
		this.jsforce = jsforce;
	}

	public create(options: ConnectionOptions) : Connection {
		return new this.jsforce.Connection(options);
	}
}