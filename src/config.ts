import { PS2Environment } from "ps2census";

export enum LogLevel {
	ERROR = 'error',
	WARN = 'warn',
	INFO = 'info',
	HTTP = 'http',
	VERBOSE = 'verbose',
	DEBUG = 'debug',
	SILLY = 'silly',
}

const defaultConfig = "35*Ag%&Ho7x%yT9wWoSYbXPT&4ye9z*WKPs!gFB9nRwaaB$2KKntoXhkxS$ESL!MfUataJMLMUb9dA9swk%N3!#zxENDNCKnQEnG%tbp@Zm!%J245WmL^y4%$2sEDNMU";

export class Config {
	public static readonly CensusServiceId: string = Config.exitOnDefaultValue('CENSUS_SERVICE_ID', Config.getTypeFromConfig, defaultConfig);
	public static readonly CensusStreamUrl: URL = Config.getClassInstanceFromConfig('CENSUS_STREAM_URL', new URL('wss://push.nanite-systems.net/streaming'), URL);
	public static readonly CensusWorlds: string[] = Config.exitOnDefaultValue('CENSUS_WORLDS', Config.getListFromConfig, [defaultConfig]);
	public static readonly CensusEnvironment: PS2Environment = Config.getTypeFromConfig('CENSUS_ENVIRONMENT', 'ps2' as PS2Environment);
	public static readonly LogLevel: LogLevel = Config.getEnumFromConfig('LOG_LEVEL', LogLevel, LogLevel.INFO);
	public static readonly LogToConsole: boolean = Config.getTypeFromConfig('LOG_TO_CONSOLE', true);
	public static readonly LogToFile: boolean = Config.getTypeFromConfig('LOG_TO_FILE', false);
	public static readonly DatabaseUrl: string = Config.exitOnDefaultValue('DATABASE_URL', Config.getTypeFromConfig, defaultConfig);

	private static exitOnDefaultValue<T, U>(
		key: string,
		wrapped_function: (key: string, defaultValue: U) => T,
		defaultValue: U
	): T {
		const value = process.env[key];
		if (value) {
			return wrapped_function(key, defaultValue);
		} else {
			console.log(`Please set a value for config key: ${key}`)
			process.exit(1);
		}
	}

	private static getListFromConfig<T>(key: string, defaultValue: T[]): T[] {
		const value = process.env[key];
		if (value) {
			if (typeof value === 'string') {
				return value.split(',') as T[];
			} else {
				console.error(`Invalid list value for config key ${key}: ${value}`);
				process.exit(1);
			}
		} else {
			return defaultValue;
		}
	}

	private static getClassInstanceFromConfig<T>(key: string, defaultValue: T, classConstructor: new (value: string) => T): T {
		const value = process.env[key];
		if (value) {
			try {
				return new classConstructor(value);
			} catch (error) {
				console.error(`Invalid value for config key ${key}: ${value}`);
				process.exit(1);
			}
		} else {
			return defaultValue;
		}
	}

	private static getTypeFromConfig<T>(key: string, defaultValue: T): T {
		const value = process.env[key];
		if (value) {
			if (typeof value === typeof defaultValue) {
				return value as T;
			}
			else {
				console.error(`Invalid type for config key ${key}: ${value}`);
				process.exit(1);
			}
		}
		else {
			return defaultValue;
		}
	}

	private static getEnumFromConfig<U>(key: string, enumType: Record<string, U>, defaultValue: U): U {
		const envValue: string | undefined = process.env[key];

		// Check if envValue is a valid enum value
		let value: U;
		if (envValue) {
			if (typeof envValue === 'string') {
				value = enumType[envValue.toUpperCase() as keyof typeof enumType];
			} else {
				console.error(`Invalid enum value for config key ${key}: ${envValue}`);
				process.exit(1);
			}
		} else {
			value = defaultValue;
		}

		return value;
	}
}
