'use strict';

module.exports = function(pageName) {
    return `
        public with sharing class ${pageName}Controller {
            public static Simple_VF_Pages__c getSimpleVfPageConfig() {
                return Simple_VF_Pages__c.getInstance('${pageName}');
            }
        }
    `;
}