import Database from 'better-sqlite3';
import { desc, eq, like, and } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';
import { issues, isValidTransition, issueStatus, issuePriority } from '../src/db/schema';
import type { IssueStatus, IssuePriority } from '../src/db/schema';

const CREATE_TABLE = `CREATE TABLE issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  created_at INTEGER NOT NULL
)`;

function setupDb() {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite);
  sqlite.exec('DROP TABLE IF EXISTS issues');
  sqlite.exec(CREATE_TABLE);
  return { sqlite, db };
}

// Helper that mirrors listIssues logic with filters
async function listIssues(
  db: ReturnType<typeof drizzle>,
  opts?: { status?: IssueStatus; search?: string },
) {
  const conditions = [];
  if (opts?.status) conditions.push(eq(issues.status, opts.status));
  if (opts?.search) conditions.push(like(issues.title, `%${opts.search}%`));

  if (conditions.length === 1) {
    return db.select().from(issues).where(conditions[0]).orderBy(desc(issues.id));
  }
  if (conditions.length === 2) {
    return db.select().from(issues).where(and(conditions[0], conditions[1])).orderBy(desc(issues.id));
  }
  return db.select().from(issues).orderBy(desc(issues.id));
}

// ── CRUD ────────────────────────────────────────────

describe('CRUD operations', () => {
  const { sqlite, db } = setupDb();

  beforeEach(() => {
    sqlite.exec('DROP TABLE IF EXISTS issues');
    sqlite.exec(CREATE_TABLE);
  });

  it('creates an issue with all fields', async () => {
    const [row] = await db
      .insert(issues)
      .values({ title: 'Bug', description: 'Broken', status: 'open', priority: 'high' })
      .returning();

    expect(row.id).toBe(1);
    expect(row.title).toBe('Bug');
    expect(row.description).toBe('Broken');
    expect(row.status).toBe('open');
    expect(row.priority).toBe('high');
    expect(row.createdAt).toBeDefined();
  });

  it('reads an issue by id', async () => {
    const [created] = await db
      .insert(issues)
      .values({ title: 'Read me', description: 'Desc', status: 'open' })
      .returning();

    const [found] = await db.select().from(issues).where(eq(issues.id, created.id));
    expect(found.title).toBe('Read me');
  });

  it('updates an issue', async () => {
    const [created] = await db
      .insert(issues)
      .values({ title: 'Old', description: 'Old', status: 'open' })
      .returning();

    const [updated] = await db
      .update(issues)
      .set({ title: 'New', description: 'New desc' })
      .where(eq(issues.id, created.id))
      .returning();

    expect(updated.title).toBe('New');
    expect(updated.description).toBe('New desc');
  });

  it('deletes an issue', async () => {
    const [created] = await db
      .insert(issues)
      .values({ title: 'Delete me', description: 'Gone', status: 'open' })
      .returning();

    const result = db.delete(issues).where(eq(issues.id, created.id)).run();
    expect(result.changes).toBe(1);

    const remaining = await db.select().from(issues);
    expect(remaining).toHaveLength(0);
  });

  it('delete of non-existent id changes nothing', () => {
    const result = db.delete(issues).where(eq(issues.id, 9999)).run();
    expect(result.changes).toBe(0);
  });

  it('lists issues in reverse id order', async () => {
    await db.insert(issues).values({ title: 'A', description: 'a', status: 'open' });
    await db.insert(issues).values({ title: 'B', description: 'b', status: 'open' });
    await db.insert(issues).values({ title: 'C', description: 'c', status: 'open' });

    const rows = await listIssues(db);
    expect(rows.map((r) => r.title)).toEqual(['C', 'B', 'A']);
  });
});

// ── Status Transitions ──────────────────────────────

describe('status transitions', () => {
  it.each([
    ['open', 'in_progress', true],
    ['in_progress', 'done', true],
    ['open', 'done', false],
    ['done', 'open', false],
    ['done', 'in_progress', false],
    ['in_progress', 'open', false],
    ['open', 'open', false],
    ['done', 'done', false],
  ] as const)('%s → %s = %s', (from, to, expected) => {
    expect(isValidTransition(from, to)).toBe(expected);
  });

  const { sqlite, db } = setupDb();

  beforeEach(() => {
    sqlite.exec('DROP TABLE IF EXISTS issues');
    sqlite.exec(CREATE_TABLE);
  });

  it('transitions status in DB open → in_progress → done', async () => {
    const [created] = await db
      .insert(issues)
      .values({ title: 'Flow', description: 'Test flow', status: 'open' })
      .returning();

    expect(isValidTransition('open', 'in_progress')).toBe(true);
    const [step1] = await db
      .update(issues)
      .set({ status: 'in_progress' })
      .where(eq(issues.id, created.id))
      .returning();
    expect(step1.status).toBe('in_progress');

    expect(isValidTransition('in_progress', 'done')).toBe(true);
    const [step2] = await db
      .update(issues)
      .set({ status: 'done' })
      .where(eq(issues.id, created.id))
      .returning();
    expect(step2.status).toBe('done');
  });
});

