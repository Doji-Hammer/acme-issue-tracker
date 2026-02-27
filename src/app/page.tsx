import { listIssues } from '@/lib/issues';
import { revalidatePath } from 'next/cache';

async function createIssueAction(formData: FormData) {
  'use server';

  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();

  if (!title || !description) {
    return;
  }

  await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/api/issues`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title, description, status: 'open' }),
    cache: 'no-store',
  });

  revalidatePath('/');
}

async function closeIssueAction(formData: FormData) {
  'use server';
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) return;

  await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/api/issues/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'closed' }),
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
        <button type="submit">Create Issue</button>
      </form>

      <ul>
        {issues.map((issue) => (
          <li key={issue.id}>
            <strong>{issue.title}</strong>
            <p>{issue.description}</p>
            <p>Status: {issue.status}</p>
            {issue.status === 'open' && (
              <form action={closeIssueAction}>
                <input type="hidden" name="id" value={issue.id} />
                <button type="submit">Close</button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
