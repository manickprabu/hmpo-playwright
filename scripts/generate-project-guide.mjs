import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  TextRun,
} from 'docx';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const outputDirectory = path.join(projectRoot, 'docs');
const outputFile = path.join(outputDirectory, 'Project-Guide.docx');
const paragraphs = [];

function para(text, options = {}) {
  paragraphs.push(
    new Paragraph({
      spacing: { after: 120, line: 280 },
      children: [new TextRun({ text, font: 'Aptos', size: 22, color: '263746' })],
      ...options,
    }),
  );
}

function heading(text, level = HeadingLevel.HEADING_1) {
  const size = level === HeadingLevel.HEADING_1 ? 30 : 25;
  paragraphs.push(
    new Paragraph({
      heading: level,
      keepNext: true,
      spacing: { before: 280, after: 100 },
      children: [new TextRun({ text, font: 'Aptos Display', bold: true, size, color: '12665E' })],
    }),
  );
}

function bullet(text) {
  para(text, { bullet: { level: 0 }, spacing: { after: 65, line: 260 } });
}

function numbered(text) {
  para(text, { numbering: { reference: 'guide-numbering', level: 0 }, spacing: { after: 80 } });
}

function code(lines) {
  for (const line of lines) {
    paragraphs.push(
      new Paragraph({
        indent: { left: 260, right: 180 },
        spacing: { before: 0, after: 0, line: 250 },
        shading: { type: ShadingType.CLEAR, fill: 'F1F4F5' },
        children: [new TextRun({ text: line || ' ', font: 'Aptos Mono', size: 19, color: '18343C' })],
      }),
    );
  }
  para('', { spacing: { after: 100 } });
}

function callout(label, text) {
  paragraphs.push(
    new Paragraph({
      shading: { type: ShadingType.CLEAR, fill: 'EAF4F2' },
      indent: { left: 220, right: 180 },
      spacing: { before: 120, after: 180, line: 280 },
      children: [
        new TextRun({ text: `${label} `, bold: true, font: 'Aptos', size: 22, color: '12665E' }),
        new TextRun({ text, font: 'Aptos', size: 22, color: '263746' }),
      ],
    }),
  );
}

paragraphs.push(
  new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 420, after: 120 },
    children: [
      new TextRun({
        text: 'PASSPORT BROWSER AUTOMATION',
        font: 'Aptos Display',
        bold: true,
        size: 38,
        color: '12665E',
      }),
    ],
  }),
);
para('Project guide', {
  spacing: { after: 100 },
  children: [new TextRun({ text: 'Project guide', font: 'Aptos Display', size: 34, color: '263746' })],
});
para('Setup, configuration, operation, and maintenance', {
  spacing: { after: 180 },
  children: [new TextRun({ text: 'Setup, configuration, operation, and maintenance', font: 'Aptos', size: 23, color: '536875' })],
});
para(`Generated ${new Date().toLocaleDateString('en-GB')}`, {
  spacing: { after: 300 },
  children: [new TextRun({ text: `Generated ${new Date().toLocaleDateString('en-GB')}`, font: 'Aptos', size: 19, color: '657984' })],
});

callout(
  'Data handling:',
  'This automation processes passport numbers and may access personal records. Run it only with authorization and protect input, output, screenshots, reports, and credentials as sensitive data.',
);

heading('1. What this project does');
para(
  'This Node.js and TypeScript application uses Playwright to process a sequential list of passport numbers. For each record it opens an isolated browser context, optionally signs in, submits a passport search, navigates configured record sections and tabs, and saves selected screenshots and extracted text. It records progress and a final JSON summary locally.',
);
para('The repository also includes a local dashboard for setting the target URL, managing the input list, starting a batch, watching progress, and downloading a ZIP report. The dashboard is an operational interface, not a substitute for validating the target site or its selectors.');

heading('2. Prerequisites and installation');
bullet('Node.js 20 or later and npm.');
bullet('Authorized access to the target website and permission to automate the workflow.');
bullet('A Chromium browser installed for Playwright.');
code(['npm install', 'npx playwright install chromium', 'cp .env.example .env']);
para('Edit the local .env file with the authorized target URL and any required credentials. The .env file is ignored by Git; do not add it to commits, issue reports, screenshots, or shared documents.');

