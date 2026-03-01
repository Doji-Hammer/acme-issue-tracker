import { NextRequest, NextResponse } from 'next/server';
import { createIssue, listIssues } from '@/lib/issues';
import { type IssueStatus, issueStatus } from '@/db/schema';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const status = searchParams.get('status') as IssueStatus | null;
  const search = searchParams.get('search');

  const filters: { status?: IssueStatus; search?: string } = {};
  if (status && issueStatus.includes(status)) {
    filters.status = status;
  }
  if (search) {
    filters.search = search;
  }

  const data = await listIssues(filters);
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body?.title || !body?.description) {
    return NextResponse.json({ error: 'title and description are required' }, { status: 400 });
  }

  const issue = await createIssue({
    title: String(body.title),
    description: String(body.description),
    status: body.status === 'closed' ? 'closed' : 'open',
  });

  return NextResponse.json(issue, { status: 201 });
}
