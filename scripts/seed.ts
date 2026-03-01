import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { issues } from '../src/db/schema';

const dbFile = process.env.DATABASE_URL ?? './drizzle/local.sqlite';
const sqlite = new Database(dbFile);

// Ensure table exists
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    priority TEXT NOT NULL DEFAULT 'medium',
    created_at INTEGER NOT NULL
  )
`);

const db = drizzle(sqlite);

const seedIssues = [
  { title: 'Set up CI/CD pipeline', description: 'Configure GitHub Actions for automated testing and deployment', status: 'done' as const, priority: 'high' as const },
  { title: 'Design landing page', description: 'Create wireframes and mockups for the new landing page', status: 'in_progress' as const, priority: 'high' as const },
  { title: 'Fix login timeout bug', description: 'Users report being logged out after 5 minutes of inactivity', status: 'in_progress' as const, priority: 'high' as const },
  { title: 'Add dark mode support', description: 'Implement theme toggle with system preference detection', status: 'open' as const, priority: 'medium' as const },
  { title: 'Write API documentation', description: 'Document all REST endpoints with request/response examples', status: 'open' as const, priority: 'medium' as const },
  { title: 'Upgrade dependencies', description: 'Update all npm packages to latest compatible versions', status: 'open' as const, priority: 'low' as const },
  { title: 'Add email notifications', description: 'Send email when issue status changes', status: 'open' as const, priority: 'medium' as const },
  { title: 'Performance audit', description: 'Run Lighthouse and fix performance bottlenecks', status: 'done' as const, priority: 'medium' as const },
  { title: 'Database backup strategy', description: 'Implement automated daily backups with retention policy', status: 'open' as const, priority: 'high' as const },
  { title: 'Refactor error handling', description: 'Standardize error responses across all API routes', status: 'open' as const, priority: 'low' as const },
];

async function seed() {
  console.log('🌱 Seeding database...');
  for (const issue of seedIssues) {
    await db.insert(issues).values(issue);
  }
  console.log(`✅ Seeded ${seedIssues.length} issues`);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
