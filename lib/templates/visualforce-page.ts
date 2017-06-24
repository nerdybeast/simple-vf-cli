import controllerTemplate from './controller';

export default function(pageName: string) : any {
	
	let controller = controllerTemplate(pageName);

	return { name: pageName, body: `
<apex:page controller="${controller.name}" showHeader="false" standardStylesheets="false" sidebar="false" applyHtmlTag="false" applyBodyTag="false" docType="html-5.0">
	<html>
		<head>
			
			<title>${pageName}</title>
			
			<meta name="viewport" content="width=device-width, initial-scale=1" />

			<!--UNCOMMENT THIS LINE AFTER UPDATING THE PATH TO YOUR STATIC RESOURCE STYLESHEET-->
			<!--<link href="{!URLFOR(IF(IsUnderDevelopment, SimpleVfPageConfig.TunnelUrl__c, $Resource.${pageName})) + '/path/to/your/stylesheet.css'}" rel="stylesheet" />-->
			
		</head>
		<body>
			
			<!--UNCOMMENT THIS LINE AFTER UPDATING THE PATH TO YOUR STATIC RESOURCE SCRIPT-->
			<!--<script src="{!URLFOR(IF(IsUnderDevelopment, SimpleVfPageConfig.TunnelUrl__c, $Resource.${pageName})) + '/path/to/your/script.js'}"></script>-->

		</body>
	</html>
</apex:page>
`};
}