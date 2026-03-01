'use client';

import { useState } from 'react';

export default function StatusButton({
  issueId,
  targetStatus,
  label,
  onUpdated,
}: {
  issueId: number;
  targetStatus: string;
  label: string;
  onUpdated?: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleClick() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/issues/${issueId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? `Request failed (${res.status})`);
        return;
      }

      onUpdated?.();
    } catch {
      setError('Network error — please try again');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button type="button" onClick={handleClick} disabled={submitting}>
        {submitting ? '…' : label}
      </button>
      {error && <p role="alert" style={{ color: '#ef4444', fontSize: '0.85em', margin: '2px 0 0' }}>{error}</p>}
    </>
  );
}
