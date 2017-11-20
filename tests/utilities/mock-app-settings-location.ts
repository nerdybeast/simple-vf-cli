export default function(mockAppSettingsLocation: string) {
	
	jest.mock('../../lib/paths/app-settings-location', () => {
		
		//Typescript returns a function named "default" when you "export default ..." so we have to mock that behavior here.
		return {
			default() {
				return mockAppSettingsLocation;
			}
		};
	});
}