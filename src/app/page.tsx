'use client';

import { useCallback, useEffect, useState } from 'react';
import IssueForm from './components/IssueForm';
import StatusButton from './components/StatusButton';
import type { IssueStatus, IssuePriority } from '@/db/schema';

type Issue = {
  id: number;
  title: string;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;
  createdAt: number;
};

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

export default function HomePage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [refreshKey, setRefreshKey] = useState(0);

  const fetchIssues = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    const qs = params.toString();
    const res = await fetch(`/api/issues${qs ? `?${qs}` : ''}`);
    if (res.ok) {
      return res.json() as Promise<Issue[]>;
    }
    return null;
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    let cancelled = false;
    fetchIssues().then((data) => {
      if (!cancelled && data) setIssues(data);
    });
    return () => { cancelled = true; };
  }, [fetchIssues, refreshKey]);

  return (
    <main>
      <h1>ACME Issue Tracker</h1>

      <IssueForm onCreated={() => setRefreshKey((k) => k + 1)} />

      <div style={{ margin: '16px 0', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>
        <input
          type="search"
          placeholder="Search by title…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search issues"
        />
      </div>

      <ul>
        {issues.map((issue) => (
          <li key={issue.id}>
            <strong>{issue.title}</strong>
            <span> {priorityLabels[issue.priority]}</span>
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
              <StatusButton
                issueId={issue.id}
                targetStatus="in_progress"
                label="Start Progress"
                onUpdated={() => setRefreshKey((k) => k + 1)}
              />
            )}
            {issue.status === 'in_progress' && (
              <StatusButton
                issueId={issue.id}
                targetStatus="done"
                label="Mark Done"
                onUpdated={() => setRefreshKey((k) => k + 1)}
              />
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
