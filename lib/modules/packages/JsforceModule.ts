import { Module, Provider } from '@nestjs/common';
import jsforce from 'jsforce';

const jsforceProvider: Provider = {
	provide: 'jsforce',
	useValue: jsforce
};

@Module({
	providers: [jsforceProvider],
	exports: [jsforceProvider]
})
export class JsforceModule {

}