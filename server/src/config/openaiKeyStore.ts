import { Pool } from 'pg';

let pool: Pool | null = null;
let cachedKey: string | null = null;
let initialized = false;

function getPool(): Pool | null {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return null;
  }

  if (!pool) {
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
    });
  }

  return pool;
}

/**
 * Load the default OpenAI API key from PostgreSQL (if configured).
 * Falls back to process.env.OPENAI_API_KEY when DATABASE_URL is not set
 * or when the query fails.
 *
 * Expected table (you can change this if needed):
 *
 *   CREATE TABLE app_secrets (
 *     key text PRIMARY KEY,
 *     value text NOT NULL
 *   );
 *
 *   INSERT INTO app_secrets (key, value)
 *   VALUES ('OPENAI_API_KEY', 'sk-...');
 */
export async function getDefaultOpenAIKey(): Promise<string | undefined> {
  // If we already loaded and cached it, return the cached value
  if (initialized) {
    return cachedKey ?? process.env.OPENAI_API_KEY;
  }

  initialized = true;

  const pgPool = getPool();

  if (!pgPool) {
    // No DATABASE_URL configured; fall back to environment variable
    return process.env.OPENAI_API_KEY;
  }

  try {
    const result = await pgPool.query<{ value: string }>(
      'SELECT value FROM app_secrets WHERE key = $1 LIMIT 1',
      ['OPENAI_API_KEY'],
    );

    if (result.rows.length > 0) {
      cachedKey = result.rows[0].value;
      return cachedKey;
    }

    // If no row is found, fall back to environment variable
    return process.env.OPENAI_API_KEY;
  } catch (error) {
    console.error('Failed to load OpenAI API key from PostgreSQL. Falling back to environment variable.', error);
    return process.env.OPENAI_API_KEY;
  }
}

