import { listIssues } from '@/lib/issues';
import { revalidatePath } from 'next/cache';
import type { IssueStatus, IssuePriority } from '@/db/schema';

const statusLabels: Record<IssueStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  done: 'Done',
};

const statusColors: Record<IssueStatus, string> = {
  open: '#3b82f6',
  in_progress: '#f59e0b',
  done: '#22c55e',
};

const priorityLabels: Record<IssuePriority, string> = {
  low: '🟢 Low',
  medium: '🟡 Medium',
  high: '🔴 High',
};

async function createIssueAction(formData: FormData) {
  'use server';

  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const priority = String(formData.get('priority') ?? 'medium');

  if (!title || !description) {
    return;
  }

  await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/api/issues`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title, description, status: 'open', priority }),
    cache: 'no-store',
  });

  revalidatePath('/');
}

async function updateStatusAction(formData: FormData) {
  'use server';
  const id = Number(formData.get('id'));
  const status = String(formData.get('status'));
  if (!Number.isInteger(id)) return;

  await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/api/issues/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status }),
    cache: 'no-store',
  });

  revalidatePath('/');
}

export default async function HomePage() {
  const issues = await listIssues();

  return (
    <main>
      <h1>ACME Issue Tracker</h1>
      <form action={createIssueAction}>
        <input name="title" placeholder="Issue title" required />
        <textarea name="description" placeholder="Issue description" required />
        <select name="priority" defaultValue="medium">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <button type="submit">Create Issue</button>
      </form>

      <ul>
        {issues.map((issue) => (
          <li key={issue.id}>
            <strong>{issue.title}</strong>
            <span>{priorityLabels[issue.priority]}</span>
            <p>{issue.description}</p>
            <p>
              Status:{' '}
              <span
                style={{
                  backgroundColor: statusColors[issue.status],
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '0.85em',
                }}
              >
                {statusLabels[issue.status]}
              </span>
            </p>
            {issue.status === 'open' && (
              <form action={updateStatusAction}>
                <input type="hidden" name="id" value={issue.id} />
                <input type="hidden" name="status" value="in_progress" />
                <button type="submit">Start Progress</button>
              </form>
            )}
            {issue.status === 'in_progress' && (
              <form action={updateStatusAction}>
                <input type="hidden" name="id" value={issue.id} />
                <input type="hidden" name="status" value="done" />
                <button type="submit">Mark Done</button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
