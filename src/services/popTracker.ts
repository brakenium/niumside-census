import { Logger } from "winston";
import { EventStore, EventStoreEvent } from "../census/eventStore";
import { TempStore } from "../tempStore";
import { PS2Events } from "ps2census/dist/types/stream";
import { IService, IServiceConstructor } from ".";
import { sql } from "src/db/db";
import { Population } from "src/db/db.d";
import { LoadoutId, TeamId, WorldId, ZoneId } from "src/census/types";

type LoadoutMap = Map<LoadoutId, number>;
type TeamMap = Map<TeamId, DbIdWithTree<LoadoutMap>>;
type ZoneMap = Map<ZoneId, DbIdWithTree<TeamMap>>;
type WorldMap = Map<WorldId, DbIdWithTree<ZoneMap>>;
type AnyPopulationMapLevel = WorldMap | ZoneMap | TeamMap | LoadoutMap;
type IntermediaryPopulationMapLevel = WorldMap | ZoneMap | TeamMap;

type PopulationDetailLevelIdentifier = LoadoutId | TeamId | ZoneId | WorldId;
type IntermediaryPopulationDetailLevelIdentifier = TeamId | ZoneId | WorldId;

interface DbIdWithTree<T extends WorldMap | ZoneMap | TeamMap | LoadoutMap> {
	db_id: number;
	map: T;
}

