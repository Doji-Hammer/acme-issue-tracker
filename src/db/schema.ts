import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const issueStatus = ['open', 'closed'] as const;
export type IssueStatus = (typeof issueStatus)[number];

export const issues = sqliteTable('issues', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description').notNull(),
  status: text('status', { enum: issueStatus }).notNull().default('open'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => Date.now()),
});

export type Issue = typeof issues.$inferSelect;
export type NewIssue = typeof issues.$inferInsert;
