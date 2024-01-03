import postgres from 'postgres'
import { Config } from 'src/config';

export const sql = postgres(Config.DatabaseUrl.toString())
