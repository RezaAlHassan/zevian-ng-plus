# Zevian backend implementation

This document captures the backend behavior behind the manager workflow. The product rule is consistent across uploads, context, and findings:

> People provide raw information. Zevian structures it. Managers only handle exceptions and decisions.

## Core rules

- Performance data creates findings.
- Manager and employee context can explain, challenge, or add confidence to a finding. Context cannot create a finding by itself.
- Automated matches must carry a confidence value and an audit trail.
- High-confidence work stays out of the manager's way.
- Low-confidence work goes to review.
- No overall employee score is calculated.
- Every finding must point back to its source records.
- A finding remains a hypothesis until a manager acts, dismisses it, or adds context.

## Suggested architecture

Start with one application service and a background job queue. Split services only when scale requires it.

1. The application API accepts uploads, notes, employee context, and manager actions.
2. Object storage keeps original files unchanged.
3. PostgreSQL stores normalized records, mappings, findings, evidence, context, actions, and follow-ups.
4. A job queue handles file parsing, matching, normalization, baseline updates, finding detection, and context analysis.
5. A worker writes progress and results back to the import record.
6. The client receives progress through polling first. Server-sent events can be added later.

## Compute boundary: application logic versus AI

Calculations must be deterministic, testable, and reproducible. AI should interpret messy information. It should not calculate the performance signal.

### Use normal application logic for

- employee matching when deterministic IDs exist;
- averages and aggregations;
- personal and team baselines;
- percentage changes;
- targets;
- period comparisons;
- trend calculations;
- minimum sample checks;
- anomaly thresholds;
- finding trigger rules;
- follow-up due dates and new-period counts.

Store the formula version, input records, and result for every calculation used by a finding. The same inputs and version must return the same result.

### Use AI for

- interpreting messy manager or employee context;
- categorizing uploaded context;
- extracting people, dates, facts, and performance areas from unstructured text;
- identifying plausible relationships between context and data-based findings;
- summarizing supporting and conflicting evidence;
- explaining a finding in manager-friendly language;
- suggesting what the manager should investigate next;
- drafting a structured interpretation for manager confirmation.

### Boundary rules

- AI may explain a calculated percentage. It does not calculate or overwrite it.
- AI may suggest a relationship. It does not mark that relationship as causal.
- AI may propose an employee or metric match when deterministic matching fails. The proposal carries confidence and may require review.
- AI output must use a validated structured schema before it is stored.
- Raw model output is never written directly into a finding shown to a manager.
- Model name, prompt version, input references, and structured output must be logged.
- A model failure must not block deterministic import and calculation work. The system can finish the import and mark explanations as pending.
- Findings remain traceable without an AI-generated summary.

## Main records

### `imports`

- `id`
- `workspace_id`
- `uploaded_by`
- `source_file_key`
- `source_file_name`
- `source_type`
- `status`: `uploaded`, `parsing`, `matching`, `normalizing`, `analyzing`, `needs_review`, `ready`, `completed`, `failed`
- `progress_percent`
- `current_stage`
- `reporting_period_start`
- `reporting_period_end`
- `uploaded_at`
- `completed_at`
- `row_count`
- `employee_count`
- `metric_count`
- `error_code`
- `error_message`

### `import_mappings`

- `id`
- `workspace_id`
- `import_id`
- `mapping_type`: `employee`, `metric`, `date`, `team`
- `source_value`
- `target_id`
- `confidence`
- `status`: `automatic`, `confirmed`, `corrected`, `unresolved`
- `confirmed_by`
- `confirmed_at`
- `remember_for_future`

### `metric_observations`

- `id`
- `workspace_id`
- `employee_id`
- `metric_id`
- `period_start`
- `period_end`
- `value`
- `source_import_id`
- `source_row_reference`
- `normalized_at`

### `findings`

- `id`
- `workspace_id`
- `employee_id`
- `metric_id`
- `status`: `new`, `relevant`, `dismissed`, `monitoring`, `follow_up_due`, `resolved`
- `finding_type`
- `current_value`
- `baseline_low`
- `baseline_high`
- `change_percent`
- `periods_outside_range`
- `evidence_strength`
- `opened_at`
- `updated_at`
- `resolved_at`

### `finding_evidence`

- `id`
- `finding_id`
- `source_type`: `metric`, `qa`, `manager_context`, `employee_context`, `operational_context`
- `source_id`
- `observation`
- `relevance`: `strong`, `moderate`, `context_only`
- `created_at`

### `context_entries`

