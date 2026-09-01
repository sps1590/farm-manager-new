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

Open http://localhost:3000 — register your own farm at `/register`, or use
the default seeded login `owner` / `farm1234`. Needs a `DATABASE_URL` env
var pointing at a Postgres database — see PROGRESS.md.

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + Postgres (Neon)
via `@neondatabase/serverless` (no Prisma). Multi-tenant: any number of
farms/companies can register on the same deployment. See PROGRESS.md for
why, and for the full feature/roadmap breakdown.
