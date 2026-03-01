import { NextRequest, NextResponse } from 'next/server';
import { deleteIssue, updateIssue, issueStatus, issuePriority } from '@/lib/issues';
import type { IssueStatus, IssuePriority } from '@/db/schema';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const issueId = Number(id);

  if (!Number.isInteger(issueId)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }

  const body = await req.json();

  // Validate that at least one field is provided
  const { title, description, status, priority } = body ?? {};
  if (
    title === undefined &&
    description === undefined &&
    status === undefined &&
    priority === undefined
  ) {
    return NextResponse.json(
      { error: 'at least one of title, description, status, or priority is required' },
      { status: 400 },
    );
  }

  // Validate individual fields if present
  if (status !== undefined && !issueStatus.includes(status as IssueStatus)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 });
  }

  if (priority !== undefined && !issuePriority.includes(priority as IssuePriority)) {
    return NextResponse.json({ error: 'invalid priority' }, { status: 400 });
  }

  if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
    return NextResponse.json({ error: 'title must be a non-empty string' }, { status: 400 });
  }

  if (description !== undefined && (typeof description !== 'string' || !description.trim())) {
    return NextResponse.json(
      { error: 'description must be a non-empty string' },
      { status: 400 },
    );
  }

  const result = await updateIssue(issueId, {
    title: title as string | undefined,
    description: description as string | undefined,
    status: status as IssueStatus | undefined,
    priority: priority as IssuePriority | undefined,
  });

  if ('error' in result) {
    const statusCode = result.error === 'not found' ? 404 : 409;
    return NextResponse.json({ error: result.error }, { status: statusCode });
  }

  return NextResponse.json(result.issue);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const issueId = Number(id);

  if (!Number.isInteger(issueId)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }

  const deleted = await deleteIssue(issueId);
  if (!deleted) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
