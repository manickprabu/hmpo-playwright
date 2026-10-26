import 'dotenv/config';
import { createServer } from 'node:http';
import { spawn, type ChildProcess } from 'node:child_process';
import { ZipArchive } from 'archiver';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import nunjucks from 'nunjucks';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ActivityStatus } from '../services/activityTracker.js';
import { readPassportNumbers } from '../services/passportReader.js';
import { randomUUID } from 'node:crypto';
import { normaliseMessageNewlines, validateEditedMessage, type ProtectedRange } from './protectedMessageValidation.js';

const directory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(directory, '../..');
const environmentFile = path.join(projectRoot, '.env');
const inputFile = path.resolve(
  projectRoot,
  process.env.INPUT_FILE?.trim() || 'input/passports.txt',
);
const builtPublicDirectory = path.resolve(directory, '../../dist/ui/public');
const publicDirectory = existsSync(builtPublicDirectory)
  ? builtPublicDirectory
  : path.join(directory, 'public');
const viewsDirectory = path.join(directory, 'views');
const outputDirectory = path.resolve(process.env.OUTPUT_DIR?.trim() || 'output');
const port = Number(process.env.UI_PORT || 4173);
let automationProcess: ChildProcess | undefined;

const exampleMessage = normaliseMessageNewlines(`event: NOTIFICATION_SENT
timestamp: 2025-09-30T12:42:39.170+01:00
reason: Passport Dispatched (Docs)
contactDetailsType: Email address
contact: sdfadf@sdf.com
messageType: email
subject: Your new passport has been printed
message: Dear Diplomat John Syminor,
Application reference: PEX 827 374 3449
Your new passport has been printed.
# What happens next
Your new passport will be transferred to our delivery supplier in the next few days.
Your documents will arrive separately and could take up to 2 weeks to arrive.
# Tell us what you think
We'd like feedback on our service so we can make improvements.`);
const protectedValues = ['2025-09-30T12:42:39.170+01:00', 'sdfadf@sdf.com', 'Diplomat John Syminor,', '827 374 3449'];
const exampleProtectedRanges: ProtectedRange[] = protectedValues.map((value) => {
  const start = exampleMessage.indexOf(value);
  return { start, end: start + value.length };
});
const notificationEditors = new Map<string, { message: string; protectedRanges: ProtectedRange[] }>();

const initialStatus: ActivityStatus = {
  updatedAt: new Date().toISOString(),
  state: 'idle',
  total: 0,
  completed: 0,
  successful: 0,
  failed: 0,
  events: [],
  results: [],
};

const templateEnvironment = nunjucks.configure(
  [
    viewsDirectory,
    path.resolve(directory, '../../node_modules/hmpo-components/components'),
    path.resolve(directory, '../../node_modules/govuk-frontend/dist'),
  ],
  { autoescape: true, noCache: process.env.NODE_ENV !== 'production' },
);
templateEnvironment.addGlobal('merge', (first: object, second: object) => ({
  ...first,
  ...second,
}));

async function status(): Promise<ActivityStatus> {
  try {
    return JSON.parse(
      await fs.readFile(path.join(outputDirectory, 'run-status.json'), 'utf8'),
    ) as ActivityStatus;
  } catch {
    return initialStatus;
  }
}

async function configuredTargetUrl(): Promise<string> {
  try {
    const environment = await fs.readFile(environmentFile, 'utf8');
    return environment.match(/^TARGET_URL=(.*)$/m)?.[1]?.trim() || '';
  } catch {
    return '';
  }
}

async function saveTargetUrl(value: unknown): Promise<string> {
  if (typeof value !== 'string') throw new Error('Enter a target website URL.');
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new Error('Enter a valid website URL.');
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error('Use an HTTP(S) URL without embedded credentials.');
  }

  const targetUrl = parsed.toString();
  let environment = '';
  try {
    environment = await fs.readFile(environmentFile, 'utf8');
  } catch {
    // A new .env with only TARGET_URL is valid because the remaining configuration has defaults.
  }
  const line = `TARGET_URL=${targetUrl}`;
  const updated = /^TARGET_URL=/m.test(environment)
    ? environment.replace(/^TARGET_URL=.*$/m, line)
    : `${environment}${environment && !environment.endsWith('\n') ? '\n' : ''}${line}\n`;
  await fs.writeFile(environmentFile, updated, 'utf8');
  return targetUrl;
}

function sendJson(
  response: import('node:http').ServerResponse,
  statusCode: number,
  body: unknown,
): void {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(body));
}

async function requestJson(request: import('node:http').IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 10_000) throw new Error('Request is too large.');
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new Error('Request body must be valid JSON.');
  }
}