heading('3. Configure the input list');
para('Add one passport number per line to input/passports.txt, or point INPUT_FILE at another file. The reader trims surrounding whitespace, ignores empty lines and lines beginning with #, and removes duplicates while preserving first-seen order. Treat the input file as sensitive personal data.');
code(['P0000001', 'P0000002', '# comments and blank lines are ignored']);

heading('4. Environment settings');
para('The .env.example file lists supported settings. TARGET_URL is required for the automation. Values below describe behavior; use approved values from your organization.');
bullet('TARGET_URL: target site origin or URL. After authentication, the search flow navigates to /passport-search on that origin if the passport field is not already visible.');
bullet('USERNAME and PASSWORD: optional credentials. Credential login runs only when both are present. Never put real credentials in source code or documentation.');
bullet('USERNAME_SELECTOR, PASSWORD_SELECTOR, LOGIN_BUTTON_SELECTOR: optional comma-separated selector candidates for the sign-in screen. The default candidates cover common username/password controls and submit buttons.');
bullet('HEADLESS: true for normal unattended runs; set false to observe the browser while debugging.');
bullet('SLOW_MO: optional Playwright delay in milliseconds, useful during visible debugging.');
bullet('NAVIGATION_TIMEOUT: default 30000 milliseconds; must be greater than zero.');
bullet('SCREENSHOT_QUALITY: JPEG quality from 0 to 100; the default is 90.');
bullet('OUTPUT_DIR and INPUT_FILE: project-relative paths by default; absolute paths are also accepted. Dashboard-started runs restrict OUTPUT_DIR to a subdirectory of this project and clear that directory before starting.');
bullet('UI_PORT: dashboard port. The checked-in example sets 4174; the server code fallback is 4173 if the variable is unset.');

heading('5. Match the target website');
para('Before a real run, inspect the authorized site DOM and update the selectors. The supplied page configuration is specific to the current target layout and may need adjustment when the site changes.');
bullet('src/selectors.ts contains the passport input, search button, success indicator, logout control, loading indicator, and error-message selectors.');
bullet('src/pages.ts defines each top-level section and its tabs. navigationSelector opens a section; readySelector describes its ready state; each tab selector activates that tab.');
bullet('contentSelector should identify the tab content region. It is used to wait for the active content, capture a scoped screenshot, and optionally extract text.');
bullet('Use extractText: true only for tabs that should produce a .txt file. Text extraction is opt-in.');
bullet('Use ignoreScreenshot: true when a tab should not create a JPG. The current Case notes configuration extracts text while skipping its screenshot.');
code([
  '{',
  "  name: 'Case notes',",
  "  selector: '#case-notes-tab',",
  "  contentSelector: '#application-record-content',",
  "  screenshotFilename: 'case-notes.jpg',",
  '  ignoreScreenshot: true,',
  '  extractText: true,',
  '}',
]);

heading('6. Run the automation');
heading('Command line', HeadingLevel.HEADING_2);
code(['npm run dev       # run TypeScript directly', 'npm run build      # compile and copy dashboard assets', 'npm start          # run the compiled automation']);
para('A run reads the configured input file and handles records sequentially. Each record receives a separate browser context, which is closed after processing. A failure for one record is recorded with diagnostics and does not prevent later input records from being attempted.');

heading('Dashboard', HeadingLevel.HEADING_2);
code(['npm run ui']);
para('Open http://localhost:<UI_PORT> (4174 with the checked-in example). The dashboard includes Automation controls and Activity. Save the target URL and use Start automation, or run npm run dev in a separate terminal. The Start automation action uses the compiled dist/index.js entrypoint, so the dashboard command builds the project before starting.');
callout(
  'Network safety:',
  'The dashboard displays complete passport numbers. The server currently listens on the configured port without explicitly binding to loopback, so do not expose it to an untrusted network. Use it only on a trusted machine/network and stop it when finished.',
);

