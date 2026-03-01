import { and, desc, eq, like } from 'drizzle-orm';
import { issues, type IssueStatus } from '@/db/schema';
import { db } from '@/lib/db';

export async function listIssues(filters?: { status?: IssueStatus; search?: string }) {
  const conditions = [];
  if (filters?.status) {
    conditions.push(eq(issues.status, filters.status));
  }
  if (filters?.search) {
    conditions.push(like(issues.title, `%${filters.search}%`));
  }
  return db
    .select()
    .from(issues)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(issues.id));
}

export async function createIssue(input: {
  title: string;
  description: string;
  status?: IssueStatus;
}) {
  const [created] = await db
    .insert(issues)
    .values({
      title: input.title.trim(),
      description: input.description.trim(),
      status: input.status ?? 'open',
    })
    .returning();

  return created;
}

export async function updateIssueStatus(id: number, status: IssueStatus) {
  const [updated] = await db.update(issues).set({ status }).where(eq(issues.id, id)).returning();

  return updated ?? null;
}

export async function deleteIssue(id: number) {
  const deleted = await db.delete(issues).where(eq(issues.id, id)).run();
  return deleted.changes > 0;
}
