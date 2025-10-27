import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

export const db = drizzle(process.env.DATABASE_URL!, { schema });

// Export the schema for use in other files
export * from './schema';

// Export type helpers
export type DB = typeof db;
export type Schema = typeof schema;