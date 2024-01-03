import knexconfig from './knexfile';
import { knex } from 'knex';

// Run migrations on start
knexconfig.development.migrations!.directory = __dirname + "/migrations";
const knexInstance = knex(knexconfig.development);
// set current working directory to src/db
await knexInstance.migrate.latest();
