import { NextRequest, NextResponse } from 'next/server';
import { createIssue, listIssues, issueStatus, issuePriority } from '@/lib/issues';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') as import('@/db/schema').IssueStatus | null;
  const search = searchParams.get('search');

  if (status && !issueStatus.includes(status)) {
    return NextResponse.json({ error: 'invalid status filter' }, { status: 400 });
  }

  const data = await listIssues({
    status: status ?? undefined,
    search: search ?? undefined,
  });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body?.title || !body?.description) {
    return NextResponse.json({ error: 'title and description are required' }, { status: 400 });
  }

  const status = issueStatus.includes(body.status) ? body.status : 'open';
  const priority = issuePriority.includes(body.priority) ? body.priority : 'medium';

  const issue = await createIssue({
    title: String(body.title),
    description: String(body.description),
    status,
    priority,
  });

  return NextResponse.json(issue, { status: 201 });
}
