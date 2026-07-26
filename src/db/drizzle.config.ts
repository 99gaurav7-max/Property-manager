import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
const ssl = process.env.PGSSLMODE === 'require' || databaseUrl?.includes('sslmode=require');

let dbCredentials: Record<string, any>;

if (databaseUrl) {
  dbCredentials = { url: databaseUrl, ssl };
} else {
  const sqlHost = process.env.SQL_HOST || process.env.PGHOST;
  const sqlDbName = process.env.SQL_DB_NAME || process.env.PGDATABASE;
  const user = process.env.SQL_ADMIN_USER || process.env.SQL_USER;
  const password = process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD;

  if (!sqlHost) throw new Error("SQL_HOST must be set.");
  if (!sqlDbName) throw new Error("SQL_DB_NAME must be set.");
  if (!user) throw new Error("SQL_ADMIN_USER or SQL_USER must be set.");
  if (!password) throw new Error("SQL_ADMIN_PASSWORD or SQL_PASSWORD must be set.");

  dbCredentials = { host: sqlHost, user, password, database: sqlDbName, ssl };
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials,
  verbose: true,
});
