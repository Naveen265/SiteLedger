# SiteLedger

A construction operations platform for Indian contractors running five to twenty
concurrent sites. It replaces the WhatsApp plus Excel plus paper workflow with a
single operational source of truth.

It is **not** an accounting system, not an ERP, and not statutory payroll.

**The core loop:** plan (tasks, materials, labour, equipment) leads to execute
(the site team does the work) leads to capture (daily report, attendance,
materials issued, equipment moved, issues raised) leads to control (project
managers and owners see progress, delays, spend, idle equipment) leads to act
(assign, approve, resolve, order, redeploy).

---

## Stack

| Layer | Choice |
| --- | --- |
| Framework | React 19, Vite 8, TypeScript strict |
| State | Context API for identity, tenant, project, language and messages |
| Server state | TanStack Query |
| Routing | React Router 7, route level code splitting |
| Backend | Supabase (Postgres, Auth, Storage, Row Level Security) |
| Styling | Tailwind CSS v4, design tokens as CSS variables |
| Icons | lucide-react, the only source of iconography |
| Charts | Recharts, every chart wrapped in `ChartCard` |
| Forms | react-hook-form with zod resolvers |
| Dates | date-fns |
| Tests | Vitest |
| Hosting | Vercel, with one serverless function as the credential proxy |

---

## Repository layout

```
api/
  supabase/     the credential proxy: the only route to the database
src/
  app/          router, providers, guards, error boundary
  config/       env, constants, routes, navigation
  contexts/     Auth, Company, Project, I18n, Toast
  components/
    ui/         Button, Input, Select, Card, Dialog, StatusChip, Skeleton, ...
    patterns/   DataTable, PageHeader, EmptyState, ErrorState, InfoTip, ...
    charts/     ChartCard, registry, theme
    layout/     OfficeShell, SiteShell, ProjectSwitcher, Logo
    skeletons/  shaped loading placeholders
  lib/
    supabase/   client, error mapping
    auth/       provider adapter, permissions
    storage/    provider adapter, image compression
    calc/       every derived number, as pure functions, unit tested
    format/     currency, date, number
    validation/ one zod schema per entity
    query/      query client, query keys
    utils/      cn, collections, csv, id
  hooks/        useTableState, useMediaQuery, useOnlineStatus, ...
  i18n/         en.json, ta.json, hi.json
  types/        enums, domain types
  modules/      one folder per module, each with api/ hooks/ components/ pages/
supabase/
  migrations/   numbered SQL: schema, functions, RLS, storage
  seed/         demo data
```

**The rule that keeps this honest:** every derived number is a pure function in
`src/lib/calc`, with a unit test, and the info tooltip text for that number
lives beside it in the message files. No progress percentage, wage total,
utilisation figure or spend rollup is ever computed inline in a component.

---

## Local setup

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase values
npm run dev
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server on http://localhost:5173 |
| `npm run build` | Typecheck then production build |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | TypeScript, zero errors expected |
| `npm run lint` | ESLint |
| `npm test` | Unit tests for the calculation layer and the chart registry |

---

## Database setup

Run the migrations in order, in the Supabase SQL editor:

1. `supabase/migrations/0001_schema.sql` — tables, enums, indexes, triggers
2. `supabase/migrations/0002_audit_and_functions.sql` — audit trail, tenancy
   helpers, and the transactional functions the client calls
3. `supabase/migrations/0003_rls.sql` — Row Level Security on every table
4. `supabase/migrations/0004_storage.sql` — private buckets and their policies

Then, after you have signed up in the app:

5. `supabase/seed/seed.sql` — creates the `seed_demo_data()` function
6. Run `select seed_demo_data();` to fill your company with realistic demo data

---

## Roles

Five roles, no more.

| Role | Key | Lands on |
| --- | --- | --- |
| Owner or director | `owner` | My company |
| Project manager | `pm` | My projects |
| Site team | `site` | My site, mobile first |
| Procurement or store | `procurement` | Procurement desk |
| Accounts or admin | `accounts` | Approvals and spend |

The site role carries a sub-permission, `site_level`, which is either `engineer`
or `supervisor`. An engineer can submit the daily report, create material
requests and verify tasks. A supervisor can mark attendance, update tasks,
report issues and flag material needs. Same screens, different affordances.
There are not two site roles.

Permission checks live in one file, `src/lib/auth/permissions.ts`, exposing
`can(user, action)`. Every guarded control calls it, and Row Level Security
enforces the same rules a second time at the database. The client is never
trusted alone.

---

## Credentials

**No Supabase credential reaches the browser.** The project URL and the anon key
live only in server-side environment variables — note they carry no `VITE_`
prefix, which is precisely what keeps them out of the bundle, since Vite only
inlines `VITE_` prefixed values.

The browser talks exclusively to `/api/supabase/*` on its own origin. The
function at `api/supabase/[...path].ts` attaches the real URL and key and
forwards the request; in development, `vite.config.ts` reproduces the same
behaviour so the two environments match.

The signed-in user's own JWT passes straight through, so Row Level Security
still scopes every query to that person.

**Be clear about what this does and does not buy.** Row Level Security remains
the security boundary. The proxy endpoint is reachable without a key, exactly as
the anon key would have been, so the policies in `0003_rls.sql` are still doing
the real work. What the proxy genuinely provides:

- nothing sensitive in the bundle, the source maps or the page source
- credentials rotatable in Vercel without a rebuild
- a single choke point that can later be rate limited or firewalled
- an explicit allowlist, so only `rest/v1`, `auth/v1` and `storage/v1` are
  reachable at all

The cost is one function invocation per database call and a few milliseconds of
extra latency, which is why the function is pinned to Mumbai (`bom1`) to sit
beside a Supabase project in `ap-south-1`.

## Photo storage

Photos go to Supabase Storage, which is free at the tier this product starts on.
Buckets are private and images render through short lived signed URLs, so a site
photo is never readable outside the company. Every object path begins with the
company id, which is what lets one policy isolate every tenant.

Images are compressed in the browser before upload: longest edge 1600px, JPEG
quality 0.7, target under 300 KB per photo.

Moving to S3 or Azure Blob later means adding one file under
`src/lib/storage/providers/` and changing `VITE_STORAGE_PROVIDER`. No screen, no
module and no query changes.

---

## Deploying to Vercel

The app is a static single page build with `vercel.json` already configured for
client side routing, asset caching and security headers.

1. Push this repository to GitHub
2. Import it on Vercel; the Vite preset is detected automatically
3. Add the environment variables from `.env.example` in project settings.
   `SUPABASE_URL` and `SUPABASE_ANON_KEY` are **server only** and must not be
   given a `VITE_` prefix, or they will end up in the bundle
4. Add your subdomain under **Settings, Domains**

---

## What is deliberately out of scope

Accounting or general ledger, statutory payroll including provident fund,
employee state insurance and tax, customer relationship management, estimation
or bill of quantities authoring, artificial intelligence planning, building
information modelling, Gantt charts or a scheduling engine, a client portal, a
supplier marketplace, financial forecasting, contract management workflows,
equipment telematics, GPS, fuel logging, preventive maintenance scheduling,
depreciation, fleet routing, human resources, marketing tools, and any chat
feature intended to replace WhatsApp.

None of these have a menu entry, a settings toggle or a stub route.
