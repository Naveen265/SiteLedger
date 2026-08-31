# Calculations

Every derived number in SiteLedger, where it lives, and how it is produced.

Every entry here has a matching `explain.*` entry in the message files, in
English, Tamil and Hindi, which is what the info icon beside the number shows.
If a function here changes, its tooltip changes in the same commit.

All functions are pure, live under `src/lib/calc/`, and are unit tested.

---

## Labour — `lib/calc/labour.ts`

### Wages payable
`(daily rate x day value) + (overtime hours x daily rate / 8) - advances`

Day value is 1 for present, 0.5 for half day, 0 for absent. Overtime is paid at
the daily rate divided by eight, per hour. Advances recorded in the period are
subtracted.

**Excluded:** provident fund, employee state insurance and tax. SiteLedger
calculates wages payable; it is not statutory payroll, and the interface says so
on the wage summary.

### Labour cost incurred
`base + overtime`, summed across wage lines.

Advances are **not** subtracted here. Cost incurred is not the same as cash
still to hand over, so the labour cost chart and the payable column deliberately
differ.

### Headcount
Count of workers with a day value above zero.

A half day counts as **one person**, not half, because this figure answers how
many people were on site. The money view is the labour cost chart.

---

## Work — `lib/calc/tasks.ts`

### Project progress
Average of the progress percentage of every task in the project that is not
cancelled, weighted equally. A task at 40 percent contributes 40. A completed or
verified task counts as 100 regardless of its slider position.

### Overdue
Derived, never stored: a task past its due date whose status is not completed,
verified or cancelled.

Overdue is not a status. A task can correctly be both in progress and overdue,
which is why it is a separate chip rather than a status value.

### Verification permission
A project manager, an owner, or a site user whose `site_level` is `engineer`.
Enforced in `permissions.ts`, in the `tasks_update` Row Level Security policy,
and in the `can_verify_task()` database function.

---

## Progress and health — `lib/calc/progress.ts`

### Planned against actual
Planned is a straight line: `(days since start / total planned days) x 100`.
Actual is the project progress recorded at the end of each day from submitted
daily reports. Days with no report carry the previous day forward, so the line
never drops to zero because nobody submitted.

### Project health
Compares actual progress against where the plan says it should be today.
A gap of 15 points or more is delayed, 5 or more is at risk, otherwise on track.

### Daily report compliance
`submitted reports / expected reports x 100`, where one report is expected per
active site per working day.

**Excluded:** Sundays, and any date before the project start date.

---

## Materials — `lib/calc/materials.ts`

### Stock on hand
`received + transfers in - issued - transfers out`, read from
`stock_movements` every time. Also available as the Postgres view
`v_stock_on_hand`.

Never a stored column. This is the only way a correction to any receipt or issue
is reflected immediately and consistently.

### Low stock
On hand is at or below the threshold set on the material item.

### Top materials consumed
Sum of issue movements per item over the period.

**Excluded:** material received but still in store. It has not been consumed.

### Purchase order line value
Net is `quantity x rate`. Tax is `net x gst percent / 100`. Gross is the sum.

### Pending quantity
`ordered quantity - sum of quantity received across every goods receipt raised
against that order`. Never negative on an over-delivery.

---

## Equipment — `lib/calc/equipment.ts`

### Days in use, days idle, days under repair
The movement log is walked, and the days in each interval between consecutive
movements are attributed to the state the asset was in after the earlier
movement.

- **In use** — allocated to a site
- **Idle** — in the yard, or at a site with no allocation
- **Under repair** — counted separately, and in neither of the other two

Never a stored counter.

### Current idle days
Days since the movement that left the asset with no site allocation. Zero while
the asset is checked out. Falls back to the creation date when there is no
movement yet.

### Idle beyond threshold
Current idle days exceeds the asset's own `idle_threshold_days`, which is set
per asset because a shuttering set and a backhoe have different tolerances.

### Rental days remaining
Calendar days between today and the rental return date. Negative means overdue.

---

## Spend — `lib/calc/spend.ts`

### Spend to date
`approved expenses + received goods value + wages payable + equipment rental and
repair costs`, grouped by category.

**Excluded:** expenses still awaiting approval, and goods ordered but not yet
delivered. Committing is not spending.

### Budget used
`spend to date / project budget x 100`.

Returns null when no budget is set on the project, and the interface then hides
the figure rather than guessing at one.

### Approval routing
An amount needs approval when it exceeds the company threshold for that kind.
Thresholds are per company data, not product constants, because every firm draws
this line in a different place.

---

## Issues — `lib/calc/issues.ts`

### Issue ageing
Open issues bucketed by days since raised: 0 to 2, 3 to 7, 8 to 14, over 14.

**Excluded:** resolved and closed issues. Ageing is about backlog.

### Escalation
An open issue at high or critical priority whose due date has passed. Escalation
notifies the project manager and the owner and raises the project risk flag.

### Open critical count
Open issues at high or critical priority. Drives the owner portfolio metric.
