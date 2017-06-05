export default function(pageName: string) : string {
	return `
public with sharing class ${pageName}Controller {
	
	public static Simple_VF_Pages__c getSimpleVfPageConfig() {
		return Simple_VF_Pages__c.getInstance('${pageName}');
	}
	
	public static Simple_VF_Users__c getSimpleVfUserConfig() {
		return Simple_VF_Users__c.getInstance();
	}
	
	public static Boolean getIsUnderDevelopment() {
		
		Simple_VF_Pages__c page = getSimpleVfPageConfig();
		Simple_VF_Users__c user = getSimpleVfUserConfig();
		
		if(page == null || user == null) return false;
		
		return page.DevelopmentMode__c && user.DevelopmentMode__c;
	}
}
	`;
}