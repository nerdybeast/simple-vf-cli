export default class {
	
	//NOTE: This "Id" property HAS TO BE PascalCased so that jsforce will properly add it into the url.
	Id: string;
	
	cacheControl: string;
	name: string;
	contentType: string;
	body: string;
}