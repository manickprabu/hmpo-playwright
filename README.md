# Passport browser automation

Sequential, session-isolated Playwright automation for processing passport numbers from a local text file. It records JPEG screenshots, optional tab text, errors, and a JSON summary locally. It does not send data to third parties.

## Prerequisites

- Node.js 20 or later
- Access to the target site and authorization to automate it

## Install

```bash
npm install
npx playwright install chromium
cp .env.example .env
```

Set `TARGET_URL` in `.env`. Never commit `.env`; it is ignored by Git.

## Configure

1. Put one passport number per line in `input/passports.txt`. Empty lines, lines beginning with `#`, surrounding whitespace, and duplicates are ignored.
2. Update the TODO selectors in `src/selectors.ts`.
3. Update the page/tab configuration in `src/pages.ts`. Each section has one navigation selector and any number of tabs, allowing navigation logic to remain reusable.
4. Set a `contentSelector` for every tab, scoped to only that tab's actual content. Each tab creates a text file matching its screenshot filename.

The starter page definitions are illustrative only: they will not work until their TODO selectors match the target site.

## Run

```bash
npm run dev       # run TypeScript directly
npm run build
npm start         # run compiled JavaScript
```

## Local activity dashboard

Start the dashboard in one terminal, then run the automation in another. The dashboard command compiles the HMPO/GOV.UK assets before starting:

```bash
npm run ui
npm run dev
```

Open `http://localhost:4173` to see the current record (masked), the active step, batch progress, recent events, and results. The dashboard uses HMPO components and GOV.UK Frontend styling, refreshes automatically, and reads only the local `output/run-status.json` file. Use `UI_PORT` in `.env` if port 4173 is already in use.

Use **Automation controls** in the dashboard to save the target URL and start a batch. The URL must use HTTP or HTTPS and is saved only to your local `.env` file. The dashboard prevents a second batch from starting while the current batch is running.

Starting a batch from the dashboard clears the configured output directory first, so each run produces a fresh report. For safety, dashboard starts only allow an `OUTPUT_DIR` located inside this project.

Use **Passport numbers in batch** to view, add, or delete records in `input/passports.txt` without manually editing the file. Duplicate numbers are ignored. This local view shows complete passport numbers, so keep the dashboard private.

The **Activity** view provides **Download final report (.zip)**. It creates a ZIP download of the local output folder, including screenshots, extracted text, diagnostics, and `summary.json`.

For visible debugging, set these in `.env`:

```dotenv
HEADLESS=false
SLOW_MO=100
```

Use `HEADLESS=true` for normal unattended execution. `NAVIGATION_TIMEOUT`, `SCREENSHOT_QUALITY` (0–100), `INPUT_FILE`, and `OUTPUT_DIR` are also configured in `.env`.

## Output

Each passport has an isolated browser context and an output directory, for example:

```text
output/
  P1234567/
    01-overview.jpg
    01-overview.txt
    02-personal-details.jpg
    02-personal-details.txt
    03-application-details.jpg
    03-application-details.txt
    04-history.jpg
    04-history.txt
    special-tab.jpg
    special-tab.txt
  summary.json
```

Folder and filenames are sanitized before writing. Each configured tab produces both its JPEG screenshot and a matching UTF-8 `.txt` file containing the tab's scoped text. On a per-passport failure, the run continues and creates `error.txt` and `error-screenshot.jpg` in that passport's folder. Console output masks passport numbers; `summary.json` keeps the original number so results can be mapped to their required output folders.

## Screenshot behavior

Before every capture, the project progressively scrolls the document and scrollable descendants of the configured tab content to trigger lazy loading, then uses Playwright's `fullPage` JPEG capture. If that capture fails, it saves ordered viewport parts such as `04-history-01.jpg`, rather than silently dropping content.

For an app with fixed-height/internal scrolling panels, ensure `contentSelector` targets the panel. If the site virtualizes or infinitely loads rows, define a site-specific stopping condition in `src/utils/scrollUtils.ts`; no generic tool can know when an unbounded feed is complete.

## Troubleshooting

- **Selector timeout:** inspect the target DOM in visible mode, then replace the matching TODO selector in `src/selectors.ts` or `src/pages.ts`.
- **Login indicates failure:** change `errorMessage` and `loginSuccessIndicator` in `src/selectors.ts` to reliable, mutually exclusive UI elements.
- **SPA transitions:** configure a `readySelector` for every section. The automation waits on DOM state rather than assuming a full navigation.
- **Missing content or text:** point `contentSelector` at the active tab's dedicated content region, excluding global navigation, header, and footer.
- **Browser executable missing:** rerun `npx playwright install chromium`.

## Files to update when the target HTML/screenshots arrive

- `src/selectors.ts`: passport input, submit, success, logout, spinner, and error selectors.
- `src/pages.ts`: page navigation, tab controls, ready/content regions, names, order, and required text-extraction tab.
- `src/utils/scrollUtils.ts`: only if the site has unusual virtualized/infinite content or scroll containers hidden behind shadow DOM.
