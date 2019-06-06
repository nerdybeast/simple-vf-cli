import { Injectable, Inject } from '@nestjs/common';
import { IDebugger, IDebug } from 'debug';
import { DebugService } from './DebugService';
import MomentModule from 'moment';
import EventEmitter from 'events';
import { LogEventEmitter } from './LogEventEmitter';

@Injectable()
export class DebugFactory {

	private debug: IDebugger;
	private logEventEmitter: LogEventEmitter;
	private moment: typeof MomentModule;
	private logEntries: string[] = [];

	constructor(@Inject('debug') debug: IDebug, @Inject('moment') moment: typeof MomentModule) {
		this.debug = debug('SIMPLE-VF-CLI');
		this.moment = moment;
		this.logEventEmitter = new EventEmitter();
		this.logEventEmitter.on('logEntry', (message: string, obj?: any) => this.addLogEntry(message, obj));
	}

	public create(namespace: string) : DebugService {
		const newDebugger = this.debug.extend(namespace);
		return new DebugService(newDebugger, this.logEventEmitter);
	}

	private addLogEntry(message: string, obj: any) : void {
		const timestamp = this.moment().format();
		const logEntry = `[${timestamp}] - ${message} => ${JSON.stringify(obj)}`;
		this.logEntries.push(logEntry);
	}
}