import { Module } from '@nestjs/common';
import moment from 'moment';

const momentProvider = {
	provide: 'moment',
	useValue: moment
}

@Module({
	providers: [momentProvider],
	exports: [momentProvider]
})
export class MomentModule { }