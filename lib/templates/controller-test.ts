export default function(pageName: string) : string {
	return `
@isTest
private class ${pageName}Controller_Test {

	private static final String PAGE_NAME = '${pageName}';
	private static final String TUNNEL_URL = 'https://tunnel.domain.com';
	
	@testSetup
	static void setup() {
		
		insert new Simple_VF_Pages__c(
			Name = PAGE_NAME,
			DevelopmentMode__c = true,
			TunnelUrl__c = TUNNEL_URL
		);
		
		insert new Simple_VF_Users__c(
			SetupOwnerId = Userinfo.getUserId(),
			DevelopmentMode__c = true
		);
		
	}
	
	@isTest
	static void getSimpleVfPageConfig_FindsSettingSuccessfully() {
		
		Test.startTest();
		Simple_VF_Pages__c pageConfig = ${pageName}Controller.getSimpleVfPageConfig(); 
		Test.stopTest();
		
		System.assertNotEquals(null, pageConfig);
		System.assertEquals(TUNNEL_URL, pageConfig.TunnelUrl__c);
	}
	
	@isTest
	static void getSimpleVfPageConfig_SettingNotFound() {
		
		delete Simple_VF_Pages__c.getInstance(PAGE_NAME);
		
		Test.startTest();
		Simple_VF_Pages__c pageConfig = ${pageName}Controller.getSimpleVfPageConfig();
		Test.stopTest();
		
		System.assertEquals(null, pageConfig);
	}

	@isTest
	static void getSimpleVfUserConfig_FindsSettingSuccessfully() {
		
		Test.startTest();
		Simple_VF_Users__c userConfig = ${pageName}Controller.getSimpleVfUserConfig(); 
		Test.stopTest();
		
		System.assertNotEquals(null, userConfig);
		System.assertEquals(true, userConfig.DevelopmentMode__c);
	}
	
	@isTest
	static void getSimpleVfUserConfig_NoSettingFoundForCurrentUser() {
		
		delete Simple_VF_Users__c.getInstance();
		
		Test.startTest();
		Simple_VF_Users__c userConfig = ${pageName}Controller.getSimpleVfUserConfig();
		Test.stopTest();
		
		System.assertEquals(false, userConfig.DevelopmentMode__c);
	}

	@isTest
	static void getIsUnderDevelopment_PageAndUserInDevMode() {

		Test.startTest();
		Boolean isUnderDevelopment = ${pageName}Controller.getIsUnderDevelopment();
		Test.stopTest();

		System.assertEquals(true, isUnderDevelopment);
	}

	@isTest
	static void getIsUnderDevelopment_PageNotInDevMode() {

		Simple_VF_Pages__c pageConfig = Simple_VF_Pages__c.getInstance(PAGE_NAME);
		pageConfig.DevelopmentMode__c = false;
		update pageConfig;

		Test.startTest();
		Boolean isUnderDevelopment = ${pageName}Controller.getIsUnderDevelopment();
		Test.stopTest();

		System.assertEquals(false, isUnderDevelopment);
	}

	@isTest
	static void getIsUnderDevelopment_UserNotInDevMode() {

		Simple_VF_Users__c userConfig = Simple_VF_Users__c.getInstance();
		userConfig.DevelopmentMode__c = false;
		update userConfig;

		Test.startTest();
		Boolean isUnderDevelopment = ${pageName}Controller.getIsUnderDevelopment();
		Test.stopTest();

		System.assertEquals(false, isUnderDevelopment);
	}
}
	`;
}