- `id`
- `workspace_id`
- `submitted_by`
- `submitted_by_role`: `manager`, `employee`
- `raw_text`
- `source_file_key`
- `status`: `processing`, `needs_confirmation`, `confirmed`, `rejected`
- `employee_id`
- `period_start`
- `period_end`
- `context_type`
- `facts_json`
- `related_metric_ids`
- `related_finding_ids`
- `confidence`
- `confirmed_by`
- `confirmed_at`
- `created_at`

### `manager_actions`

- `id`
- `finding_id`
- `manager_id`
- `note`
- `recorded_at`
- `follow_up_enabled`
- `follow_up_trigger_type`: `new_period_count`, `date`
- `follow_up_trigger_value`
- `status`: `active`, `completed`, `cancelled`

### `follow_ups`

- `id`
- `finding_id`
- `manager_action_id`
- `status`: `waiting_for_data`, `ready`, `reviewed`, `closed`
- `due_at`
- `required_new_periods`
- `new_periods_received`
- `system_observation`
- `manager_outcome`: `improved`, `no_change`, `declined`, `inconclusive`, `keep_monitoring`
- `manager_note`
- `reviewed_at`

### `upload_cadence`

- `workspace_id`
- `observed_interval_days`
- `interval_variance_days`
- `sample_count`
- `expected_next_upload_at`
- `suggested_cadence_days`
- `manager_selected_cadence_days`
- `last_prompted_at`
- `last_prompt_result`: `uploaded`, `dismissed`, `ignored`
- `updated_at`

## Upload processing

### Fast path

1. Create the `imports` record and upload the original file to object storage.
2. Return the import ID immediately.
3. Parse the file in a background worker.
4. Detect headers, date columns, employee identifiers, and metric columns.
5. Compare the file signature with prior confirmed imports from the workspace.
6. Reuse remembered mappings when the format matches.
7. Normalize valid rows into `metric_observations`.
8. Update baselines and detect meaningful changes.
9. Generate findings only from performance observations.
10. Attach traceable evidence and any relevant confirmed context.
11. Mark the import `completed`.

The manager sees:

- employees matched
- metrics recognized
- records ready
- previous format recognized, when true
- `Import data`

### Review fallback

The review screen is not part of the main demo path. It remains a backend and production fallback.

Send an item to review when:

- the top match is below the automatic-match threshold;
- two candidates have similar confidence;
- a source value conflicts with a remembered mapping;
- the same employee appears under multiple identifiers;
- a metric unit or direction is unclear;
- the reporting period cannot be inferred safely.

Suggested thresholds:

- `>= 0.92`: match automatically;
- `0.70–0.91`: show the best suggestion for confirmation;
- `< 0.70`: require a manager selection or creation of a new record.

The manager sees only unresolved items. Each row shows the source value, Zevian's suggestion, and alternatives. Confirmed corrections become workspace-specific mappings for later uploads.

If everything is high confidence, skip review entirely.

## Processing while the manager adds context

Import processing and context entry should run at the same time.

1. The upload API returns the import ID.
2. The client moves to optional context entry.
3. Background workers continue parsing, matching, normalizing, and analyzing the import.
4. Context submitted during processing is stored immediately.
5. When both the import and context analysis are ready, the finding worker links confirmed context to relevant findings.
6. If context arrives after findings are created, a small linking job rechecks open findings for that employee and period.

This avoids making the manager wait before adding information that may affect the explanation.

### Manager path after an upload

The default path is:

`Upload → Confirm import → Add or skip context → Processing → Updated dashboard`

Confirming the import starts backend processing. The context screen opens while that work continues. Confirmed context is added to the same processing run before findings are finalized. Skipping context does not delay the run.

The dashboard opens only after the current run is ready. The latest reporting period becomes the selected period. Older periods remain available through previous and next controls on the dashboard.

An upload does not delete earlier observations or findings. It replaces the default dashboard view with the newest completed reporting period while preserving prior periods for history.

## What to show during long processing

Do not show a fake percentage unless the backend can estimate it reliably. Show the current stage and let the manager leave the page.

### Under 2 seconds

Keep the button in a loading state:

`Reading file…`

### 2–10 seconds

Show a compact processing state:

**Processing your upload**

`Reading file` → `Matching data` → `Checking for changes`

Only the active stage moves. Completed stages show a simple completed state.

### More than 10 seconds

Show:

**Your upload is still processing**

You can add context or return to the team overview. Zevian will show the result when it is ready.

Actions:

- `Add context`
- `Return to overview`

The overview should show a quiet row or notice: `New data is processing`.

### Completed in the background

Show an in-app notification:

`Data imported. 2 findings need review.`

### Failed

State what happened and what to do:

**The file could not be read**

Check that the first row contains column names, then upload the CSV or XLSX again.

Keep the original failure reason in logs. Show a safe, useful message to the manager.

## Upload cadence

