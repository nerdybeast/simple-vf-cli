'use strict';

const path = require('path');
const Promise = require('bluebird');
const archiver = require('archiver');
const fs = Promise.promisifyAll(require('fs-extra'));
const debug = require('debug')('svf:info deploy');
const Salesforce = require('./salesforce');
const db = require('./db');

const TEMP_DIR_PATH = path.join(__dirname, '../temp');

function _createZip(page) {
    return new Promise((resolve, reject) => {

        let zipFilePath = path.join(TEMP_DIR_PATH, `${page.name}.zip`);

        let output = fs.createWriteStream(zipFilePath);
        let archive = archiver('zip');
        
        archive.directory(page.outputDir, '/');
        
        archive.pipe(output);
        archive.finalize();

        output.on('close', () => {
            return resolve(zipFilePath);
        });

        archive.on('error', (err) => {
            return reject(err);
        });

    });
}

module.exports = function(org, page) {

    return fs.ensureDirAsync(TEMP_DIR_PATH).then(() => {

        return _createZip(page);

    }).then(zipFilePath => {

        debug(`zipFilePath => ${zipFilePath}`);

        let sf = new Salesforce(org);
        return sf.saveStaticResource(page, zipFilePath);

    }).then(staticResourceId => {

        let promiseHash = {
            deleteTempDir: fs.emptyDirAsync(TEMP_DIR_PATH)
        };

        if(page.staticResourceId !== staticResourceId) {
            page.staticResourceId = staticResourceId;
            promiseHash.updateResult = db.update(page);
        }

        return Promise.props(promiseHash);

    }).catch(err => {

        debug('deploy error => %o', err);
        return Promise.reject(err);

    });

}