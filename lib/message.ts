const Ora = require('ora');
const chalk = require('chalk');

export class Message {

	_message: any;
	_isAlive: boolean;

	constructor() {
		this._init();
	}

	_init() : void {
		this._message = new Ora();
		this._isAlive = true;
	}

	_kill() : void {
		this._isAlive = false;
	}

	start(msg?: string) : void {

		if(!this._isAlive) { this._init(); }
		
		this._message.text = msg || this._message.text;
		this._message.start();
	}

	update(msg: string) : void {
		this._message.text = msg;
	}

	stop() : void {
		this._message.stop();
	}

	static success(msg: string) : void {
		(new Message()).success(msg);
	}

	success(msg: string) : void {
		if(!this._isAlive) return;
		this._message.succeed(msg);
		this._kill();
	}

	static info(msg: string) : void {
		(new Message()).info(msg);
	}

	info(msg: string) : void {
		this._message.info(msg);
		this._kill();
	}

	static warn(msg: string) : void {
		(new Message()).warn(msg);
	}

	warn(msg: string) : void {
		this._message.warn(msg);
		this._kill();
	}

	static fail(msg: string) : void {
		(new Message()).fail(msg);
	}

	fail(msg: string) : void {
		this._message.fail(msg);
		this._kill();
	}

	catchError(err: Error) : void {
		this._init();
		this.fail(chalk.bold.red(err.message));
	}
}

let message = new Message();
export default message;