export const PopulationTracker: IServiceConstructor = class PopulationTracker implements IService {
	private EventProcessingintervalId: NodeJS.Timeout;
	private CharacterProcessingintervalId: NodeJS.Timeout;
	// Temporary storage for 2 minutes
	private characters: TempStore<string, StoredCharacter> = new TempStore(120_000);
	private logger: Logger;
	private eventStore: EventStore;
	private static readonly eventsStoreConsumerName = 'PopulationTracker';

	constructor({ logger, eventStore }: { logger: Logger, eventStore: EventStore; }) {
		this.logger = logger;
		this.eventStore = eventStore;
		this.start();
	}

	start() {
		this.eventStore.stores.GainExperience.addConsumer(PopulationTracker.eventsStoreConsumerName);
		this.logger.info('Starting population tracker');

		this.EventProcessingintervalId = setInterval(() => this.processEvents(), 1000);
		this.CharacterProcessingintervalId = setInterval(async () => {
			await sql.begin(async sql => {

				const population_insert = await sql`
					INSERT INTO population DEFAULT VALUES
					RETURNING population_id
				`;

				this.logger.debug(`Created population report ${population_insert[0].population_id}`);

				const pop_report_id: number = population_insert[0].population_id;

				this.processCharacters(pop_report_id, sql);
			});
		}, 10000);
	}

	processEvents() {
		const events: EventStoreEvent<PS2Events.GainExperience>[] = this.eventStore.stores.GainExperience.consumeEvents(PopulationTracker.eventsStoreConsumerName);
		this.logger.silly(`Received events: ${events.length}`);

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

	private async insertPopulation(populationType: string, id: IntermediaryPopulationDetailLevelIdentifier, parentId: number, parentType: string, populationIds: IntermediaryPopulationMapLevel, sql: any) {
		if (!populationIds.has(id)) {
			// populationType.split('_')[0] is the name of the table including all possible values for the DetailLevelIdentifier
			// e.g. 'loadout' for 'loadout_population'
			//
			// parentType + '_id' is the name of the column that references the parent table
			// e.g. 'world_population_id' for 'zone_population'
			// We will now create these variables

			// E.g 'world_population_id' for 'zone_population'
			const parentType_id_column_name = parentType + '_id';
			const detailLevel = populationType.split('_')[0];
			// E.g. 'world_id' for 'world_population'

			let detailLevel_parent_name;
			if (detailLevel === 'team') detailLevel_parent_name = 'faction';

			const parent_table_name = detailLevel_parent_name || detailLevel;

			await sql`
				INSERT INTO ${sql(parent_table_name)}
				(
					${sql(parent_table_name + '_id')}
				)
				VALUES (
					${id}
				)
				ON CONFLICT DO NOTHING
			`;

			const insert = await sql`
				INSERT INTO ${sql(populationType)}
				(
					${sql(parentType_id_column_name)},
					${sql(detailLevel + '_id')}
				)
				VALUES (
					${parentId},
					${id}
				)
				RETURNING ${sql(populationType + '_id')}
			`;

			populationIds.set(id, {
				db_id: insert[0][populationType + '_id'],
				map: new Map()
			});
		}
	}

	// TODO: Process this.characters into population reports in DB
	async processCharacters(pop_report_id: number, sql: any) {
		const characters = this.characters.getMap();
		this.logger.debug(`Processing ${characters.size} characters`);

		const population_ids: WorldMap = new Map();

		for (const [characterId, character] of characters) {
			const worldId = Number(character.value.worldId);
			const zoneId = Number(character.value.zoneId);
			const teamId = Number(character.value.teamId);
			const loadoutId = Number(character.value.loadoutId);

			await this.insertPopulation('world_population', worldId, pop_report_id, 'population', population_ids, sql);

			const world_db_id = population_ids.get(worldId)?.db_id;
			const world_db_map = population_ids.get(worldId)?.map;

			if (!world_db_id || !world_db_map) {
				this.logger.error(`World ${worldId} not found in population_ids/DB`);
				new Error(`World ${worldId} not found in population_ids/DB`);
				sql`ROLLBACK AND CHAIN`;
				return;
			}

			if (!population_ids.get(worldId)?.map.has(zoneId)) {
				await this.insertPopulation(
					'zone_population',
					zoneId,
					world_db_id,
					'world_population',
					world_db_map,
					sql
				);
			}

			const zone_db_id = world_db_map.get(zoneId)?.db_id;
			const zone_db_map = world_db_map.get(zoneId)?.map;

			if (!zone_db_id || !zone_db_map) {
				this.logger.error(`Zone ${zoneId} not found in population_ids/DB`);
				sql`ROLLBACK AND CHAIN`;
				return;
			}

			if (!zone_db_map.has(teamId)) {
				await this.insertPopulation(
					'team_population',
					teamId,
					zone_db_id,
					'zone_population',
					zone_db_map,
					sql
				);
			}

			const team_db_id = zone_db_map.get(teamId)?.db_id;
			const team_db_map = zone_db_map.get(teamId)?.map;

			if (!team_db_id || !team_db_map) {
				this.logger.error(`Team ${teamId} not found in population_ids/DB`);
				sql`ROLLBACK AND CHAIN`;
				return;
			}

			// increment loadout population
			const loadout_map = population_ids.get(worldId)?.map.get(zoneId)?.map.get(teamId)?.map;
			if (!loadout_map) {
				this.logger.error(`Loadout ${loadoutId} not found in population_ids/DB`);
				sql`ROLLBACK AND CHAIN`;
				return;
			}

			const amount = loadout_map.get(loadoutId) || 0;
			loadout_map.set(loadoutId, amount + 1);
		}

		this.logger.debug('Processed characters, inserting pop amount into DB');

		// insert loadout population
		for (const [worldId, world] of population_ids) {
			for (const [zoneId, zone] of world.map) {
				for (const [teamId, team] of zone.map) {
					for (const [loadoutId, amount] of team.map) {
						await sql`
							INSERT INTO loadout (
								loadout_id
							)
							VALUES (
								${loadoutId}
							)
							ON CONFLICT DO NOTHING
						`;

						await sql`
							INSERT INTO loadout_population (
								loadout_id,
								team_population_id,
								amount
							)
							VALUES (
								${loadoutId},
								${team.db_id},
								${amount}
							)
						`;
					}
				}
			}
		}

		this.logger.debug('Inserted loadout population into DB');
	}

	stop() {
		this.logger.info('Stopping population tracker');
		this.eventStore.stores.GainExperience.removeConsumer(PopulationTracker.eventsStoreConsumerName);

		if (this.EventProcessingintervalId) clearInterval(this.EventProcessingintervalId);
		if (this.CharacterProcessingintervalId) clearInterval(this.CharacterProcessingintervalId);
	}
};

interface StoredCharacter {
	characterId: string;
	worldId: string;
	zoneId: string;
	teamId: string;
	loadoutId: string;
}