Do not claim that weekly uploads are proven. Treat weekly or biweekly cadence as a product hypothesis until usage shows that it improves finding quality or manager follow-through.

### What to save

For every successful import, save:

- upload timestamp;
- reporting period start and end;
- source type and file signature;
- whether the import was prompted or unprompted;
- time since the prior successful import;
- whether a cadence prompt was dismissed;
- whether the manager uploaded within 48 hours of a prompt.

### How to learn cadence

1. Wait for at least 3 successful imports.
2. Calculate the median interval between imports.
3. Ignore unusually long gaps when the workspace was inactive.
4. Measure variance. Do not infer a cadence when timing is inconsistent.
5. Prefer the manager's explicit cadence when one exists.
6. Set `expected_next_upload_at` from the last completed reporting period, not only the upload timestamp.

### How to suggest the next upload

Before 3 imports, show only `Last upload Sep 15`.

After a stable pattern appears, use restrained copy:

`Your team usually uploads every 7–10 days. New data may be ready.`

Actions:

- `Update data`
- `Remind me later`

Do not block the product. Do not send repeated reminders. Start with one in-app prompt. Test email reminders separately.

### What proves the recommendation

Track whether different intervals affect:

- time from performance change to finding;
- percentage of findings with enough evidence;
- manager review rate;
- action creation rate;
- follow-up completion rate;
- false-positive dismissal rate.

Only call weekly or biweekly a recommendation after these measures show a clear benefit for the relevant team and data source.

## Manager context

The manager provides text or a file. Zevian extracts:

- employee;
- time period;
- context type;
- relevant metrics;
- important facts;
- possible links to existing findings.

The manager confirms the interpretation when confidence is not high enough for silent attachment. The category stays secondary. The important confirmation is who, what happened, when, and which finding it may explain.

## Employee context

Employee context is optional and small:

- what they worked on;
- what got in the way;
- anything the numbers may not show.

### Processing rules

1. Save the raw submission unchanged.
2. Extract people, dates, work types, blockers, facts, and relevant metrics.
3. Link it only to the submitting employee unless an authorized manager confirms another person.
4. Compare it with existing or later data-based findings for the same period.
5. Attach it as `context_only` evidence.
6. Never increase a finding to `open` using employee context alone.
7. Keep the employee's exact words available beside the structured summary.

Employee context may:

- explain a performance change;
- challenge an assumed contributing factor;
- reduce confidence in a finding;
- help a manager choose a coaching action.

Employee context may not:

- create a finding;
- create a performance score;
- rank employees;
- be treated as proof of cause or intent.

## Finding generation

A finding requires a data-based trigger. A simple first version can use:

- a minimum baseline history;
- a material deviation from the employee's usual range;
- persistence across a minimum number of periods;
- minimum observation volume;
- metric-specific direction and sensitivity.

Store the detector version and inputs with every finding. A later model or threshold change must not rewrite why an earlier finding existed.

Context is evaluated after the data trigger. It changes the explanation and evidence strength, not the existence of the trigger.

## Manager actions and follow-ups

An action belongs to a finding. A follow-up belongs to that action and finding.

When the manager records an action:

1. Save the note and timestamp.
2. If follow-up is enabled, create a `follow_ups` record.
3. Wait for the configured number of new periods or a chosen date.
4. Compare post-action observations with the pre-action baseline and finding period.
5. Show what changed without claiming that the action caused it.
6. Ask the manager to record the outcome.

The system observation and manager outcome remain separate fields.

## Ask AI history

Ask AI should query structured records, not raw files directly.

The retrieval scope includes:

- metric observations;
- findings and their evidence;
- manager actions;
- follow-up outcomes;
- confirmed manager context;
- employee context marked as supporting evidence;
- import history and reporting periods.

Every answer should include source references. Time and employee filters narrow retrieval but should remain optional for a team of roughly 25 people.

## Audit and trust

Keep these events:

- original uploaded file;
- parser and detector version;
- automatic matches and confidence;
- manager corrections;
- raw context and structured interpretation;
- context confirmations;
- finding evidence at creation time;
- manager decisions, actions, and outcomes.

Do not silently replace historical explanations after a model update. New analysis can be attached as a new version.

## First implementation order

1. Imports, object storage, background jobs, and progress states.
2. Remembered employee and metric mappings.
3. Normalized observations and baseline calculation.
4. Rule-based finding detection with traceable evidence.
5. Manager context extraction and confirmation.
6. Manager actions and data-triggered follow-ups.
7. Employee context as `context_only` evidence.
8. Upload-cadence observation and one in-app prompt.
9. Ask AI over structured history.

This order keeps the first release testable. Each later layer depends on reliable imports, mappings, and evidence.
