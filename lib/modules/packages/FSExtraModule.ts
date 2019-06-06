import { Module } from '@nestjs/common';
import fs from 'fs-extra';

const fsProvider = {
	provide: 'fs',
	useValue: fs
};

@Module({
	providers: [fsProvider],
	exports: [fsProvider]
})
export class FSExtraModule {

}