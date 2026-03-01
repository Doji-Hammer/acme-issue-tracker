import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

const dbFile = process.env.DATABASE_URL ?? './drizzle/local.sqlite';
const dir = dirname(dbFile);
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
const sqlite = new Database(dbFile);

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    priority TEXT NOT NULL DEFAULT 'medium',
    created_at INTEGER NOT NULL
  )
`);

export const db = drizzle(sqlite);
