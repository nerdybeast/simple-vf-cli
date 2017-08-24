import controllerTemplate from './controller';

const debug = require('debug')('svf:info templates/visualforce-page');

export function apexPageWrapper(page, html: string) {
	
	let controller = controllerTemplate(page.name);

	return `
		<apex:page controller="${controller.name}" showHeader="false" standardStylesheets="false" sidebar="false" applyHtmlTag="false" applyBodyTag="false" docType="html-5.0">
			${html}
		</apex:page>
	`;
}

export function defaultHtml(page) : Promise<string> {
	return Promise.resolve(`
		<html>
			<head>
				
				<title>${page.name}</title>
				
				<meta name="viewport" content="width=device-width, initial-scale=1" />

				<!--UNCOMMENT THIS LINE AFTER UPDATING THE PATH TO YOUR STATIC RESOURCE STYLESHEET-->
				<!--<link href="{!URLFOR(IF(IsUnderDevelopment, SimpleVfPageConfig.TunnelUrl__c, $Resource.${page.name})) + '/path/to/your/stylesheet.css'}" rel="stylesheet" />-->
				
			</head>
			<body>
				
				<!--UNCOMMENT THIS LINE AFTER UPDATING THE PATH TO YOUR STATIC RESOURCE SCRIPT-->
				<!--<script src="{!URLFOR(IF(IsUnderDevelopment, SimpleVfPageConfig.TunnelUrl__c, $Resource.${page.name})) + '/path/to/your/script.js'}"></script>-->

			</body>
		</html>
	`);
}