import { NextRequest, NextResponse } from 'next/server';
import { deleteIssue, updateIssueStatus } from '@/lib/issues';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const issueId = Number(id);
  const body = await req.json();
  const status = body?.status;

  if (!Number.isInteger(issueId) || (status !== 'open' && status !== 'closed')) {
    return NextResponse.json({ error: 'invalid input' }, { status: 400 });
  }

  const updated = await updateIssueStatus(issueId, status);
  if (!updated) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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
