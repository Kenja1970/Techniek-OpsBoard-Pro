# A/E Financial Metrics

Techniek OpsBoard Pro reports architecture/engineering (A/E) earned-multiplier financials alongside PMI/PMBOK earned value.

## Earned multiplier

```
multiplier = earned revenue / billable direct labor
```

- **billable direct labor** = Σ(logged hours × cost rate) over the project's cards (the actual cost of effort, i.e. AC).
- **earned revenue** = Σ(logged hours × bill rate) over the project's cards.

Demo projects show clean examples at **2.4×, 3.0×, 4.5×**.

## Contribution margin

Shown as a **percent**, not dollars:

```
CM% = (earned revenue − billable direct labor) / earned revenue
```

Algebraic relationship to the multiplier:

```
CM% = 1 − (1 / multiplier)
multiplier = 1 / (1 − CM%)
```

| Multiplier | CM%   |
|-----------:|------:|
| 2.4×       | 58.3% |
| 3.0×       | 66.7% |
| 4.5×       | 77.8% |

## Target contribution margin

Managers set a target in **Settings → Financial controls** (default **66.7%**, ≈ 3.0×). Per-project status color:

- **Green** — CM at or above target.
- **Yellow** — below target but within 10 percentage points.
- **Red** — more than 10 points below target.

## Budget burn (distinct)

```
budget burn = spent / project budget
```

Burn is a control ratio and is **not** the same as contribution margin or multiplier.

## Program roll-up

Program multiplier and CM aggregate the portfolio first, then divide:

```
program multiplier = Σ(earned revenue) / Σ(billable direct labor)
program CM%        = Σ(rev − labor) / Σ(rev)
```

Individual project ratios are never averaged.

## Where shown

Projects screen (Mult. / CM% columns with status color), Manager Report (project + program rows), Project Admin baseline panel, and the report CSV. The **Client Report intentionally excludes** cost, margin, rates, and multiplier.