// ── Priority ────────────────────────────────────────

describe('priority levels', () => {
  const { sqlite, db } = setupDb();

  beforeEach(() => {
    sqlite.exec('DROP TABLE IF EXISTS issues');
    sqlite.exec(CREATE_TABLE);
  });

  it('stores and retrieves all priority levels', async () => {
    for (const p of issuePriority) {
      const [row] = await db
        .insert(issues)
        .values({ title: `P-${p}`, description: 'x', status: 'open', priority: p })
        .returning();
      expect(row.priority).toBe(p);
    }
  });

  it('defaults priority to medium', async () => {
    const [row] = await db
      .insert(issues)
      .values({ title: 'Default', description: 'x', status: 'open' })
      .returning();
    expect(row.priority).toBe('medium');
  });

  it('updates priority', async () => {
    const [created] = await db
      .insert(issues)
      .values({ title: 'Prio', description: 'x', status: 'open', priority: 'low' })
      .returning();

    const [updated] = await db
      .update(issues)
      .set({ priority: 'high' })
      .where(eq(issues.id, created.id))
      .returning();

    expect(updated.priority).toBe('high');
  });
});

// ── Filtering & Search (ACM-8) ─────────────────────

describe('filtering by status', () => {
  const { sqlite, db } = setupDb();

  beforeEach(() => {
    sqlite.exec('DROP TABLE IF EXISTS issues');
    sqlite.exec(CREATE_TABLE);
  });

  it('filters by status=open', async () => {
    await db.insert(issues).values({ title: 'A', description: 'a', status: 'open' });
    await db.insert(issues).values({ title: 'B', description: 'b', status: 'in_progress' });
    await db.insert(issues).values({ title: 'C', description: 'c', status: 'done' });

    const rows = await listIssues(db, { status: 'open' });
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe('A');
  });

  it('filters by status=done', async () => {
    await db.insert(issues).values({ title: 'A', description: 'a', status: 'open' });
    await db.insert(issues).values({ title: 'B', description: 'b', status: 'done' });

    const rows = await listIssues(db, { status: 'done' });
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe('B');
  });

  it('returns all when no filter', async () => {
    await db.insert(issues).values({ title: 'A', description: 'a', status: 'open' });
    await db.insert(issues).values({ title: 'B', description: 'b', status: 'done' });

    const rows = await listIssues(db);
    expect(rows).toHaveLength(2);
  });
});

describe('search by title', () => {
  const { sqlite, db } = setupDb();

  beforeEach(() => {
    sqlite.exec('DROP TABLE IF EXISTS issues');
    sqlite.exec(CREATE_TABLE);
  });

  it('finds issues matching search term', async () => {
    await db.insert(issues).values({ title: 'Login bug', description: 'a', status: 'open' });
    await db.insert(issues).values({ title: 'Signup bug', description: 'b', status: 'open' });
    await db.insert(issues).values({ title: 'Dashboard slow', description: 'c', status: 'open' });

    const rows = await listIssues(db, { search: 'bug' });
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.title.includes('bug'))).toBe(true);
  });

  it('returns empty for no match', async () => {
    await db.insert(issues).values({ title: 'Nothing here', description: 'a', status: 'open' });

    const rows = await listIssues(db, { search: 'xyz' });
    expect(rows).toHaveLength(0);
  });

  it('search is case-insensitive via LIKE', async () => {
    await db.insert(issues).values({ title: 'Login Bug', description: 'a', status: 'open' });

    // SQLite LIKE is case-insensitive for ASCII
    const rows = await listIssues(db, { search: 'login' });
    expect(rows).toHaveLength(1);
  });
});

describe('combined filter + search', () => {
  const { sqlite, db } = setupDb();

  beforeEach(() => {
    sqlite.exec('DROP TABLE IF EXISTS issues');
    sqlite.exec(CREATE_TABLE);
  });

  it('filters by status AND search together', async () => {
    await db.insert(issues).values({ title: 'Login bug', description: 'a', status: 'open' });
    await db.insert(issues).values({ title: 'Login fix', description: 'b', status: 'done' });
    await db.insert(issues).values({ title: 'Signup bug', description: 'c', status: 'open' });

    const rows = await listIssues(db, { status: 'open', search: 'Login' });
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe('Login bug');
  });
});

// ── Error Cases ─────────────────────────────────────

describe('schema constants', () => {
  it('issueStatus contains expected values', () => {
    expect(issueStatus).toEqual(['open', 'in_progress', 'done']);
  });

  it('issuePriority contains expected values', () => {
    expect(issuePriority).toEqual(['low', 'medium', 'high']);
  });
});
