import { desc, eq } from 'drizzle-orm';
import {
  issues,
  type IssueStatus,
  type IssuePriority,
  isValidTransition,
  issueStatus,
  issuePriority,
} from '@/db/schema';
import { db } from '@/lib/db';

export async function listIssues() {
  return db.select().from(issues).orderBy(desc(issues.id));
}

export async function getIssue(id: number) {
  const [issue] = await db.select().from(issues).where(eq(issues.id, id));
  return issue ?? null;
}

export async function createIssue(input: {
  title: string;
  description: string;
  status?: IssueStatus;
  priority?: IssuePriority;
}) {
  const [created] = await db
    .insert(issues)
    .values({
      title: input.title.trim(),
      description: input.description.trim(),
      status: input.status ?? 'open',
      priority: input.priority ?? 'medium',
    })
    .returning();

  return created;
}

export type UpdateIssueInput = {
  title?: string;
  description?: string;
  status?: IssueStatus;
  priority?: IssuePriority;
};

export async function updateIssue(
  id: number,
  input: UpdateIssueInput,
): Promise<{ issue: typeof issues.$inferSelect } | { error: string }> {
  const existing = await getIssue(id);
  if (!existing) return { error: 'not found' };

  // Validate status transition if status is being changed
  if (input.status && input.status !== existing.status) {
    if (!isValidTransition(existing.status, input.status)) {
      return {
        error: `invalid status transition from '${existing.status}' to '${input.status}'`,
      };
    }
  }

  const updates: Record<string, unknown> = {};
  if (input.title !== undefined) updates.title = input.title.trim();
  if (input.description !== undefined) updates.description = input.description.trim();
  if (input.status !== undefined) updates.status = input.status;
  if (input.priority !== undefined) updates.priority = input.priority;

  if (Object.keys(updates).length === 0) {
    return { issue: existing };
  }

  const [updated] = await db.update(issues).set(updates).where(eq(issues.id, id)).returning();
  return { issue: updated };
}

export async function deleteIssue(id: number) {
  const deleted = await db.delete(issues).where(eq(issues.id, id)).run();
  return deleted.changes > 0;
}

export { issueStatus, issuePriority };
