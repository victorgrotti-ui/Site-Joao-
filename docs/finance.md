# How the money is calculated

All amounts are stored as whole pence. The screens show pounds and pence in GBP.

## One cleaning job

```text
Net profit = Revenue − Employee payment − Cleaning products − Other expenses
```

Example:

```text
£250.00 revenue
− £110.00 employee payment
− £20.00 cleaning products
= £120.00 profit
```

The employee payment on the service can differ from that employee’s default rate.

A loss is allowed when the costs are higher than the revenue. Amounts entered into the system cannot be negative.

## Reimbursements are not a second expense

If John pays £20 for cleaning products:

- the £20 is a company expense
- the £20 is also owed back to John

The weekly payment then shows:

```text
Work earnings     £110.00
Reimbursement     £20.00
Total due         £130.00
```

Company profit stays £120.00. Paying John the £20 does not create another £20 expense. It settles the expense that was already recorded.

The service form does this when “Employee paid for the cleaning products” is ticked. The system writes one expense linked to that service. Reports use the expense ledger, and they do not add the service cost again.

An extra expense, such as travel, is entered on the Expenses page. If it is reimbursable it is added to the employee’s total due and counted once in company expenses.

## What the dashboard cards mean

| Card | Meaning |
| --- | --- |
| Total revenue | Sum of service revenue in the dates you chose |
| Employee payments | Work earnings only. Reimbursements are not included here |
| Total expenses | Every expense whose date falls in the period, counted once |
| Net profit | Revenue − work earnings − expenses |

Service income and work earnings use the service date. Expenses use the expense date. Costs typed on a service are given that service’s date.

## Weekly payments

A payment period is the date range you select. The usual week is Monday to Sunday. The default payment day in Settings is a reminder only.

Mark as Paid stores:

- the employee
- the period
- the work earnings
- the reimbursements
- the total
- the payment date

Each service and reimbursable expense in that total is linked to the payment, so it cannot be paid again by accident.

If a payment already exists for the same employee and the same period, the system shows:

```text
Payment already recorded for this employee for this payment period.
```

It does not create another payment unless you explicitly confirm an additional payment, and only when something is still outstanding.

After a service is included in a payment, its money, employee and date are locked. Notes and descriptive details can still be edited. Delete is refused for a service or expense that has already been paid.

## Reports

Averages are the period totals divided by the number of services. Filtering by service type, client or payment status does not pull in unrelated company overhead. Filtering by employee includes that employee’s services and their own unlinked expenses.
