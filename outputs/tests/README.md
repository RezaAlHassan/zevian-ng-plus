# Zevian v4 verification

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
