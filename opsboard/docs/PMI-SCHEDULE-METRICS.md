# PMI / PMBOK Schedule & EVM Metrics

Earned value is computed on a consistent **cost basis** (BAC uses the committed cost baseline).

```
BAC = budget at completion (committed cost baseline)
PV  = planned value (BAC × time-phased fraction across the schedule baseline)
EV  = earned value (BAC × percent complete)
AC  = actual cost (Σ logged hours × cost rate)
CV  = EV − AC
SV  = EV − PV            (shown in dollars)
CPI = EV / AC
SPI = EV / PV
EAC = BAC / CPI
VAC = BAC − EAC
```

## Percent complete is stage-driven

A card's stage position drives its percent complete (first column 0% → last column 100%). Moving a card therefore changes EV across project and program reports immediately.

## Schedule changes propagate

Rescheduling a card on the **Gantt** (drag) shifts its start/finish dates (duration preserved) and expands the project schedule envelope. Because PV is time-phased across `startDate..endDate`, the move recalculates project **and program** PV, SV, SPI, EAC, and VAC, and updates the dashboard and manager report.

## Program EVM

Aggregate the portfolio, then compute indices:

```
program CPI = Σ(EV) / Σ(AC)
program SPI = Σ(EV) / Σ(PV)
program EAC = Σ(BAC) / program CPI
program VAC = Σ(BAC) − program EAC
```

Per-project CPI/SPI values are never averaged.
