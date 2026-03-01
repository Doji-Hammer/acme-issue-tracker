'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

export default function IssueFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const status = searchParams.get('status') ?? '';
  const search = searchParams.get('search') ?? '';

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/?${params.toString()}`);
    },
    [router, searchParams],
  );

  return (
    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
      <select value={status} onChange={(e) => update('status', e.target.value)}>
        <option value="">All statuses</option>
        <option value="open">Open</option>
        <option value="closed">Closed</option>
      </select>
      <input
        type="text"
        placeholder="Search by title…"
        defaultValue={search}
        onChange={(e) => update('search', e.target.value)}
      />
    </div>
  );
}
