'use strict';

module.exports = function(pageName) {
    return `
<apex:page controller="${pageName}Controller" showHeader="false" standardStylesheets="false" sidebar="false" applyHtmlTag="false" applyBodyTag="false" docType="html-5.0">
    <html>
        <head>
            
            <title>${pageName}</title>
            
            <meta name="viewport" content="width=device-width, initial-scale=1"></meta>

            <apex:outputPanel rendered="{!SimpleVfPageConfig.DevelopmentMode__c == true && $Setup.Simple_VF_Users__c.DevelopmentMode__c == true}">
                <!--UNCOMMENT THIS LINE AFTER UPDATING THE PATH TO YOUR LOCAL STYLESHEET-->
                <!--<link href="{!SimpleVfPageConfig.TunnelUrl__c + '/path/to/your/local/stylesheet.css'}" rel="stylesheet"></link>-->
            </apex:outputPanel>

            <apex:outputPanel rendered="{!SimpleVfPageConfig.DevelopmentMode__c == false || $Setup.Simple_VF_Users__c.DevelopmentMode__c == false}">
                <!--UNCOMMENT THIS LINE AFTER UPDATING THE PATH TO YOUR STATIC RESOURCE STYLESHEET-->
                <!--<link href="{!URLFOR($Resource.${pageName}, '/path/to/your/static/resource/stylesheet.css')}"></link>-->
            </apex:outputPanel>
            
        </head>
        <body>
            
            <apex:outputPanel rendered="{!SimpleVfPageConfig.DevelopmentMode__c == true && $Setup.Simple_VF_Users__c.DevelopmentMode__c == true}">
                <!--UNCOMMENT THIS LINE AFTER UPDATING THE PATH TO YOUR LOCAL SCRIPT-->
                <!--<script src="{!SimpleVfPageConfig.TunnelUrl__c + '/path/to/your/local/script.js'}"></script>-->
            </apex:outputPanel>

            <apex:outputPanel rendered="{!SimpleVfPageConfig.DevelopmentMode__c == false || $Setup.Simple_VF_Users__c.DevelopmentMode__c == false}">
                <!--UNCOMMENT THIS LINE AFTER UPDATING THE PATH TO YOUR STATIC RESOURCE SCRIPT-->
                <!--<script src="{!URLFOR($Resource.${pageName}, '/path/to/your/static/resource/script.js')}"></script>-->
            </apex:outputPanel>

        </body>
    </html>
</apex:page>
`;
}