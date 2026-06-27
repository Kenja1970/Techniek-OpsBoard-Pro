# FV / EAC History

A time-phased view comparing funding to forecast cost and revenue.

## Access

- **Projects** screen → `FV/EAC` action on a project row (financial roles).
- **Project Admin** → baseline panel → *FV / EAC history* button.

## Series

| Series | Render | Meaning |
|---|---|---|
| Funded Value | step line | Contract/funded ceiling; steps up at approved change orders |
| Target Cost Budget | step line | Funded Value × (1 − target CM%) — the cost budget implied by the margin target |
| Bill EAC | datapoints | Forecast revenue at completion = Σ(max(estimate, logged) × bill rate) |
| Cost EAC | datapoints | Forecast cost at completion = BAC / CPI |

- **T&M** projects show all four series.
- **FP** projects hide Funded Value and Bill EAC by default (toggle them on via the legend).
- Hovering a datapoint reveals the exact date, event, and value.
- A **table** below the chart exposes the dataset; the legend checkboxes select which fields appear.

## Data source

The current local-first build generates the dataset from available audit data:

- Project baseline (original funded value and end date).
- Approved change orders (funded-value steps at decision dates).
- Card estimates, assignments, and current rates (forecasts).

For production, replace this with a durable immutable audit trail from a backend project-budget system.
