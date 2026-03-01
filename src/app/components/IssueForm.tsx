'use client';

import { useState, type FormEvent } from 'react';

const MIN_TITLE_LENGTH = 3;

type FormErrors = {
  title?: string;
  description?: string;
  general?: string;
};

export default function IssueForm({ onCreated }: { onCreated?: () => void }) {
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(title: string, description: string): FormErrors {
    const errs: FormErrors = {};
    if (!title.trim()) {
      errs.title = 'Title is required';
    } else if (title.trim().length < MIN_TITLE_LENGTH) {
      errs.title = `Title must be at least ${MIN_TITLE_LENGTH} characters`;
    }
    if (!description.trim()) {
      errs.description = 'Description is required';
    }
    return errs;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    const form = e.currentTarget;
    const formData = new FormData(form);
    const title = String(formData.get('title') ?? '');
    const description = String(formData.get('description') ?? '');
    const priority = String(formData.get('priority') ?? 'medium');

    const clientErrors = validate(title, description);
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), status: 'open', priority }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setErrors({ general: data?.error ?? `Request failed (${res.status})` });
        return;
      }

      form.reset();
      setErrors({});
      onCreated?.();
    } catch {
      setErrors({ general: 'Network error — please try again' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div>
        <input name="title" placeholder="Issue title" aria-label="Issue title" />
        {errors.title && <p role="alert" style={{ color: '#ef4444', fontSize: '0.85em', margin: '2px 0 0' }}>{errors.title}</p>}
      </div>
      <div>
        <textarea name="description" placeholder="Issue description" aria-label="Issue description" />
        {errors.description && <p role="alert" style={{ color: '#ef4444', fontSize: '0.85em', margin: '2px 0 0' }}>{errors.description}</p>}
      </div>
      <select name="priority" defaultValue="medium">
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>
      <button type="submit" disabled={submitting}>
        {submitting ? 'Creating…' : 'Create Issue'}
      </button>
      {errors.general && <p role="alert" style={{ color: '#ef4444', fontSize: '0.85em', margin: '4px 0 0' }}>{errors.general}</p>}
    </form>
  );
}
