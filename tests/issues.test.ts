import { beforeEach, describe, expect, it } from 'vitest';
import sqlite3 from 'sqlite3';
import { drizzle } from 'drizzle-orm/sqlite3';
import { desc } from 'drizzle-orm';
import { issues } from '../src/db/schema';

describe('issues create/list flow', () => {
  const sqlite = new sqlite3.Database(':memory:');
  const db = drizzle(sqlite);

  beforeEach(async () => {
    await new Promise<void>((resolve, reject) => {
      sqlite.serialize(() => {
        sqlite.run('DROP TABLE IF EXISTS issues');
        sqlite.run(
          `CREATE TABLE issues (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'open',
            created_at INTEGER NOT NULL
          )`,
          (err) => (err ? reject(err) : resolve()),
        );
      });
    });
  });

  it('creates and lists issues in reverse id order', async () => {
    await db.insert(issues).values({ title: 'First', description: 'A', status: 'open' });
    await db.insert(issues).values({ title: 'Second', description: 'B', status: 'open' });

    const rows = await db.select().from(issues).orderBy(desc(issues.id));

    expect(rows).toHaveLength(2);
    expect(rows[0].title).toBe('Second');
    expect(rows[1].title).toBe('First');
  });
});
