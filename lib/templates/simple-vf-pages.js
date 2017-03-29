'use strict';

module.exports = {
    "fullName": "Simple_VF_Pages__c",
    "customSettingsType": "List",
    "description": "Holds page information for the Simple VF build system.",
    "enableFeeds": "false",
    "fields": [
        {
            "fullName": "DevelopmentMode__c",
            "defaultValue": "false",
            "description": "Determines if the current page is in development mode.",
            "externalId": "false",
            "inlineHelpText": "Determines if the current page is in development mode.",
            "label": "Development Mode",
            "trackTrending": "false",
            "type": "Checkbox"
        },
        {
            "fullName": "TunnelUrl__c",
            "description": "Holds the ngrok tunnel url.",
            "externalId": "false",
            "inlineHelpText": "Holds the ngrok tunnel url.",
            "label": "Tunnel Url",
            "length": "255",
            "required": "false",
            "trackTrending": "false",
            "type": "Text",
            "unique": "false"
        }
    ],
    "label": "Simple VF Pages",
    "visibility": "Protected"
};