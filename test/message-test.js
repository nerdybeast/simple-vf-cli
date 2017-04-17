'use strict';

const chai = require('chai');
const message = require('../lib/message');

describe('Testing "../lib/message" module', function() {

    let initialText = 'initial';

    it('Should be alive when initialized', function() {
        chai.expect(message._isAlive).to.equal(true);
    });

    it('Starting a message should set the text', function() {
        message.start(initialText);
        chai.expect(message._message.text).to.equal(initialText);
    });

    it('Stopping the message should not kill the instance', function() {
        message.stop();
        chai.expect(message._isAlive).to.equal(true);
    });

    it('Starting the message again without new text should use the previous text', function() {
        message.start();
        chai.expect(message._message.text).to.equal(initialText);
    });

    it('Starting the message again without new text should use the previous text', function() {
        message.stop();

        let newText = 'Here is a new message';
        message.start(newText);
        
        chai.expect(message._message.text).to.equal(newText);
    });
});