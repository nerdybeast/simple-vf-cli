import { Module, Provider } from '@nestjs/common';
import keytar from 'keytar';

const keytarProvider: Provider = {
	provide: 'keytar',
	useValue: keytar
};

@Module({
	providers: [keytarProvider],
	exports: [keytarProvider]
})
export class KeytarModule {

}