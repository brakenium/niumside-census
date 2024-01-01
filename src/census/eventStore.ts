import { PS2Event } from "ps2census";
import { PS2EventNames, PS2Event as ps2EventsStream } from "ps2census/stream"

// Add a consumedBy property to PS2Event
export type EventStoreEvent<T extends ps2EventsStream> = PS2Event<T> & {
	consumedBy: string[];
};

// A key value store of consumers by name
// With the last time they consumed an event
export type EventStoreConsumers = {
	[key: string]: Date;
};

// A key value store of eventStores by type
export type EventStoresType = {
	[key in PS2EventNames]: SingleEventStore<ps2EventsStream>;
};

// Create an EventStore class
export class EventStore {
	public stores: EventStoresType;

	constructor(events: PS2EventNames[]) {
		const eventStore: EventStoresType = {} as EventStoresType;
		for (const event of events) {
			eventStore[event] = new SingleEventStore<ps2EventsStream>();
		}
		this.stores = eventStore;
	}
}

// Write an eventStore class that can be used to store events of differing types at the same time
// and then consume them in the order they were received
export class SingleEventStore<T extends ps2EventsStream> {
	private events: EventStoreEvent<T>[] = [];
	private consumers: EventStoreConsumers = {};

	constructor() {
		// Clear out consumed events every 1 minute
		// Any events that have been consumed by all consumers will be removed
		const clearInterval = 60 * 1000;
		setInterval(() => {
			for (const event of this.events) {
				if (event.consumedBy.length === Object.keys(this.consumers).length) {
					const index = this.events.findIndex(e => e === event);
					this.events.splice(index, 1);
				}
			}
		}, clearInterval);
	}

	public addEvent(event: PS2Event<T>): void {
		const eventStoreEvent = event as EventStoreEvent<T>;
		eventStoreEvent.consumedBy = [];
		this.events.push(eventStoreEvent);
	}

	public addConsumer(consumer: string): void {
		this.consumers[consumer] = new Date(0);
	}

	public removeConsumer(consumer: string): void {
		delete this.consumers[consumer];
	}

	public consumeEvents(consumer: string): EventStoreEvent<T>[] {
		if (!this.consumers[consumer]) {
			throw new Error(`Consumer ${consumer} does not exist`);
		}

		const eventsToConsume = this.events.filter(event => {
			return !event.consumedBy.includes(consumer);
		});

		for (const event of eventsToConsume) {
			const index = this.events.findIndex(e => e === event);
			this.events[index].consumedBy.push(consumer);
		}

		this.consumers[consumer] = new Date();

		return eventsToConsume;
	}
}
