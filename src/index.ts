import { eventStore } from './census/stream.js';
import { logger } from './logger.js';
import { PopulationTracker } from './services/popTracker.js';

const services = [
	PopulationTracker,
];

const serviceInstances = services.map(service => new service({ logger, eventStore }));
