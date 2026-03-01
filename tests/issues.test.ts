import Database from 'better-sqlite3';
import { desc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';
import { issues } from '../src/db/schema';
import { isValidTransition } from '../src/db/schema';

const CREATE_TABLE = `CREATE TABLE issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  created_at INTEGER NOT NULL
)`;

describe('issues create/list flow', () => {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite);

  beforeEach(() => {
    sqlite.exec('DROP TABLE IF EXISTS issues');
    sqlite.exec(CREATE_TABLE);
  });

  it('creates and lists issues in reverse id order', async () => {
    await db.insert(issues).values({ title: 'First', description: 'A', status: 'open' });
    await db.insert(issues).values({ title: 'Second', description: 'B', status: 'open' });

    const rows = await db.select().from(issues).orderBy(desc(issues.id));

    expect(rows).toHaveLength(2);
    expect(rows[0].title).toBe('Second');
    expect(rows[1].title).toBe('First');
  });

  it('creates issue with priority', async () => {
    await db
      .insert(issues)
      .values({ title: 'Urgent', description: 'Fix now', status: 'open', priority: 'high' });

    const [row] = await db.select().from(issues);
    expect(row.priority).toBe('high');
  });

  it('defaults priority to medium', async () => {
    await db.insert(issues).values({ title: 'Normal', description: 'Whatever', status: 'open' });

    const [row] = await db.select().from(issues);
    expect(row.priority).toBe('medium');
  });
});

describe('issue updates', () => {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite);

  beforeEach(() => {
    sqlite.exec('DROP TABLE IF EXISTS issues');
    sqlite.exec(CREATE_TABLE);
  });

  it('updates title and description', async () => {
    const [created] = await db
      .insert(issues)
      .values({ title: 'Old', description: 'Old desc', status: 'open' })
      .returning();

    const [updated] = await db
      .update(issues)
      .set({ title: 'New', description: 'New desc' })
      .where(eq(issues.id, created.id))
      .returning();

    expect(updated.title).toBe('New');
    expect(updated.description).toBe('New desc');
  });

  it('updates priority', async () => {
    const [created] = await db
      .insert(issues)
      .values({ title: 'Test', description: 'Desc', status: 'open', priority: 'low' })
      .returning();

    const [updated] = await db
      .update(issues)
      .set({ priority: 'high' })
      .where(eq(issues.id, created.id))
      .returning();

    expect(updated.priority).toBe('high');
  });
});

describe('status transitions', () => {
  it('allows open → in_progress', () => {
    expect(isValidTransition('open', 'in_progress')).toBe(true);
  });

  it('allows in_progress → done', () => {
    expect(isValidTransition('in_progress', 'done')).toBe(true);
  });

  it('rejects open → done', () => {
    expect(isValidTransition('open', 'done')).toBe(false);
  });

  it('rejects done → open', () => {
    expect(isValidTransition('done', 'open')).toBe(false);
  });

  it('rejects done → in_progress', () => {
    expect(isValidTransition('done', 'in_progress')).toBe(false);
  });

  it('rejects in_progress → open', () => {
    expect(isValidTransition('in_progress', 'open')).toBe(false);
  });
});
