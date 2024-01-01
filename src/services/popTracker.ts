import { Logger } from "winston";
import { EventStore, EventStoreEvent } from "../census/eventStore";
import { TempStore } from "../tempStore";
import { PS2Events } from "ps2census/dist/types/stream";
import { IService, IServiceConstructor } from ".";

export const PopulationTracker: IServiceConstructor = class PopulationTracker implements IService {
	private EventProcessingintervalId: NodeJS.Timeout;
	private characters: TempStore<string, StoredCharacter> = new TempStore();
	private logger: Logger;
	private eventStore: EventStore;
	private static readonly eventsStoreConsumerName = 'PopulationTracker';

	constructor({ logger, eventStore }: { logger: Logger, eventStore: EventStore }) {
		this.logger = logger;
		this.eventStore = eventStore;
		this.start();
	}

	start() {
		this.eventStore.stores.GainExperience.addConsumer(PopulationTracker.eventsStoreConsumerName);
		this.logger.info('Starting population tracker');

		this.EventProcessingintervalId = setInterval(() => this.processEvents(), 1000);
	}

	processEvents() {
		const events: EventStoreEvent<PS2Events.GainExperience>[] = this.eventStore.stores.GainExperience.consumeEvents(PopulationTracker.eventsStoreConsumerName);
		this.logger.debug(`Received events: ${events.length}`);

		for (const event of events) {
			this.characters.set(event.raw.character_id, {
				characterId: event.raw.character_id,
				worldId: event.raw.world_id,
				zoneId: event.raw.zone_id,
				teamId: event.raw.team_id,
				loadoutId: event.raw.loadout_id
			});
		}
	}

	stop() {
		this.logger.info('Stopping population tracker');
		this.eventStore.stores.GainExperience.removeConsumer(PopulationTracker.eventsStoreConsumerName);

		if (this.EventProcessingintervalId) {
			clearInterval(this.EventProcessingintervalId);
		}
	}
}

interface StoredCharacter {
	characterId: string;
	worldId: string;
	zoneId: string;
	teamId: string;
	loadoutId: string;
}
