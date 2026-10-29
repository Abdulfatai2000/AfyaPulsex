# Live public-alert pipeline

The existing HealthEvent, AggregatedSignal, EarlyWarning and PublicAlert models are reused. No authentication or map code is changed.

## Live workflow

Select **Live** in the Officer portal. The warnings list computes fixed UTC, adjacent equal-length reporting windows (7, 14 or 30 days). Increased report volume creates a watch-level warning requiring review, not a disease-specific diagnosis or outbreak determination. The privacy threshold is not used as an epidemiological trigger.

Open a warning, select **Generate AI Draft**, review/edit in the existing Public Alert form, save, then select **Publish reviewed alert**. Generation always saves `draft`; publication is a separate action with an optimistic revision check. The issuing organization, publishing Officer, geography and timestamps are persisted in the existing PublicAlert. Web publication makes the alert eligible for the Citizen feed. SMS/push/USSD delivery workers are outside this change; selecting a channel does not claim delivery.

Required existing Officer capability mechanism:

- `warnings:read`: view detected patterns.
- `signals:read`: explicit signal read/compute actions.
- `public-alerts:write`: generate/create/edit drafts.
- `public-alerts:publish`: publish a reviewed saved revision.

Publishing also requires an active assigned Organization. No real accounts are granted new capabilities by this change. Every read/write uses the authenticated approved Officer's database-derived jurisdiction scope.

## Privacy and AI boundary

`COMMUNITY_CONSENT_VERSION` and `MIN_AGGREGATE_GROUP_SIZE` retain their existing server configuration; no production defaults are invented. Missing/invalid configuration closes disclosure with `INSUFFICIENT_AGGREGATED_DATA`. Both current and baseline buckets require at least the configured number of distinct consenting Citizens after geography/time filters. A later refusal, revocation, expiry or policy mismatch supersedes an earlier grant. Simulations are excluded. Current consent is rechecked when a stored warning is read, before/after generation, and before publication.

Only the following strict DTO is sent to Groq: `state`, `lga`, `periodStart`, `periodEnd`, `metric: symptom_volume`, `reportCount`, `baselineCount`, and fixed cautious `trendSummary`. Raw symptoms/free text, names, IDs, addresses and individual histories never enter the prompt. State aggregation follows the stored event jurisdiction hierarchy.

The server-only Groq wrapper uses `GROQ_API_KEY`, optional `GROQ_MODEL` (default `openai/gpt-oss-20b`), a 20-second timeout and no automatic retries. JSON mode plus strict Zod validation allows only bounded plain-text `title` and `body`. HTML, control characters, extra fields, numeric claims and specified unsafe medical/outbreak language are rejected. This lexical backstop is not a clinical safety guarantee; Officer review remains mandatory. Provider errors are sanitized and never logged with request/credential contents. No fallback fake draft or automatic publication exists.

The Citizen feed filters published, non-simulated, web-channel, non-future alerts in MongoDB before pagination, scopes to the Citizen's jurisdiction and ancestors (national only if no location), and explicitly projects public-safe fields. Empty/error/loading states use the existing UI. Demo fixtures remain available separately, without a production feed dependency.

## Verification

Run the opt-in isolated integration test in PowerShell:

```powershell
$env:ALERT_PIPELINE_TEST='1'
node --import tsx scripts/test-alert-pipeline.mjs
```

Requires Node with `module.registerHooks`, MongoDB permissions to create/drop a uniquely named test database, and a working Groq key. The script loads `.env.local` without printing secrets, redirects its own connection to a temporary `afyapulse_alert_test_*` database, uses test-only consent/threshold settings, and cleans up only that database. Real Auth.js credential sessions and real server actions verify authorization. The test captures and checks the actual outbound Groq DTO, verifies the draft/review/publication/Citizen feed sequence, and tests failure/suppression cases. No application database account or published alert is changed.

Required repository checks: `npm run typecheck`, `npm run lint`, `npm run build`. Existing conflict markers in `server/actions/officer/access-requests/index.ts` block full typecheck/build; unrelated map/profile lint errors and nested `.kilo` worktree lint failures also exist. Changed-file semantic TypeScript and ESLint checks are separate, not substitutes for a passing repository build. Browser workflow verification must follow resolution of the existing compile blockers.

## Changed files

- `.env.example`
- `app/(citizen)/alerts/AlertsPage.tsx`
- `components/officer/public-alerts/PublicAlertCenterClient.tsx`
- `components/officer/public-alerts/PublicAlertDetailClient.tsx`
- `components/officer/public-alerts/PublicAlertForm.tsx`
- `components/officer/warnings/WarningDetailClient.tsx`
- `components/officer/warnings/WarningsCenterClient.tsx`
- `lib/services/officer/live-adapters.ts`
- `lib/services/officer/warnings.ts`
- `server/actions/citizen/alerts.ts`
- `server/actions/officer/public-alerts.ts`
- `server/actions/officer/signals.ts`
- `server/models/PublicAlert.ts`
- `server/services/ai-insights.ts`
- `server/services/public-alerts.ts`
- `server/services/signals.ts`
- `server/services/warnings.ts`
- `scripts/test-alert-pipeline.mjs`
- `docs/public-alert-pipeline.md`
