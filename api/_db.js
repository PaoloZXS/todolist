import { createClient } from "@libsql/client";

let cachedClient;

export function getDbClient() {
  if (cachedClient) return cachedClient;

  const url = process.env.TURSO_DB_URL;
  const authToken = process.env.TURSO_DB_TOKEN;

  if (!url || !authToken) {
    throw new Error("Variabili ambiente TURSO_DB_URL/TURSO_DB_TOKEN mancanti.");
  }

  cachedClient = createClient({
    url,
    authToken
  });

  return cachedClient;
}

export async function execute(sql, args = []) {
  const client = getDbClient();
  return client.execute({ sql, args });
}
