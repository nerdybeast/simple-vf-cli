import { Module, Provider } from '@nestjs/common';
import child_process from 'child_process';

const childProcessProvider: Provider = {
	provide: 'child_process',
	useValue: child_process
}

@Module({
	providers: [childProcessProvider],
	exports: [childProcessProvider]
})
export class ChildProcessModule {

}