# Frontend structure

Phase 1 implements the landing page, unified authentication presentation, and
responsive Citizen shell against the desktop/mobile references in
`docs/design-references/`. Other feature components remain named extension points.
No data, authentication, authorization, maps, charts, or backend submission behavior
is implemented. Existing backend stubs remain untouched.

Public/auth/Citizen styles live in `app/citizen-public.css`, imported by globals.
Landing sections live in `components/public`; the decorative hero asset and its
generation provenance live in `public/images`. Desktop Citizen navigation is a
sidebar; mobile navigation uses a safe-area-aware bottom bar. Both derive from
`components/layout/citizen/navigation.ts` and mark the active route.

`/auth` defaults to citizen sign-in; `?mode=signup` selects account creation.
`?entry=officer` selects sign-in presentation only and grants no permissions.
Officer access requests link to `/officer/access-request`. Auth forms use local
presentation state and show an unavailable notice; they do not send requests,
persist credentials, simulate sessions, or claim email delivery. `TODO(DEV4)` marks
Auth.js, verified officer access, password reset, verification/resend, remember-me,
and citizen route protection integration. Account terms/privacy notices must be
finalized before enabling registration; optional contribution remains separate.

## Routes and ownership

Route groups do not appear in URLs. Keep the existing groups; do not introduce
another page that resolves to the same URL.

