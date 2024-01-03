import type { Knex } from "knex";
import { Config } from "../config";

// Update with your config settings.

const config: { [key: string]: Knex.Config } = {
  development: {
    client: "postgresql",
    connection: Config.DatabaseUrl,
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: "knex_migrations",
	  directory: "migrations",
    }
  },
};

export default config;
