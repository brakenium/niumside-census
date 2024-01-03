import type { ColumnType } from "kysely";

export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;

export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export interface Character {
  character_id: number;
  last_update: Timestamp | null;
  name: string | null;
}

export interface CharacterSession {
  character_id: number;
  character_session_id: number;
  outfit_id: number | null;
  session_end: Timestamp | null;
  session_start: Timestamp;
}

export interface Faction {
  description: string | null;
  faction_id: number;
  last_update: Timestamp | null;
  name: string | null;
}

export interface Loadout {
  description: string | null;
  last_update: Timestamp | null;
  loadout_id: number;
  name: string | null;
}

export interface LoadoutPopulation {
  amount: number;
  loadout_id: number;
  loadout_population_id: Generated<number>;
  team_population_id: Generated<number>;
}

export interface Outfit {
  last_fetch: Timestamp | null;
  name: string | null;
  outfit_id: number;
}

export interface Population {
  population_id: Generated<number>;
  timestamp: Generated<Timestamp>;
}

export interface TeamPopulation {
  team_id: number;
  team_population_id: Generated<number>;
  zone_population_id: Generated<number>;
}

export interface World {
  description: string | null;
  last_update: Generated<Timestamp>;
  name: string | null;
  world_id: number;
}

export interface WorldPopulation {
  population_id: number;
  world_id: number;
  world_population_id: Generated<number>;
}

export interface Zone {
  description: string | null;
  last_update: Timestamp | null;
  name: string | null;
  zone_id: number;
}

export interface ZonePopulation {
  world_population_id: Generated<number>;
  zone_id: number;
  zone_population_id: Generated<number>;
}

export interface DB {
  character: Character;
  character_session: CharacterSession;
  faction: Faction;
  loadout: Loadout;
  loadout_population: LoadoutPopulation;
  outfit: Outfit;
  population: Population;
  team_population: TeamPopulation;
  world: World;
  world_population: WorldPopulation;
  zone: Zone;
  zone_population: ZonePopulation;
}
