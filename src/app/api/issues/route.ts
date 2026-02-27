import { NextRequest, NextResponse } from 'next/server';
import { createIssue, listIssues } from '@/lib/issues';

export async function GET() {
  const data = await listIssues();
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
