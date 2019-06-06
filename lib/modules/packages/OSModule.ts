import { Module } from '@nestjs/common';
import os from 'os';

const osProvider = {
	provide: 'os',
	useValue: os
};

@Module({
	providers: [osProvider],
	exports: [osProvider]
})
export class OSModule {

}