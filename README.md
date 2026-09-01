# Farm Manager

Multi-species farm management app (ducks, chickens, pigeons/quail, fish,
vegetables, cows): stock/batches, purchases, sales, medical & vaccination
records, and a live dashboard — bilingual (Bengali/English).

**Start here: [PROGRESS.md](./PROGRESS.md)** — decisions made, what's
built, what's not, and how to resume development.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000 — default login `owner` / `farm1234` (change
after first sign-in). Requires Node.js 22.5+ (uses the built-in
`node:sqlite` module).

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + SQLite via
`node:sqlite` (no Prisma, no external database server). See PROGRESS.md
for why, and for the full feature/roadmap breakdown.