async function requestForm(request: import('node:http').IncomingMessage): Promise<Record<string, string>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 100_000) throw new Error('Request is too large.');
    chunks.push(buffer);
  }
  const values: Record<string, string> = {};
  for (const [key, value] of new URLSearchParams(Buffer.concat(chunks).toString('utf8'))) {
    if (!(key in values)) values[key] = value;
  }
  return values;
}

function createNotificationEditor(): { editorToken: string; message: string; protectedRanges: ProtectedRange[] } {
  const editorToken = randomUUID();
  const state = {
    message: exampleMessage,
    protectedRanges: exampleProtectedRanges.map((range) => ({ ...range })),
  };
  notificationEditors.set(editorToken, state);
  return { editorToken, ...state };
}

function renderNotificationEditor(
  response: import('node:http').ServerResponse,
  data: { editorToken: string; message: string; protectedRanges: ProtectedRange[]; errorMessage?: string; submittedMessage?: string },
): void {
  response.writeHead(data.errorMessage ? 400 : 200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(templateEnvironment.render('edit-notification.njk', data));
}

async function resetOutputDirectory(): Promise<void> {
  const relativePath = path.relative(projectRoot, outputDirectory);
  const isInsideProject =
    relativePath !== '' &&
    relativePath !== '..' &&
    !relativePath.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relativePath);
  if (!isInsideProject) {
    throw new Error(
      'OUTPUT_DIR must be a subdirectory of this project when starting from the dashboard.',
    );
  }
  await fs.rm(outputDirectory, { recursive: true, force: true });
  await fs.mkdir(outputDirectory, { recursive: true });
}

async function startAutomation(): Promise<void> {
  if (automationProcess?.exitCode === null) throw new Error('Automation is already running.');
  if (!(await configuredTargetUrl()))
    throw new Error('Save a target website URL before starting automation.');
  const currentStatus = await status();
  if (currentStatus.state === 'running') throw new Error('Automation is already running.');

  const entryPoint = path.join(projectRoot, 'dist', 'index.js');
  try {
    await fs.access(entryPoint);
  } catch {
    throw new Error('Build the project before starting automation.');
  }
  await resetOutputDirectory();
  automationProcess = spawn(process.execPath, [entryPoint], {
    cwd: projectRoot,
    stdio: 'inherit',
    env: process.env,
  });
  automationProcess.once('exit', () => {
    automationProcess = undefined;
  });
  automationProcess.once('error', () => {
    automationProcess = undefined;
  });
}

async function addPassportNumber(value: unknown): Promise<{ added: boolean; total: number }> {
  if (typeof value !== 'string') throw new Error('Enter a passport number.');
  const passportNumber = value.trim();
  if (!passportNumber || /\s/.test(passportNumber) || passportNumber.length > 120) {
    throw new Error('Enter one passport number without spaces.');
  }

  let existing: string[] = [];
  try {
    existing = await readPassportNumbers(inputFile);
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
  }
  if (existing.includes(passportNumber)) return { added: false, total: existing.length };

  await fs.mkdir(path.dirname(inputFile), { recursive: true });
  await fs.appendFile(inputFile, `${passportNumber}\n`, 'utf8');
  return { added: true, total: existing.length + 1 };
}

async function listPassportNumbers(): Promise<string[]> {
  try {
    return await readPassportNumbers(inputFile);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return [];
    throw error;
  }
}

