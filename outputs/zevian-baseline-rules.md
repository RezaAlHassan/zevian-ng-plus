# Zevian baseline rules for backend development

This file records the planned backend rules. The current browser prototype averages up to four available prior KPI values from the active upload. It does not yet merge stored history, resolve data conflicts, check complete periods, or calculate rates from counts. Its details show available reporting dates and source records, and keep a source snapshot with each finding.

## Connected records

- **KPI result:** employee ID, KPI definition/version, unit, period start/end, actual value, source record ID, upload ID, and revision/version. For rates, also store numerator and denominator.
- **Comparison:** current result IDs, baseline result IDs, fixed values, source labels, dates, calculation, comparison rule/version, and validation status.
- **Finding:** comparison ID, detected change, business impact, explanations, evidence for the change, confidence in the cause, manager decision, and revision links.

Historical KPI results supply the baseline. Previous findings may link to those results, but a finding must never become the baseline.

## Baseline selection

Use a consistent rule for each KPI. Weekly calls can use the average of the previous four complete weeks. Monthly revenue can use the previous complete month. Define the period calendar, required history, calculation, and minimum valid coverage for each KPI before comparison.

| Available data | Required behavior |
| --- | --- |
| Upload has dated historical results | Use results that meet the KPI rule. |
| Upload has only current results | Use suitable KPI results stored in Zevian. |
| Both sources have history | Combine valid records and remove duplicates. |
| Uploaded and stored values conflict | Resolve the conflict before comparing; do not silently prefer either value. |
| Upload has only a labelled baseline | Label it **Uploaded baseline** and state when its calculation or dates are unknown. |
| Too little suitable history | Show **Not enough history to assess change**. |

Match records by employee, KPI definition/version, unit, and period. Keep source links when removing exact duplicates. Preserve conflicts for review. A target is separate: 100 calls expected is a target; 84 calls in earlier weeks is a historical baseline.

## Validation and calculations

Both sides must use the same employee, KPI definition, unit, and comparable period lengths. Missing weeks stay missing and must not count as zero. Do not include incomplete weeks in a complete-week baseline.

For rates, use the underlying counts. A show-rate baseline is total attended divided by total scheduled across the baseline period, not an average of weekly percentages. If counts or a valid denominator are missing, explain the limit and do not present an unsupported rate baseline.

For nonzero baselines, percentage change = (current - baseline) / baseline ? 100. For a zero baseline, show the absolute change and explain that percentage change cannot be calculated.

## Display

The findings table has four columns: Finding, Employee, Priority, Action. Use a metric title such as **Meetings booked decreased**, followed by **25 ? 19 ? ?24%**. The action is **Review**. Open details by clicking the row or pressing Enter or Space when the row has keyboard focus. Show visible hover and focus states.

Keep business impact and confidence in the details. Explain separately whether the measured change is supported and whether its cause is known. A supported change does not prove its cause.

Details show value, period, calculation, and source for both sides, followed by **View source records**. Use **Current upload + stored results** when both supply the history. A short list can also show the baseline rule, for example **Previous 4 complete weeks**.

Illustrative comparison (not a production record):

| | Current | Baseline |
| --- | --- | --- |
| Value | 82 calls | 100 calls per week |
| Period | 8?14 September | 11 August?7 September |
| Calculation | Weekly total | Average of 4 weekly totals |
| Source | Current upload | Stored KPI results |

## Historical findings and corrections

Keep the original comparison fixed when an older finding is opened. New findings may use newly stored results. Corrected data must create a revised comparison and finding with a clear revision note and a link to the original. Never silently change an old finding?s percentage, dates, source, or baseline.
