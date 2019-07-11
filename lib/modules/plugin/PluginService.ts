import { Injectable, Inject } from '@nestjs/common';
import FS from 'fs-extra';
import { ConfigService } from '../config/ConfigService';
import { DebugService } from '../debug/DebugService';
import { DebugFactory } from '../debug/DebugFactory';
import { NodeModuleDetailsBase } from './NodeModuleDetailsBase';
import { WorkerService } from '../worker/WorkerService';

@Injectable()
export class PluginService {

	private fs: typeof FS;
	private configService: ConfigService;
	private debugService: DebugService;
	private workerService: WorkerService;

	constructor(@Inject('fs') fs: typeof FS, configService: ConfigService, debugFactory: DebugFactory, workerService: WorkerService) {
		this.fs = fs;
		this.configService = configService;
		this.debugService = debugFactory.create(PluginService.name);
		this.workerService = workerService;
	}

	public async ensurePluginPackageJsonExists() : Promise<void> {

		try {

			const fileExists = await this.fs.pathExists(this.configService.PluginPackageJsonFilePath);
	
			if(!fileExists) {
	
				//Using "outputJson" here instead of "writeJson" because this method will ensure the directory exists.
				//"writeJson" would crash if our plugins directory hadn't been created yet.
				await this.fs.outputJson(this.configService.PluginPackageJsonFilePath, {
					name: 'simple-vf-cli-plugins',
					version: '0.0.0'
				});
			}

		} catch(error) {

			this.debugService.log('Error creating package.json file for plugins', {
				pluginPackageJsonFilePath: this.configService.PluginPackageJsonFilePath
			});

			throw error;
		}

	}

	public async getInstalledPlugins() : Promise<NodeModuleDetailsBase[]> {

		const pluginPackageJson = await this.fs.readJson(this.configService.PluginPackageJsonFilePath);
		const pluginNames = Object.keys(pluginPackageJson.dependencies)

		const plugins: NodeModuleDetailsBase[] = pluginNames.map((pluginName: string) => {

			const details = new NodeModuleDetailsBase();
			details.actualName = pluginName;
			details.displayName = pluginName.replace(this.configService.PluginNamePrefix, '');
			
			//In theory, all the plugins are installed using npm's "--save-exact" flag so there shouldn't
			//be the need to strip off any semver characters like "^".
			details.version = pluginPackageJson.dependencies[pluginName];

			return details;
		});

		return plugins;
	}

	public async getRemotePlugins() {

		const commandResults = await this.workerService.executeCommand('npm', ['search', this.configService.PluginNamePrefix, '--json']);
		return commandResults;
	}
}