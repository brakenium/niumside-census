import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { Config } from './config.js';
import { DailyRotateFileTransportOptions } from 'winston-daily-rotate-file';

console.log('About to setup logger');
const transports: winston.transport[] = [];

if (Config.LogToConsole) {
	transports.push(
		new winston.transports.Console({
			format: winston.format.combine(
				winston.format.timestamp(),
				winston.format.colorize(),
				winston.format.cli(),
			),
		}),
	);
}

if (Config.LogToFile) {
	const fileLogFormat = winston.format.combine(
		winston.format.timestamp(),
		winston.format.json(),
	);

	const baseTransportConfig: DailyRotateFileTransportOptions = {
		datePattern: undefined,
		maxSize: '20m',
		maxFiles: '14d',
		format: fileLogFormat,
	};

	const combinedTransportConfig: DailyRotateFileTransportOptions = {
		...baseTransportConfig,
		filename: 'combined.log',
		stream: undefined,
	};

	const errorTransportConfig: DailyRotateFileTransportOptions = {
		...baseTransportConfig,
		filename: 'error.log',
		stream: undefined,
		level: 'error',
	};

	transports.push(
		new winston.transports.DailyRotateFile(combinedTransportConfig)
	);
	transports.push(
		new winston.transports.DailyRotateFile(errorTransportConfig),
	);
}

console.debug('Setting up logger');
export const logger = winston.createLogger({
	level: Config.LogLevel.toString(),
	format: winston.format.json(),
	defaultMeta: { service: 'user-service' },
	transports: transports,
});
