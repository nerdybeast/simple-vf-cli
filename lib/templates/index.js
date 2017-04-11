'use strict';

const controllerTemplate = require('./controller');
const controllerTestTemplate = require('./controller-test');
const vfPageTemplate = require('./visualforce-page');

module.exports = {
    simpleVfPages: require('./simple-vf-pages'),
    simpleVfUsers: require('./simple-vf-users'),
    visualforcePage: (pageName) => vfPageTemplate(pageName),
    controller: (pageName) => controllerTemplate(pageName),
    controllerTest: (pageName) => controllerTestTemplate(pageName)
};