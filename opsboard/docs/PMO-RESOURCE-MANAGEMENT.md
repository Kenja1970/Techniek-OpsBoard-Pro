# PMO Resource Management

The **Resources** screen is a master resource register plus a roster utilization/forecast view.

## Capabilities

- Inline **edit**, **add**, and **delete** resources.
- Resource **CSV download** and **CSV upload** (upsert by name).
- 4-week utilization forecast for the active board roster.
- Board roster membership toggles per resource.

## Roles

Register administration (add / edit / delete / import) is limited to:

- Admin
- Department Manager
- Project Manager

A **Resource Manager** can view resource and financial data but cannot administer the master register. Viewers are read-only; non-financial roles do not see cost/bill rates.

## Resource types

Employee · Subcontractor · Tool / Software · Equipment · Facility · Material · Other

This lets the PMO model decisions such as using a subcontracted company instead of an employee, or a paid tool/software resource billed per use.

## Fields

ID · Name · Type · Role · Department · Company · Capacity hours · Cost rate · Bill rate · Unit · Status · Notes · Board roster membership

## CSV format

Header row (case-insensitive, order-independent):

```
Name,Type,Role,Department,Company,CapacityHrs,CostRate,BillRate,Unit,Status,Notes
```

Use **⬇ CSV** in the Resources header to export the current register as a template.
