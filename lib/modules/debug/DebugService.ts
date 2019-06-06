import { IDebugger, IDebug } from 'debug';
import { LogEventEmitter } from './LogEventEmitter';

export class DebugService {

	private debug: IDebugger;
	private eventEmitter: LogEventEmitter;

	constructor(debug: IDebugger, eventEmitter: LogEventEmitter) {
		this.debug = debug;
		this.eventEmitter = eventEmitter;
	}

	public log(message: string, obj?: any) : void {
		this.debug(message, obj);
		this.eventEmitter.emit('logEntry', message, obj);
	}
}