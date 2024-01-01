import { EventStore } from "src/census/eventStore";
import { Logger } from "winston";

export interface IService {
	start(): void;
	stop(): void;
}

export interface IServiceConstructorOptions {
	logger: Logger;
	eventStore: EventStore;
}

export interface IServiceConstructor {
	new(options: IServiceConstructorOptions): IService;
}