heading('7. Outputs and reports');
para('The output directory contains one sanitized subfolder per passport number, plus run-level status and summary files. Filenames are sanitized before use. Typical record output includes configured JPEG screenshots, selected .txt extracts, and—if a record fails—error.txt and error-screenshot.jpg. The root summary.json includes totals and original passport numbers so results can be reconciled.');
bullet('Console logs mask passport numbers, but the dashboard, input list, extracted text, and summary report can contain full values or personal details.');
bullet('The dashboard Activity view can download a ZIP of the output directory after processing completes.');
bullet('Starting via the dashboard deletes the configured output directory before the run. Back up anything important first.');
bullet('Screenshots attempt a full-page capture after gradual scrolling to trigger lazy-loaded content. If full-page capture fails, ordered viewport JPGs are saved as a fallback.');

heading('8. Testing and quality checks');
code(['npm test', 'npm run test:coverage', 'npm run check', 'npm run build']);
para('Mocha runs the unit suite; Sinon supplies test doubles; JSDOM covers the public dashboard scripts without opening a real browser. c8 enforces at least 80% statements, branches, functions, and lines for the modules listed in .c8rc.json. Browser workflows, the dashboard HTTP server, and the public app bootstrap are outside the unit-test coverage set and need integration testing for end-to-end assurance.');

heading('9. Troubleshooting');
bullet('Selector timeout: inspect the live DOM in visible mode, then adjust the matching selector in src/selectors.ts or src/pages.ts.');
bullet('Sign-in fails: verify that both credentials are set, confirm the form selectors, and configure a reliable error selector. Never paste credentials into logs or support messages.');
bullet('Search does not start: confirm the passport input and search-button selectors match the rendered page and that the button is enabled after entry.');
bullet('A tab times out while content is hidden: verify the section navigation selector, tab selector, contentSelector, and the target site’s active-tab attributes. The automation waits for visible content or an active tab state.');
bullet('Text or screenshots include unrelated page content: narrow contentSelector to the active tab’s panel, excluding global navigation and page chrome.');
bullet('Lazy or virtualized content is incomplete: review src/utils/scrollUtils.ts and implement a site-specific stopping condition for infinite or virtualized lists.');
bullet('Chromium executable is missing: run npx playwright install chromium.');
bullet('Dashboard port is unavailable: set UI_PORT to a free port in .env and open that port in the browser.');

heading('10. Project map');
bullet('src/index.ts: batch lifecycle, per-record isolation, diagnostics, summary output.');
bullet('src/config.ts and src/types/index.ts: environment parsing and shared data definitions.');
bullet('src/services/login.ts, navigator.ts, screenshot.ts, textExtractor.ts: site interaction and capture workflow.');
bullet('src/services/activityTracker.ts: local run-status updates consumed by the dashboard.');
bullet('src/ui/server.ts, src/ui/views, src/ui/public: dashboard server, templates, and browser-side behavior.');
bullet('input/: passport-number source file. output/: screenshots, extracts, status, diagnostics, and summaries. test/: unit tests.');

const document = new Document({
  creator: 'Passport Browser Automation',
  title: 'Passport Browser Automation Project Guide',
  subject: 'Setup and operating guide',
  description: 'Operational guide for the local Playwright passport automation project.',
  numbering: {
    config: [
      {
        reference: 'guide-numbering',
        levels: [
          {
            level: 0,
            format: 'decimal',
            text: '%1.',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 420, hanging: 220 } } },
          },
        ],
      },
    ],
  },
  styles: {
    default: {
      document: {
        run: { font: 'Aptos', size: 22, color: '263746' },
        paragraph: { spacing: { after: 120, line: 280 } },
      },
    },
  },
  sections: [
    {
      properties: {
        page: {
          margin: { top: 850, right: 950, bottom: 850, left: 950 },
        },
      },
      children: paragraphs,
    },
  ],
});

await mkdir(outputDirectory, { recursive: true });
await writeFile(outputFile, await Packer.toBuffer(document));
console.log(`Wrote ${path.relative(projectRoot, outputFile)}`);