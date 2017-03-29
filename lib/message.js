'use strict';

const Ora = require('ora');
const chalk = require('chalk');

class Message {

    constructor() {
        this._init();
    }

    _init() {
        this._message = new Ora();
        this._isAlive = true;
    }

    _kill() {
        this._isAlive = false;
    }

    start(msg) {

        if(!this._isAlive) { this._init(); }
        
        this._message.text = msg || this._message.text;
        this._message.start();
    }

    stop() {
        this._message.stop();
    }

    success(msg) {
        this._message.succeed(msg);
        this._kill();
    }

    fail(msg) {
        this._message.fail(msg);
        this._kill();
    }

    catchError(err) {
        this._init();
        this.fail(chalk.bold.red(err.message));
    }
}

module.exports = new Message();