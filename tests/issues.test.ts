import Database from 'better-sqlite3';
import { and, desc, eq, like } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';
import { issues, type IssueStatus } from '../src/db/schema';

function createTestDb() {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite);
  return { sqlite, db };
}

function resetTable(sqlite: Database.Database) {
  sqlite.exec('DROP TABLE IF EXISTS issues');
  sqlite.exec(`CREATE TABLE issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    created_at INTEGER NOT NULL
  )`);
}

describe('issues CRUD', () => {
  const { sqlite, db } = createTestDb();

  beforeEach(() => resetTable(sqlite));

  // --- CREATE ---

  it('creates an issue with defaults', async () => {
    const [created] = await db
      .insert(issues)
      .values({ title: 'Bug', description: 'It broke' })
      .returning();
    expect(created.id).toBe(1);
    expect(created.title).toBe('Bug');
    expect(created.status).toBe('open');
    expect(created.createdAt).toBeInstanceOf(Date);
  });

  it('creates an issue with explicit status', async () => {
    const [created] = await db
      .insert(issues)
      .values({ title: 'Done', description: 'Already fixed', status: 'closed' })
      .returning();
    expect(created.status).toBe('closed');
  });

  it('creates multiple issues with auto-incrementing ids', async () => {
    await db.insert(issues).values({ title: 'A', description: 'a' });
    await db.insert(issues).values({ title: 'B', description: 'b' });
    const rows = await db.select().from(issues);
    expect(rows).toHaveLength(2);
    expect(rows[0].id).toBe(1);
    expect(rows[1].id).toBe(2);
  });

  // --- READ / LIST ---

  it('lists issues in reverse id order', async () => {
    await db.insert(issues).values({ title: 'First', description: 'A', status: 'open' });
    await db.insert(issues).values({ title: 'Second', description: 'B', status: 'open' });
    const rows = await db.select().from(issues).orderBy(desc(issues.id));
    expect(rows).toHaveLength(2);
    expect(rows[0].title).toBe('Second');
    expect(rows[1].title).toBe('First');
  });

  it('returns empty array when no issues exist', async () => {
    const rows = await db.select().from(issues);
    expect(rows).toHaveLength(0);
  });

  // --- UPDATE (status transition) ---

  it('updates issue status from open to closed', async () => {
    const [created] = await db
      .insert(issues)
      .values({ title: 'T', description: 'D' })
      .returning();
    const [updated] = await db
      .update(issues)
      .set({ status: 'closed' })
      .where(eq(issues.id, created.id))
      .returning();
    expect(updated.status).toBe('closed');
  });

  it('updates issue status from closed to open (reopen)', async () => {
    const [created] = await db
      .insert(issues)
      .values({ title: 'T', description: 'D', status: 'closed' })
      .returning();
    const [updated] = await db
      .update(issues)
      .set({ status: 'open' })
      .where(eq(issues.id, created.id))
      .returning();
    expect(updated.status).toBe('open');
  });

  it('update on non-existent id returns empty', async () => {
    const result = await db
      .update(issues)
      .set({ status: 'closed' })
      .where(eq(issues.id, 9999))
      .returning();
    expect(result).toHaveLength(0);
  });

  // --- DELETE ---

  it('deletes an existing issue', async () => {
    const [created] = await db
      .insert(issues)
      .values({ title: 'T', description: 'D' })
      .returning();
    const result = await db.delete(issues).where(eq(issues.id, created.id)).run();
    expect(result.changes).toBe(1);
    const rows = await db.select().from(issues);
    expect(rows).toHaveLength(0);
  });

  it('delete on non-existent id changes nothing', async () => {
    const result = await db.delete(issues).where(eq(issues.id, 9999)).run();
    expect(result.changes).toBe(0);
  });
});

