import { Config } from "../config.js";
import { EventStore } from "./eventStore.js";
import { logger } from "../logger.js";
import { PS2EventNames } from "ps2census/stream";
import { CensusClient } from "ps2census";

const eventNames: PS2EventNames[] = [
	'GainExperience',
];

logger.info('Creating event store');
export const eventStore = new EventStore(eventNames);

logger.info('Setting up census client');
const client = new CensusClient(Config.CensusServiceId, Config.CensusEnvironment, {
  streamManager: {
    subscription: {
		worlds: Config.CensusWorlds,
		characters: ['all'],
		eventNames: ['GainExperience'],
		logicalAndCharactersWithWorlds: true,
	  },
	// endpoint: Config.CensusStreamUrl.toString(),
	// subscription: {
	// 	worlds: ['10'],
	// 	eventNames: ['MetagameEvent'],
	// }
  },
});

client.on('ps2Event', event => {
	logger.silly(`Received event: ${event.event_name}`);
	if (!eventStore.stores[event.event_name as PS2EventNames]) return;

	eventStore.stores[event.event_name as PS2EventNames].addEvent(event);
});

client.on('subscribed', subscription => {
	logger.info(`Subscribed to events: ${subscription.eventNames} on worlds: ${subscription.worlds} with logicalAndCharactersWithWorlds: ${subscription.logicalAndCharactersWithWorlds}`);
}); // Notification of a subscription made by the event stream
client.on('duplicate', event => {
}); // When a duplicate event has been received
client.on('ready', () => {
	logger.info('Census client ready');
}); // Client is ready
client.on('reconnecting', () => {
	logger.warn('Census client reconnecting');
}); // Client is reconnecting
client.on('disconnected', () => {
	logger.warn('Census client disconnected');
}); // Client got disconnected
client.on('error', error => {
	logger.error(`Census client error: ${error}`);
}); // Error
client.on('warn', error => {
	logger.warn(`Census client warning: ${error}`);
}); // Error, when receiving a corrupt message

logger.info('Starting census client');
client.watch();
