# Zevian prototype

The main page is [outputs/zevian-manager-workflow.html](outputs/zevian-manager-workflow.html). Future prototype changes belong in this HTML file and its linked files under `outputs/assets/`.

The current prototype opens straight to three findings, with two unread and one read on a fresh visit. Upload and column matching are temporarily hidden and bypassed. Each finding has its own evidence tabs. The prototype saves its read status, context and decisions under `zevian_findings_prototype_v1`; earlier imported reviews remain in their old storage key and cannot replace the current examples. The import code is retained for future use.

## Deploy on Netlify

Import `RezaAlHassan/zevian-ng-plus` from GitHub into Netlify:

- Production branch: `main`
- Base directory: leave empty (repository root)
- Build command: leave empty
- Publish directory: `outputs`

The repository's `netlify.toml` sets the publish directory. `outputs/_redirects` serves `zevian-manager-workflow.html` at the site homepage without creating a second HTML file. The original `/zevian-manager-workflow.html` URL also works.

Once the GitHub connection and automatic builds are enabled, each push to `main` deploys the latest committed HTML and assets. Local edits must be committed and pushed before they appear online.

For a one-time manual deployment, drag the entire `outputs` folder into Netlify's manual deployment area. Manual uploads do not enable automatic updates; connect GitHub for that.

## Local preview

From the repository root:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/outputs/zevian-manager-workflow.html`.

Browser checks are described in [outputs/tests/README.md](outputs/tests/README.md).