describe('issues filtering and search (ACM-8)', () => {
  const { sqlite, db } = createTestDb();

  beforeEach(async () => {
    resetTable(sqlite);
    await db.insert(issues).values([
      { title: 'Login bug', description: 'Cannot login', status: 'open' },
      { title: 'Signup crash', description: 'Crash on signup', status: 'closed' },
      { title: 'Dashboard bug', description: 'Layout broken', status: 'open' },
      { title: 'Performance issue', description: 'Slow loading', status: 'closed' },
    ]);
  });

  async function listIssuesFiltered(filters?: { status?: IssueStatus; search?: string }) {
    const conditions = [];
    if (filters?.status) conditions.push(eq(issues.status, filters.status));
    if (filters?.search) conditions.push(like(issues.title, `%${filters.search}%`));
    return db
      .select()
      .from(issues)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(issues.id));
  }

  it('returns all issues when no filters', async () => {
    const rows = await listIssuesFiltered();
    expect(rows).toHaveLength(4);
  });

  it('filters by status=open', async () => {
    const rows = await listIssuesFiltered({ status: 'open' });
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.status === 'open')).toBe(true);
  });

  it('filters by status=closed', async () => {
    const rows = await listIssuesFiltered({ status: 'closed' });
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.status === 'closed')).toBe(true);
  });

  it('searches by title keyword', async () => {
    const rows = await listIssuesFiltered({ search: 'bug' });
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.title.toLowerCase().includes('bug'))).toBe(true);
  });

  it('search is case-insensitive for ASCII via LIKE', async () => {
    // SQLite LIKE is case-insensitive for ASCII
    const rows = await listIssuesFiltered({ search: 'BUG' });
    expect(rows).toHaveLength(2);
  });

  it('combines status filter and search', async () => {
    const rows = await listIssuesFiltered({ status: 'open', search: 'bug' });
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.status === 'open' && r.title.toLowerCase().includes('bug'))).toBe(
      true,
    );
  });

  it('returns empty for search with no matches', async () => {
    const rows = await listIssuesFiltered({ search: 'nonexistent' });
    expect(rows).toHaveLength(0);
  });

  it('returns empty for valid status with no-match search', async () => {
    const rows = await listIssuesFiltered({ status: 'open', search: 'zzz' });
    expect(rows).toHaveLength(0);
  });
});

