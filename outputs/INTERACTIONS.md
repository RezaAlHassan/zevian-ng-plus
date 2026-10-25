# Zevian interaction design system

## Current findings and evidence drawer

The normal sample flow shares all three designed findings and their complete evidence tabs with the preview. It starts with two unread findings and one read finding. Opening a drawer saves its read status; this does not record a manager decision. Actual uploaded records keep their own evidence.

The default interface follows nodes `4321:6757`, `4321:6857`, `4321:10320`, `4325:7042`, `4326:8964`, `4326:9166`, `4330:9399`, and `4332:5809`. It uses a title, category and optional impact badge, metrics, and keyboard accessible evidence tabs. Investigate reveals context and source records. Record decision reveals the existing optional Mark reviewed and Dismiss actions. Context, request, decision, focus, and saved data behavior stays shared with the existing application. Sample numbers and messages are restricted to design previews. Real records show only their available metrics and evidence.

Run `outputs/tests/zevian-findings-design.cjs` for the current layout and behavior. The `drawer-variant` parameter explicitly selects the earlier drawer described below for historical reference.

The current interaction rules are shared in `assets/zevian-interactions.js` and `assets/zevian-interactions.css`. The review drawer uses them in `assets/zevian-review-drawer.js`. Change these shared rules when a design changes, and update the browser checks in the same change. Avoid adding another override in the older CSS or drawer code.

## Figma sources

File: [Zevian v4](https://www.figma.com/design/4MpYqeVLX4aHva4Dwrcd5t/Zevian-v4).

| Node | Purpose |
| --- | --- |
| [4250:5642](https://www.figma.com/design/4MpYqeVLX4aHva4Dwrcd5t/Zevian-v4?node-id=4250-5642) | Drawer with collapsed details, context and source records |
| [4258:10256](https://www.figma.com/design/4MpYqeVLX4aHva4Dwrcd5t/Zevian-v4?node-id=4258-10256) | Activity and messaging evidence; expanded records |
| [4258:11856](https://www.figma.com/design/4MpYqeVLX4aHva4Dwrcd5t/Zevian-v4?node-id=4258-11856) | Several possible causes and editable manager context |
| [4258:12001](https://www.figma.com/design/4MpYqeVLX4aHva4Dwrcd5t/Zevian-v4?node-id=4258-12001) | Multiple messages, employee and manager context, request sent |
| [4117:47007](https://www.figma.com/design/4MpYqeVLX4aHva4Dwrcd5t/Zevian-v4?node-id=4117-47007) | Button, link and badge states |
| [4036:48273](https://www.figma.com/design/4MpYqeVLX4aHva4Dwrcd5t/Zevian-v4?node-id=4036-48273) | Employee selection and finding row states |

Reviewed on 9 October 2026. Figma prototype reactions confirm a 300 ms ease-out dissolve for finding hover and a 300 ms ease-out drawer move-in. The screenshots define the other visible states. Keyboard access, cancel behavior, draft preservation and empty states are implementation rules where the supplied nodes do not define a reaction.

## Findings typography

Use Plus Jakarta Sans: heading 25 px / 700, supporting text 15 px / 400, column headings 11 px / 500, finding titles and row text 13 px / 400. Row line height is 20 px, with 0.065 px letter spacing. Finding titles must not use the older 650 weight override.

## Shared rules

| Element | Behavior |
| --- | --- |
| Buttons | Default, hover, keyboard focus and disabled states use existing Figma color tokens. Heights: large 62 px, medium 46 px, small 38 px, extra small 32 px. Radius: 8 px. Disabled controls cannot run an action. |
| Finding rows | Default app background, hover `background-table-row-hover`, focus or open selection `background-table-row-focus`. Enter or Space opens the drawer. |
| Employee choices | Hover uses `background-surface-subtle`. Selected uses `background-surface-selected` and `border-selected`, with Linked text. |
| Drawer | 675 px at desktop size, limited by the available width. Expand uses the full content area. Mobile uses the full viewport width. Slide in once on opening; updates inside the drawer do not replay the animation. |
| Disclosures | Native `details` and `summary` provide mouse and keyboard control. Dashed link border, 16 px chevron, down when closed and up when open. Cause, context and records open independently. |
| Motion | Shared 300 ms ease-out tokens. Reduced motion removes animations, transitions and smooth scrolling. |
| Focus | Opening focuses Close. Tab stays in the drawer. Closing returns to the original row or button. Native request and feedback dialogs keep their own focus. |

## Drawer states and edge cases

- Default: cause details, outside-data context and source records are collapsed. Their state and scroll position stay with each finding during the current page session, including after saving context or a decision.
- Cause evidence can include several categories and several messages. Keep author, date and source with every message. Cause text must keep uncertainty clear. Imported totals alone do not prove a cause.
- Missing evidence is shown explicitly. Missing numeric cells use an em dash; a real zero stays zero. An empty source list shows “Source records unavailable.” Uploaded data never receives the Figma sample messages, lead history or territory labels.
- Context includes all visible manager and employee notes. Only an existing manager note changes Add context to Edit context. Employee-only notes keep Add context. Edit context never replaces the employee response.
- Saving a context note updates the finding and returns focus to Edit context. Cancel or Escape in the editor leaves the saved note unchanged and returns focus to the context button. Unsaved text survives a drawer rerender or close/reopen in the current page session. It is not stored as saved context.
- Request Employee Context opens the existing confirmation dialog. Cancel and Escape leave it unsent. Sending stores one request; Request sent becomes disabled. Employee responses remain visible with the manager note. Live delivery still needs backend integration.
- Decisions remain optional. Mark reviewed stores Reviewed and shows a pressed state. Repeating it creates no extra history entry. Dismiss stores Dismissed, closes the drawer and returns focus to the finding.
- Not relevant opens a report form. Cancel changes nothing. Saving stores the report with the finding and in local history. This prototype does not send the report to a server.

## Code and verification

Load order: existing application, import review, investigation models, shared interactions, current review drawer. `zevian-investigation.js` supplies the existing finding models. The current drawer shows text evidence and source records only; it does not render the older comparison evidence section, charts or graphs. Its old summary layout is replaced by `zevian-review-drawer.js`.

Run `node outputs/tests/zevian-interactions.cjs` with Playwright available in `NODE_PATH`. It checks the four supplied variants, local icon loading and dimensions, independent disclosures, context save/cancel, request confirmation, disabled sent state, decisions, reports, empty evidence, keyboard focus, responsive widths, reduced motion and reload persistence. Run `zevian-import-review.cjs` to check the shared row, button and employee-match styles against the import flow.

For a visual comparison, open `zevian-manager-workflow.html?design-preview=1&screen=drawer&drawer-variant=collapsed`. Other variants are `details`, `context` and `messages`. These fixtures are isolated from saved reviews. The source table copies the supplied Figma values for visual review, including its current Connect Rate value of 19. Real findings format rate values from their own records and do not use this fixture.

The sidebar workspace icon and the older import-step label are existing differences outside this drawer update.