async function deletePassportNumber(value: unknown): Promise<{ deleted: boolean; total: number }> {
  if (typeof value !== 'string') throw new Error('Choose a passport number to delete.');
  const passportNumber = value.trim();
  let contents: string;
  try {
    contents = await fs.readFile(inputFile, 'utf8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
      return { deleted: false, total: 0 };
    throw error;
  }

  const lines = contents.split(/\r?\n/);
  const filtered = lines.filter((line) => line.trim() !== passportNumber);
  const deleted = filtered.length !== lines.length;
  if (deleted) await fs.writeFile(inputFile, filtered.join('\n'), 'utf8');
  return { deleted, total: (await listPassportNumbers()).length };
}

async function downloadFinalReport(response: import('node:http').ServerResponse): Promise<void> {
  if ((await status()).state !== 'completed') {
    sendJson(response, 409, {
      error: 'The final report is available only after processing has completed.',
    });
    return;
  }
  try {
    await fs.access(outputDirectory);
  } catch {
    sendJson(response, 404, { error: 'No output report is available yet.' });
    return;
  }

  response.writeHead(200, {
    'Content-Type': 'application/zip',
    'Content-Disposition': 'attachment; filename="passport-automation-report.zip"',
    'Cache-Control': 'no-store',
  });
  const archive = new ZipArchive({ zlib: { level: 9 } });
  archive.on('error', (error: Error) => response.destroy(error));
  archive.pipe(response);
  archive.directory(outputDirectory, 'passport-automation-report');
  await archive.finalize();
}

function contentType(file: string): string {
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  if (file.endsWith('.js')) return 'application/javascript; charset=utf-8';
  return 'text/html; charset=utf-8';
}

const server = createServer(async (request, response) => {
  const requestedPath = new URL(request.url || '/', 'http://localhost').pathname;
  if (request.method === 'GET' && requestedPath === '/api/status') {
    sendJson(response, 200, await status());
    return;
  }

  if (request.method === 'GET' && requestedPath === '/api/config') {
    sendJson(response, 200, { targetUrl: await configuredTargetUrl() });
    return;
  }

  if (request.method === 'POST' && requestedPath === '/api/config/target-url') {
    try {
      const requestBody = await requestJson(request);
      const targetUrl =
        requestBody && typeof requestBody === 'object'
          ? (requestBody as { targetUrl?: unknown }).targetUrl
          : undefined;
      sendJson(response, 200, { targetUrl: await saveTargetUrl(targetUrl) });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : 'Could not save target URL.',
      });
    }
    return;
  }

  if (request.method === 'POST' && requestedPath === '/api/automation/start') {
    try {
      await startAutomation();
      sendJson(response, 202, { message: 'Automation started.' });
    } catch (error) {
      sendJson(response, 409, {
        error: error instanceof Error ? error.message : 'Could not start automation.',
      });
    }
    return;
  }

  if (request.method === 'POST' && requestedPath === '/api/passports') {
    try {
      const requestBody = await requestJson(request);
      const passportNumber =
        requestBody && typeof requestBody === 'object'
          ? (requestBody as { passportNumber?: unknown }).passportNumber
          : undefined;
      sendJson(response, 200, await addPassportNumber(passportNumber));
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : 'Could not add passport number.',
      });
    }
    return;
  }

  if (request.method === 'GET' && requestedPath === '/api/passports') {
    sendJson(response, 200, { passports: await listPassportNumbers() });
    return;
  }

  if (request.method === 'DELETE' && requestedPath === '/api/passports') {
    try {
      const requestBody = await requestJson(request);
      const passportNumber =
        requestBody && typeof requestBody === 'object'
          ? (requestBody as { passportNumber?: unknown }).passportNumber
          : undefined;
      sendJson(response, 200, await deletePassportNumber(passportNumber));
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : 'Could not delete passport number.',
      });
    }
    return;
  }

  if (request.method === 'GET' && requestedPath === '/api/reports/download') {
    await downloadFinalReport(response);
    return;
  }

  if (request.method === 'GET' && requestedPath === '/edit-notification') {
    renderNotificationEditor(response, createNotificationEditor());
    return;
  }

  if (request.method === 'POST' && requestedPath === '/edit-notification') {
    try {
      const form = await requestForm(request);
      const trustedState = notificationEditors.get(form.editorToken);
      if (!trustedState) throw new Error('This editing session has expired. Reload the page and try again.');
      const validation = validateEditedMessage(trustedState.message, trustedState.protectedRanges, form.message ?? '');
      if (!validation.valid) {
        renderNotificationEditor(response, {
          editorToken: form.editorToken,
          // Do not render an unvalidated value with trusted original offsets.
          // A fresh copy keeps the protected overlay and textarea in agreement.
          message: trustedState.message,
          protectedRanges: trustedState.protectedRanges,
          errorMessage: validation.error,
        });
        return;
      }
      notificationEditors.delete(form.editorToken);
      renderNotificationEditor(response, { ...createNotificationEditor(), submittedMessage: validation.message });
    } catch (error) {
      const state = createNotificationEditor();
      renderNotificationEditor(response, {
        ...state,
        errorMessage: error instanceof Error ? error.message : 'Could not save the notification message.',
      });
    }
    return;
  }

  if (requestedPath === '/') {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(templateEnvironment.render('index.njk', createNotificationEditor()));
    return;
  }

  const file = requestedPath.replace(/^\/+/, '');
  const target = path.resolve(publicDirectory, file);
  if (
    !target.startsWith(`${publicDirectory}${path.sep}`) &&
    target !== path.join(publicDirectory, 'index.html')
  ) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  try {
    const contents = await fs.readFile(target);
    response.writeHead(200, { 'Content-Type': contentType(target) });
    response.end(contents);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});

server.listen(port, () => {
  console.log(`Passport activity dashboard: http://localhost:${port}`);
});
