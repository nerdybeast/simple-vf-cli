import { Injectable, Inject } from '@nestjs/common';
import ChildProcessModule from 'child_process';
import { CommandResults } from './CommandResults';

@Injectable()
export class WorkerService {

	private childProcess: typeof ChildProcessModule;

	constructor(@Inject('child_process') childProcess: typeof ChildProcessModule) {
		this.childProcess = childProcess;
	}

	public async executeCommand(command: string, args: any[] = []) : Promise<CommandResults> {

		return new Promise((resolve, reject) => {

			const stdout: string[] = [];
			const stderr: string[] = [];

			const child = this.childProcess.spawn(command, args, {
				shell: true
			});

			child.stdout.on('data', (data) => {
				stdout.push(data.toString());
			});

			child.stderr.on('data', (data: string) => {
				stderr.push(data.toString());
			});

			child.on('close', (code) => {
				const commandResults = new CommandResults();
				commandResults.exitCode = code;
				commandResults.stdout = stdout;
				commandResults.stderr = stderr;
				return resolve(commandResults);
			}); 

			child.on('error', (error) => {
				return reject(error);
			});

		});
	}
}