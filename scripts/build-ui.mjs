import { cp, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as sass from 'sass';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePublicDirectory = path.join(projectRoot, 'src', 'ui', 'public');
const sourceViewsDirectory = path.join(projectRoot, 'src', 'ui', 'views');
const outputPublicDirectory = path.join(projectRoot, 'dist', 'ui', 'public');
const outputViewsDirectory = path.join(projectRoot, 'dist', 'ui', 'views');
const govukAssetsDirectory = path.join(
  projectRoot,
  'node_modules',
  'govuk-frontend',
  'dist',
  'govuk',
  'assets',
);

await mkdir(outputPublicDirectory, { recursive: true });
await cp(sourcePublicDirectory, outputPublicDirectory, { recursive: true, force: true });
await cp(sourceViewsDirectory, outputViewsDirectory, { recursive: true, force: true });
await cp(govukAssetsDirectory, path.join(outputPublicDirectory, 'assets'), {
  recursive: true,
  force: true,
});

const stylesheet = sass.compile(path.join(projectRoot, 'src', 'ui', 'styles.scss'), {
  loadPaths: [path.join(projectRoot, 'node_modules')],
  quietDeps: true,
  silenceDeprecations: ['import'],
});
await writeFile(path.join(outputPublicDirectory, 'styles.css'), stylesheet.css, 'utf8');
