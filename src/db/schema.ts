import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const issueStatus = ['open', 'in_progress', 'done'] as const;
export type IssueStatus = (typeof issueStatus)[number];

export const issuePriority = ['low', 'medium', 'high'] as const;
export type IssuePriority = (typeof issuePriority)[number];

/** Valid status transitions: open → in_progress → done */
const validTransitions: Record<IssueStatus, IssueStatus[]> = {
  open: ['in_progress'],
  in_progress: ['done'],
  done: [],
};

export function isValidTransition(from: IssueStatus, to: IssueStatus): boolean {
  return validTransitions[from]?.includes(to) ?? false;
}

export const issues = sqliteTable('issues', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description').notNull(),
  status: text('status', { enum: issueStatus }).notNull().default('open'),
  priority: text('priority', { enum: issuePriority }).notNull().default('medium'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type Issue = typeof issues.$inferSelect;
export type NewIssue = typeof issues.$inferInsert;
