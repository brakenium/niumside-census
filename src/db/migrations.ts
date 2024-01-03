import { logger } from 'src/logger';
import knexconfig from './knexfile';
import { knex } from 'knex';

// Run migrations on start
logger.info("Running migrations");
knexconfig.development.migrations!.directory = __dirname + "/migrations";
const knexInstance = knex(knexconfig.development);
// set current working directory to src/db
await knexInstance.migrate.latest();
logger.info("Migrations complete");