describe('API route logic simulation (ACM-10)', () => {
  const { sqlite, db } = createTestDb();

  beforeEach(() => resetTable(sqlite));

  // Simulate the API handlers using the same db logic

  async function apiCreate(body: Record<string, unknown>) {
    if (!body?.title || !body?.description) {
      return { status: 400, data: { error: 'title and description are required' } };
    }
    const [issue] = await db
      .insert(issues)
      .values({
        title: String(body.title).trim(),
        description: String(body.description).trim(),
        status: body.status === 'closed' ? 'closed' : 'open',
      })
      .returning();
    return { status: 201, data: issue };
  }

  async function apiList(params?: { status?: string; search?: string }) {
    const conditions = [];
    if (params?.status === 'open' || params?.status === 'closed') {
      conditions.push(eq(issues.status, params.status));
    }
    if (params?.search) {
      conditions.push(like(issues.title, `%${params.search}%`));
    }
    const data = await db
      .select()
      .from(issues)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(issues.id));
    return { status: 200, data };
  }

  async function apiPatch(id: string, body: Record<string, unknown>) {
    const issueId = Number(id);
    const status = body?.status;
    if (!Number.isInteger(issueId) || (status !== 'open' && status !== 'closed')) {
      return { status: 400, data: { error: 'invalid input' } };
    }
    const [updated] = await db
      .update(issues)
      .set({ status })
      .where(eq(issues.id, issueId))
      .returning();
    if (!updated) return { status: 404, data: { error: 'not found' } };
    return { status: 200, data: updated };
  }

  async function apiDelete(id: string) {
    const issueId = Number(id);
    if (!Number.isInteger(issueId)) {
      return { status: 400, data: { error: 'invalid id' } };
    }
    const result = await db.delete(issues).where(eq(issues.id, issueId)).run();
    if (result.changes === 0) return { status: 404, data: { error: 'not found' } };
    return { status: 200, data: { ok: true } };
  }

  // POST /api/issues

  it('POST creates issue and returns 201', async () => {
    const res = await apiCreate({ title: 'New', description: 'Desc' });
    expect(res.status).toBe(201);
    expect(res.data).toMatchObject({ title: 'New', description: 'Desc', status: 'open' });
  });

  it('POST trims whitespace', async () => {
    const res = await apiCreate({ title: '  Spaced  ', description: '  Desc  ' });
    expect(res.status).toBe(201);
    expect(res.data).toMatchObject({ title: 'Spaced', description: 'Desc' });
  });

  it('POST returns 400 when title missing', async () => {
    const res = await apiCreate({ description: 'Desc' });
    expect(res.status).toBe(400);
  });

  it('POST returns 400 when description missing', async () => {
    const res = await apiCreate({ title: 'T' });
    expect(res.status).toBe(400);
  });

  it('POST returns 400 when body is empty', async () => {
    const res = await apiCreate({});
    expect(res.status).toBe(400);
  });

  it('POST defaults status to open', async () => {
    const res = await apiCreate({ title: 'T', description: 'D' });
    expect(res.data).toMatchObject({ status: 'open' });
  });

  it('POST accepts explicit closed status', async () => {
    const res = await apiCreate({ title: 'T', description: 'D', status: 'closed' });
    expect(res.data).toMatchObject({ status: 'closed' });
  });

  it('POST ignores invalid status values', async () => {
    const res = await apiCreate({ title: 'T', description: 'D', status: 'invalid' });
    expect(res.data).toMatchObject({ status: 'open' });
  });

  // GET /api/issues

  it('GET returns all issues', async () => {
    await apiCreate({ title: 'A', description: 'a' });
    await apiCreate({ title: 'B', description: 'b' });
    const res = await apiList();
    expect(res.data).toHaveLength(2);
  });

  it('GET filters by status', async () => {
    await apiCreate({ title: 'A', description: 'a', status: 'open' });
    await apiCreate({ title: 'B', description: 'b', status: 'closed' });
    const res = await apiList({ status: 'closed' });
    expect(res.data).toHaveLength(1);
    expect(res.data[0]).toMatchObject({ title: 'B' });
  });

  it('GET searches by title', async () => {
    await apiCreate({ title: 'Login bug', description: 'a' });
    await apiCreate({ title: 'Signup crash', description: 'b' });
    const res = await apiList({ search: 'Login' });
    expect(res.data).toHaveLength(1);
    expect(res.data[0]).toMatchObject({ title: 'Login bug' });
  });

  it('GET combines status + search', async () => {
    await apiCreate({ title: 'Login bug', description: 'a', status: 'open' });
    await apiCreate({ title: 'Login fix', description: 'b', status: 'closed' });
    await apiCreate({ title: 'Other', description: 'c', status: 'open' });
    const res = await apiList({ status: 'open', search: 'Login' });
    expect(res.data).toHaveLength(1);
    expect(res.data[0]).toMatchObject({ title: 'Login bug' });
  });

  it('GET ignores invalid status param', async () => {
    await apiCreate({ title: 'A', description: 'a' });
    const res = await apiList({ status: 'invalid' });
    expect(res.data).toHaveLength(1);
  });

  // PATCH /api/issues/:id

  it('PATCH updates status', async () => {
    const created = await apiCreate({ title: 'T', description: 'D' });
    const res = await apiPatch(String((created.data as { id: number }).id), { status: 'closed' });
    expect(res.status).toBe(200);
    expect(res.data).toMatchObject({ status: 'closed' });
  });

  it('PATCH returns 404 for non-existent id', async () => {
    const res = await apiPatch('9999', { status: 'closed' });
    expect(res.status).toBe(404);
  });

  it('PATCH returns 400 for non-integer id', async () => {
    const res = await apiPatch('abc', { status: 'closed' });
    expect(res.status).toBe(400);
  });

  it('PATCH returns 400 for invalid status', async () => {
    await apiCreate({ title: 'T', description: 'D' });
    const res = await apiPatch('1', { status: 'invalid' });
    expect(res.status).toBe(400);
  });

  it('PATCH returns 400 when status missing', async () => {
    await apiCreate({ title: 'T', description: 'D' });
    const res = await apiPatch('1', {});
    expect(res.status).toBe(400);
  });

  it('PATCH can reopen a closed issue', async () => {
    const created = await apiCreate({ title: 'T', description: 'D', status: 'closed' });
    const res = await apiPatch(String((created.data as { id: number }).id), { status: 'open' });
    expect(res.status).toBe(200);
    expect(res.data).toMatchObject({ status: 'open' });
  });

  // DELETE /api/issues/:id

  it('DELETE removes an issue', async () => {
    const created = await apiCreate({ title: 'T', description: 'D' });
    const res = await apiDelete(String((created.data as { id: number }).id));
    expect(res.status).toBe(200);
    expect(res.data).toEqual({ ok: true });
    const list = await apiList();
    expect(list.data).toHaveLength(0);
  });

  it('DELETE returns 404 for non-existent id', async () => {
    const res = await apiDelete('9999');
    expect(res.status).toBe(404);
  });

  it('DELETE returns 400 for non-integer id', async () => {
    const res = await apiDelete('abc');
    expect(res.status).toBe(400);
  });

  // Full CRUD lifecycle

  it('full lifecycle: create → list → update → delete', async () => {
    // Create
    const created = await apiCreate({ title: 'Lifecycle', description: 'Test' });
    expect(created.status).toBe(201);
    const id = String((created.data as { id: number }).id);

    // List
    let list = await apiList();
    expect(list.data).toHaveLength(1);

    // Update
    const updated = await apiPatch(id, { status: 'closed' });
    expect(updated.status).toBe(200);
    expect(updated.data).toMatchObject({ status: 'closed' });

    // Verify filter
    const openOnly = await apiList({ status: 'open' });
    expect(openOnly.data).toHaveLength(0);
    const closedOnly = await apiList({ status: 'closed' });
    expect(closedOnly.data).toHaveLength(1);

    // Delete
    const deleted = await apiDelete(id);
    expect(deleted.status).toBe(200);

    // Verify gone
    list = await apiList();
    expect(list.data).toHaveLength(0);
  });
});
