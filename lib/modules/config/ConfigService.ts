import { Injectable, Inject } from '@nestjs/common';
import osModule from 'os';
import { join } from 'path';

@Injectable()
export class ConfigService {

	private os: typeof osModule;

	constructor(@Inject('os') os: typeof osModule) {
		this.os = os;
	}

	/**
	 * Points to the root directory where this app stores settings.
	 */
	public get AppSettingsDirectoryPath() : string {

		const homeDir = this.os.homedir();
		const platform = this.os.platform();
		const appName = 'simple-vf-cli';
		
		let dbPath = '';
		
		switch(platform) {
			case 'win32':
				dbPath = `AppData/Local/${appName}`;
				break;
			case 'darwin':
				dbPath = `Library/Preferences/${appName}`;
				break;
			default:
				dbPath = `.${appName}`;
				break;
		}

		return join(homeDir, dbPath);
	}

	public get PluginNamePrefix() : string {
		return '@svf/plugin-';
	}

	public get PluginDirectoryPath() : string {
		return `${this.AppSettingsDirectoryPath}/plugins`;
	}

	public get PluginPackageJsonFilePath() : string {
		return `${this.PluginDirectoryPath}/package.json`;
	}
}