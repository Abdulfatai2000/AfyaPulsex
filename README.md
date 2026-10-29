# AfyaPulse

Real-time community health intelligence — symptom signals from citizens in, coordinated early warnings and public health response out.

## Tech stack

| Layer            | Choice                             | Notes                                             |
| ---------------- | ---------------------------------- | ------------------------------------------------- |
| Framework        | Next.js 16 (App Router, Turbopack) | Monorepo-free: frontend + backend APIs in one app |
| Language         | TypeScript 5 (strict)              |                                                   |
| Styling          | Tailwind CSS v4 + shadcn/ui        | Design tokens as CSS vars in `app/globals.css`    |
| Database         | MongoDB + Mongoose 9               | Cached connection in `server/db`                  |
| Auth             | Auth.js v5 (`next-auth@beta`)      | JWT sessions, RBAC in `server/auth`               |
| Validation       | Zod 4                              | Shared schemas in `server/validation`             |
| AI               | Groq SDK                           | Server-only, `server/services/ai-insights.ts`     |
| Email (optional) | Resend                             | Alerts / notifications                            |
| Charts / Maps    | Recharts / react-leaflet           | Leaflet is client-only (dynamic import)           |
| Misc             | date-fns, eslint-config-prettier   |                                                   |

## Folder structure

Frontend routes, component extension points, ownership, and implementation order:
[Frontend structure](docs/FRONTEND_STRUCTURE.md).

- `/app` — Next.js App Router routes (UI + server actions + route handlers)
  - `(marketing)` — landing page
  - `(auth)` — unified auth shell
  - `(citizen)` — citizen app (onboarding, dashboard, report, vitals, my-health, alerts, profile)
  - `(officer)` — officer portal (access-request, status, overview, map, warnings, explorer, investigations, analytics, response, public-alerts, reports, notifications, approvals, simulation, settings)
  - `api/auth/[...nextauth]` — Auth.js handler (Dev 4)
- `/server` — ALL backend logic. Nothing here imports from `/app`; nothing in `/app` imports Mongoose directly
  - `db` — cached Mongoose connection helper
  - `models` — one Mongoose schema per file (typed stubs, Dev 3)
  - `services` — server-only business logic (Dev 1/2 call these from Server Actions / Route Handlers)
  - `auth` — Auth.js config + RBAC guards (Dev 4)
  - `validation` — shared Zod schemas (whole team; Dev 4 reviews)
  - `lib` — `cn()` helper etc.
- `/components` — `ui/` (shadcn, untouched), `shared/` (cross-cutting), `citizen/` (Dev 1), `officer/` (Dev 2)
- `/types` — shared TypeScript types mirrored from the Zod schemas, imported by `/app` and `/server`

## Developer ownership

| Lane                 | Owner | Scope                                                                               |
| -------------------- | ----- | ----------------------------------------------------------------------------------- |
| Citizen App          | Dev 1 | `(marketing)`, `(citizen)`, `components/citizen`, validation input                  |
| Officer Portal       | Dev 2 | `(officer)`, `components/officer`, validation input                                 |
| Backend / MongoDB    | Dev 3 | `server/db`, `server/models`, most of `server/services`                             |
| Auth / Security / AI | Dev 4 | `server/auth`, consent/access/signals/warnings/audit/ai services, validation review |

Codeowners live in `CODEOWNERS` (placeholder `@DEV1..@DEV4` handles — team fills in real GitHub usernames).

## Setup

```bash
git clone <repo-url> afyapulse
cd afyapulse
npm install
cp .env.example .env.local   # fill in MONGODB_URI, AUTH_SECRET, GROQ_API_KEY, RESEND_API_KEY
npm run dev
```

Useful scripts: `npm run dev`, `npm run build`, `npm run start`, `npm run lint`, `npm run format`, `npm run typecheck`.

## Branching convention

- `main` is protected — no direct pushes.
- Work happens on `feature/dev1-*`, `feature/dev2-*`, `feature/dev3-*`, or `feature/dev4-*` branches.
- Open PRs into `main` with at least one approving review from a teammate outside your lane.
