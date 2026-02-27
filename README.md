# ACME Issue Tracker (MVP)

Minimal Next.js + TypeScript issue tracker with SQLite persistence via Drizzle.

## Requirements

- Node.js 22+
- npm 10+

## Setup

```bash
npm install
```

## Run locally

```bash
npm run dev
```

App: http://localhost:3000

## Test

```bash
npm test
```

This is CI-ready and runs Vitest in non-watch mode.

## Lint / Format

```bash
npm run lint
npm run format:check
```

## API

- `GET /api/issues` - list issues
- `POST /api/issues` - create issue `{ title, description, status? }`
- `PATCH /api/issues/:id` - update status `{ status: "open" | "closed" }`
- `DELETE /api/issues/:id` - delete issue

## Notes

- SQLite DB file defaults to `./drizzle/local.sqlite`
- Table auto-creates at runtime for MVP simplicity
