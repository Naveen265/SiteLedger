# Technical decisions

Every non-obvious choice, and why it was made.

---

## React and Vite rather than Next.js

The original build specification named Next.js 15 with the App Router. The
project owner specified React with Vite and the Context API instead, so that is
what is built.

**What this changes:** there are no Server Components and no server actions, so
every business rule that Next.js would have enforced in a server action is
enforced in Postgres instead, through Row Level Security and through the two
`security definer` functions that write multi-table transactions. This is
arguably a stronger position: the rules sit at the database, where a direct API
call cannot go around them, rather than in a server action that only guards one
path.

**What is lost:** server rendered first paint. Mitigated with route level code
splitting so the site shell is 25 KB gzipped and never downloads the charting
library, which a site engineer would never use.

## Context API for client state, TanStack Query for server state

They solve different problems and are not alternatives. Context holds identity,
tenant, selected project, language and transient messages. TanStack Query holds
everything that came from Postgres, with its cache, invalidation and loading
states. Putting server data in Context would mean hand-writing cache
invalidation in every mutation.

## Own component primitives rather than shadcn and Radix

The specification named shadcn with Radix primitives. shadcn is a Next.js
oriented CLI that copies components into the repository; in a Vite project it
adds a dependency and a build step for components this product then restyles
entirely to its own tokens.

The primitives here are hand built against the design tokens, with the
accessibility behaviour written explicitly: focus trapping and restoration in
`Dialog`, arrow key navigation in `Tabs`, `aria-label` on every icon-only
button, a real `<label>` on every field, and a 44px minimum touch target on the
site shell. This is roughly 600 lines rather than a dependency, and nothing in
the tree is unused.

## Stock on hand is a view, never a column

`v_stock_on_hand` sums `stock_movements`. A stored balance drifts the moment
someone corrects a goods receipt, and correctability is a stated differentiator.
The one correct way to keep stock consistent with its corrections is to derive
it every time.

## Idle days and utilisation are derived from the movement log

Same reasoning. `asset_movements` is the source of truth; the `status` and
`current_project_id` columns on `assets` are a denormalised convenience for list
screens, and are always written in the same operation as the movement.

## Money is integer paise, quantities are numeric

Floating point money produces rounding errors that surface as a wage figure a
worker disputes. Storage is `bigint` paise, formatting happens once, at the
edge, in `lib/format/currency.ts`.

## Attendance carries a day fraction, not a status enum

`day_value` is 1, 0.5 or 0. This makes the wage calculation a single
multiplication rather than a switch, and it makes half day handling impossible
to get inconsistently wrong across the wage summary, the labour cost chart and
the headcount trend.

Note that a half day counts as 0.5 for wages and as **one person** for
headcount, because those two figures answer different questions. Both are stated
in the info tooltip for each.

## The auth provider is behind an adapter

The product is designed for phone plus OTP, because site staff do not reliably
have email. Supabase phone auth needs a paid SMS provider and does not work on
the free tier.

Both providers are fully implemented in `src/lib/auth/providers/`. Email and
password ships enabled; phone and OTP is selected by setting
`VITE_AUTH_PHONE_ENABLED=true`. Turning on SMS later is a configuration change,
not a rewrite.

## Storage is behind an adapter

Photos go to Supabase Storage today because it is free at the starting tier.
`src/lib/storage/types.ts` defines the contract; adding an S3 or Azure Blob
provider is one new file plus an environment variable. Nothing outside
`src/lib/storage` knows which provider is in use.

## Two multi-table writes are database functions, not client sequences

`submit_dpr` and `record_goods_receipt` each touch four or more tables. Doing
that as a sequence of client calls means a dropped connection can leave a report
without its task progress, or a receipt without its stock movements.

Both run as one Postgres transaction. `submit_dpr` upserts on
`(project_id, report_date, submitted_by)`, so a replayed offline submission
updates rather than duplicating.

## The audit trigger is attached to six tables, not all of them

`attendance`, `goods_receipt_items`, `stock_movements`, `asset_movements`,
`wage_advances` and `expenses`. These are the tables where corrections matter
and where the incumbent product's users complain that records cannot be edited.
Auditing every table would triple write volume for no product value.

## Delete is denied everywhere

Projects are archived, workers are deactivated, issues are closed. Nothing is
hard deleted, so history and cost stay intact and a mistaken click is never
destructive.

## The chart registry is enforced by a test

`src/components/charts/registry.ts` lists every chart with its explain entry.
`registry.test.ts` asserts each one has a title, a body containing all three
required parts, and a Tamil and Hindi translation. A chart therefore cannot ship
without its explanation; the rule is enforced rather than intended.

## The notification rules are code with tests, not a policy document

`src/modules/notifications/notificationRules.ts` implements the six anti-spam
rules and `notificationRules.test.ts` covers each one.

One rule was changed during implementation. The original reading of "notify only
people who own or must act on the item" would have dropped a critical
escalation before it reached the project manager or owner, who are exactly the
people escalation exists to reach. Critical and high priority events are now an
explicit exception to that rule, which is what the escalation requirement
actually asks for. The test that caught this is
`pushes a critical event in real time`.

## Colour is never the only signal

`StatusChip` always pairs a colour with a text label. Colour alone fails for
colour blind users and it fails in direct sunlight, which is where half of this
product is used.

## Zod schemas contain no `.transform()`

A transform makes a schema's input and output types diverge, which breaks
react-hook-form's typing and produces unreadable generic errors. Empty strings
become `null` in the api layer instead, in the function that builds the database
row, via the shared `nullIfEmpty` helper. Normalisation happens once, where the
row shape is known.

## Route level code splitting, office screens only

The auth screens and the site shell load eagerly, because they are the first
paint for the people who use them. Every office screen is lazy. The result is a
100 KB entry chunk, 25 KB gzipped, and the 403 KB charting bundle never reaches
a site engineer's phone.

## The fourteen remaining lint warnings, justified

All fourteen are `react-refresh/only-export-components`, on the five context
files, the two barrel files that re-export both a component and its hook, and
`InfoTip.tsx`, which exports both `InfoTip` and the `Explain` convenience
wrapper alongside them.

The rule warns that Vite's fast refresh cannot hot-reload a module that exports
both a component and a non-component. It is a development ergonomics hint, not a
correctness or a production concern: nothing about the built output changes.

The alternative is splitting every context into `XContext.tsx` and
`useX.ts`, which doubles the file count across the whole state layer so that
editing a provider reloads slightly faster in development. Colocating a provider
with the hook that reads it is the clearer structure, so the warnings stand.

There are zero lint **errors** and zero TypeScript errors.

## Derived state is computed, never copied into state by an effect

Four screens originally seeded a form from props with `useEffect` plus
`setState`: the daily report sliders, the attendance sheet, the goods receipt
quantities and the asset form. Every one of those is a cascading render, and
each was a stale-data bug waiting to happen when the underlying query refetched.

The pattern used instead: hold **only what the user actually edited** as state,
derive everything else during render, and merge the two. Where a screen needs a
hard reset — switching the attendance date — the date is passed as a React
`key`, which is the framework's own mechanism for exactly this.

`useMediaQuery` is written with `useSyncExternalStore` for the same reason. A
media query is an external store, and that hook reads it during render rather
than synchronising it into state after mount.
