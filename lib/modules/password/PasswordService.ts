import { Injectable, Inject } from '@nestjs/common';
import keytarModule from 'keytar';

@Injectable()
export class PasswordService {

	private keytar: typeof keytarModule;
	private serviceName: string = 'simple-vf-cli';

	constructor(@Inject('keytar') keytar: typeof keytarModule) {
		this.keytar = keytar;
	}

	public async getByAccountName(accountName: string) : Promise<string|null> {
		return await this.keytar.getPassword(this.serviceName, accountName);
	}

	/**
	 * Saves a password to the system keychain. The "accountName" is something like a username, a value that gets
	 * appended to the service name to identify this password for example, if accountName="some-value", this password
	 * would get saved under the key "simple-vf-cli/some-value".
	 * @param accountName will be appended to the service name to identify this specific password.
	 * @param password
	 */
	public async save(accountName: string, password: string) : Promise<void> {
		await this.keytar.setPassword(this.serviceName, accountName, password);
	}

	/**
	 * From keytar: Yields true if a password was deleted, or false if an entry with the given service and account was not found.
	 * @param accountName 
	 */
	public async delete(accountName: string) : Promise<boolean> {
		return await this.keytar.deletePassword(this.serviceName, accountName);
	}
}