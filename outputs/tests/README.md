# Zevian v4 verification

The normal sample review now uses the same three designed findings as the preview. Existing saved sample reviews switch to these findings when opened. The initial state is two unread and one read; opening a drawer marks that finding read and saves it across reloads. Read status is separate from optional decisions. The current browser check covers the normal sample route, its distinct tabs and content, and saved read status as well as the previews.

The default findings and drawer now follow Figma nodes `4321:6757`, `4321:6857`, `4321:10320`, `4325:7042`, `4326:8964`, `4326:9166`, `4330:9399`, and `4332:5809`. Run `node outputs/tests/zevian-findings-design.cjs` with `playwright-core` available through `NODE_PATH`. It checks all seven evidence tabs, badge typography, local assets, drawer width, keyboard tabs, decisions, and mobile overflow. Preview with `?design-preview=1&screen=findings` or `?design-preview=1&screen=drawer&finding=campaign` (`individual` and `pipeline` are also available; `tab=1` selects the second tab). Figma sample values and messages stay in preview mode. Uploaded findings use their own metrics and source records. Investigate opens context and records; Record decision opens the optional review actions. The older explicit `drawer-variant` previews remain available for historical checks.

The current drawer follows the October 2026 Figma update. Run `node outputs/tests/zevian-interactions.cjs` for its behavior and visual fixtures. Shared rules and source links are in [INTERACTIONS.md](../INTERACTIONS.md). This replaces the earlier summary/evidence drawer layout described below; `zevian-drawer.cjs` and `zevian-v4.cjs` remain historical layout checks. Current desktop width is 675 px, with an expand control and full mobile width. Request sent is disabled. Decisions are optional Mark reviewed / Dismiss actions.

Use `?design-preview=1&screen=drawer&drawer-variant=collapsed`, `details`, `context`, or `messages` for the four supplied Figma states. The current test creates `zevian-review-*-qa.png` screenshots and verifies context, requests, reports, focus, local assets, mobile layout, reduced motion and persistence. Imported findings use the same drawer; fixture messages are only used in design-preview mode.

Run `node outputs/tests/zevian-drawer.cjs` with Playwright available through `NODE_PATH` to check the current investigation drawer. It covers all three examples, evidence navigation, optional decisions, context changes, reload persistence, focus return, and desktop/mobile geometry. It can run directly against the HTML file, or use `ZEVIAN_TEST_URL` for a local HTTP preview. The older `zevian-v4.cjs` targets the earlier drawer and is kept as a historical check.

Open **Uploads → Sample data and file guidance → Try investigation examples** to load the three static examples. They also appear under `?design-preview=1&screen=findings` or `screen=drawer`. Example data uses local state; the design preview does not write local storage. The current drawer keeps the requested 65% desktop width and full mobile width.

`assets/zevian-investigation.js` supplies the shared finding model, grouped bars, before/after comparison, trend, timeline, observations, evidence view, and optional decisions. Uploaded findings use the same views without inventing process changes or message examples. Manager context uses the existing local rules, not an LLM. Unsupported notes produce no new investigation observation.

Start a local server from the repository root:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Run `node outputs/tests/zevian-v4.cjs` with Playwright installed and available through `NODE_PATH`. The test uses installed Chrome. Set `ZEVIAN_CHROME` to another Chromium executable or `ZEVIAN_TEST_URL` to another preview URL when needed.

The test checks local asset loading, drawer geometry, context review, decisions, persistence, mobile overflow, CSV validation, XLSX import, ambiguous employee matching, and manual records. Browser contexts keep test data separate from the user's browser. It also creates six QA screenshots in `outputs/`.

Open the HTML with `?design-preview=1&screen=upload` to compare the Figma sample screen. Other screen values are `match`, `findings`, `drawer`, and `context`. The preview uses separate sample state and does not write saved review data.

Design source: https://www.figma.com/design/4MpYqeVLX4aHva4Dwrcd5t/Zevian-v4

Color values in `assets/figma/tokens.css` come from resolved local Figma variables. Button hover transitions use 300 ms ease-out; the drawer uses a 300 ms move-in transition. Reduced motion follows the user's system preference.

Employee matching uses names from earlier local imports. Request Employee Context shows a sent confirmation, and the employee supplies context through their own portal. This standalone prototype saves the request status locally; live delivery, portal responses, and a connected company directory require backend integration. The browser check simulates an incoming portal response to verify manager review.

Employee requests first open a confirmation dialog with Cancel / Send request and a copyable link to the specific finding. Cancel and Escape leave the request unsent. Confirming saves the sent status and link, and reopening a sent request shows its existing link. The default URL is the dummy `https://employee.zevian.example/context`; set `window.ZEVIAN_EMPLOYEE_PORTAL_URL` before loading `zevian-v4.js` to replace it. The live portal must authenticate the employee and resolve the finding and request identifiers. The test also creates desktop and mobile request-dialog screenshots.

Run `node outputs/tests/zevian-import-review.cjs` to check the sequential import review. It covers back navigation, employee matches, duplicate selection, summary counts, reload persistence, missing reporting dates, KPI history limits, and the Ready / Usable with limits / Nothing can be assessed states. It creates three additional QA screenshots in `outputs/`.

Imported columns and unresolved employee names are reviewed one at a time. The final summary shows matched employees, identified KPIs, duplicate rows excluded after review, and rows ready. Assessable KPIs continue to findings; files without an assessable KPI ask for more data.

Hidden prototype switch: double-click **Start review** on the upload page, or press **Alt + Shift + S** there. This toggles between the default full review and direct upload → summary → findings. A brief message confirms the selected mode, which stays active in the current tab across reloads. Direct mode accepts inferred column matches; required details, duplicates, and unresolved employee matches still open their existing exception screens. **Review matches** on the summary opens the full review for that upload. Toggle again on the upload page to return to the default path. Manual KPI entry keeps its full review.