| Group                   | Owner                       | URLs                                                                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(marketing)`       | Dev 1                       | `/`                                                                                                                                                                                                                                                                                                                                                                                                        |
| `app/(auth)/auth`       | Dev 1 UI, Dev 4 integration | `/auth`, `/auth/forgot-password`, `/auth/verify-email`                                                                                                                                                                                                                                                                                                                                                     |
| `app/(citizen)`         | Dev 1                       | `/onboarding`, `/dashboard`, `/report`, `/vitals`, `/my-health`, `/alerts`, `/profile`                                                                                                                                                                                                                                                                                                                     |
| `app/(officer)/officer` | Dev 2                       | `/officer/access-request`, `/officer/verification`, `/officer/overview`, `/officer/map`, `/officer/warnings`, `/officer/warnings/[id]`, `/officer/explorer`, `/officer/investigations`, `/officer/investigations/[id]`, `/officer/analytics`, `/officer/response`, `/officer/public-alerts`, `/officer/reports`, `/officer/notifications`, `/officer/approvals`, `/officer/simulation`, `/officer/profile` |
| Existing officer routes | Dev 2                       | `/officer/status`, `/officer/settings` are preserved; coordinate any future consolidation with verification/profile.                                                                                                                                                                                                                                                                                       |
| Existing API            | Dev 4                       | `/api/auth/[...nextauth]` is unchanged.                                                                                                                                                                                                                                                                                                                                                                    |

Each UI group has loading/error boundaries. The root not-found page is shared.
Access-request and verification are UI placeholders; Dev 4 must account for
unauthenticated and pending officers before adding guards to the officer layout.
Layouts currently enforce no access rules.

## Components

- `components/ui`: existing shadcn/Base UI primitives; reuse before adding wrappers.
- `components/shared`: existing PageHeader/EmptyState plus AppLogo, SectionHeader,
  StatusBadge, MetricCard, and a shared FeaturePlaceholder.
- `components/public/auth`: citizen sign-in/account creation, officer entry,
  reset/verification presentation, and the shared AuthFrame/AuthField. Submission
  controls show an explicit unavailable state until Dev 4 supplies real behavior.
- `components/citizen`: dashboard, report, onboarding, vitals, my-health, alerts,
  profile. Each requested component has its own PascalCase file and named export.
- `components/officer`: access-request, verification, overview, map, warnings,
  explorer, investigations, analytics, response, public-alerts, reports,
  notifications, approvals, simulation, profile.
- `components/layout/citizen`: CitizenShell, desktop/mobile navigation and links.
- `components/layout/officer`: OfficerShell, sidebar/mobile navigation and links.
  Profile is separate at the sidebar bottom. Mobile More exposes remaining links.
- `components/layout/ResponsiveContainer`: shared width/padding shell.
- `components/forms`: SearchInput, FilterBar, FilterSheet shells.
- `components/feedback`: PageState and named loading, error, success,
  unauthorized, forbidden, privacy-suppressed, pending-verification and
  session-expired states; ConfirmDialog composes existing dialog primitives.
  EmptyState stays in shared to avoid duplication.
- `components/charts`, `components/maps`: shared placeholders only. Future
  browser-only Leaflet loading belongs behind a client component; no Leaflet
  initialization, chart engine, coordinates, or fake statistics are supplied.

Feature components are intentionally not all mounted on existing pages. Compose
them as each screen is implemented; placeholder text is not a finished UX.
Onboarding has five step components under one route. My Health has timeline,
trends, and insights extension points. Profile has all seven settings sections.
Report has multi-symptom/category selection, conditional body map, severity,
timing/duration, recurrence, trigger, notes, optional measurement, review,
submission, and success extension points. No wizard state machine is supplied.

## Shared contracts and integration

`types/index.ts` remains the shared enum/context source. `types/frontend.ts`
contains presentation-only navigation and page-state types, not database DTOs.
Do not import Mongoose model types into client components. Agree on serialized
DTOs with Dev 3/4 before adding domain fields: IDs as strings and dates in an
agreed serialized format. Existing model enums should not be redefined casually.

There is no existing browser service convention. Do not add fetch clients,
invent endpoint URLs, or call throwing backend stubs just to render placeholders.
The existing `server/services` remains the integration destination through future
authorized Server Actions/Route Handlers. No new frontend service layer is needed
for this scaffold.

- `TODO(DEV1)` / `TODO(DEV2)`: build the corresponding UI.
- `TODO(DEV3)`: align DTOs and wire MongoDB-backed data via a server boundary.
- `TODO(DEV4)`: authentication, authorization, consent, jurisdiction restrictions,
  privacy suppression, early-warning detection, AI, and security enforcement.

Navigation visibility is not authorization. Approvals has an explicit permission
filtering TODO; Dev 4 must also enforce permissions at every server entry point.
Feedback states render presentation only and must never imply real approval,
consent, successful writes, or a valid session without a server result.

## Coordination boundaries

Dev 1 owns citizen/public routes and components, including consent UI, and
`components/layout/citizen`. Dev 2 owns officer routes/components and
`components/layout/officer`. Both coordinate changes to root layout/styles,
shared layout helpers, UI primitives, shared/feedback/forms/charts/maps,
`types/frontend.ts`, package/config files, and this document.

Do not change `server/db`, `server/models`, `server/services`, `server/auth`,
`server/validation`, `app/api`, `types/index.ts`, environment configuration, or
security/deployment settings without coordinating with Dev 3/4. The existing
pure `server/lib/utils.ts` class-name helper is already used by shared UI;
that convention is preserved and does not permit importing backend services.

Preserve the existing AfyaPulse CSS tokens and Inter font. Shells use mobile-first
spacing, shrinking content, and separate desktop/mobile navigation. Check at
320px, 375-480px, tablet, laptop, and 1440px+ as real content is introduced.

## Recommended coding order

1. Dev 1: start with `app/(citizen)/onboarding/page.tsx` and
   `components/citizen/onboarding/*`; compose the five UI steps and agree on
   consent wording/contracts with Dev 4. Do not wire auth/data yet.
2. Dev 2: start with `app/(officer)/officer/access-request/page.tsx`,
   `components/officer/access-request/AccessRequestForm.tsx`, and verification
   components; agree on the officer enrollment contract with Dev 3/4.
3. Coordinate navigation and shared feedback primitives; implement public/auth UI.
4. Dev 1: dashboard, report, vitals, My Health, alerts, profile.
5. Dev 2: overview, map, warnings/details, explorer, investigations/details,
   analytics, response, public alerts, reports, notifications, approvals,
   simulation, profile.
6. Agree on DTOs and secure server boundaries with Dev 3/4, then integrate data.
7. Validate each screen's states, accessibility, and responsive behavior.

Known integration gaps: the existing health-event schema does not yet cover all
planned recurrence/trigger/body-map inputs, and the existing access-request
schema describes data access rather than a complete officer enrollment form.
These are coordination items, not permission to change backend schemas here.
