import { randomBytes } from "node:crypto";

import { PostgreSqlContainer } from "@testcontainers/postgresql";
import pg from "pg";

// Same major version as the development server.
const POSTGRES_IMAGE = "postgres:17-alpine";

export interface TestDatabase {
  url: string;
  stop(): Promise<void>;
}

async function withClient<T>(connectionString: string, fn: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

/** Creates a uniquely named database on an existing server and drops it on stop (machines without Docker). */
async function createThrowawayDatabase(adminUrl: string): Promise<TestDatabase> {
  const name = `devmentor_it_${randomBytes(6).toString("hex")}`;
  await withClient(adminUrl, (client) => client.query(`create database "${name}"`));
  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  return {
    url: url.toString(),
    stop: async () => {
      await withClient(adminUrl, (client) => client.query(`drop database if exists "${name}" with (force)`));
    },
  };
}

/**
 * An ephemeral PostgreSQL database: a Testcontainers instance by default (CI), or a throwaway database on
 * the server in INTEGRATION_DATABASE_URL (an admin connection string) when Docker isn't available.
 */
export async function startDatabase(): Promise<TestDatabase> {
  const adminUrl = process.env.INTEGRATION_DATABASE_URL;
  if (adminUrl) return createThrowawayDatabase(adminUrl);
  const container = await new PostgreSqlContainer(POSTGRES_IMAGE).start();
  return {
    url: container.getConnectionUri(),
    stop: async () => {
      await container.stop();
    },
  };
}
