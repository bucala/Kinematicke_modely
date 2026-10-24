import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Local ./file.js and ./file.css references in the order the page loads them.
export const pageReferences = (html, prefix = './') => [...html.matchAll(/(?:src|href)="([^"?]+\.(?:js|css))"/g)]
  .map((match) => match[1]).filter((file) => file.startsWith(prefix)).map((file) => file.slice(prefix.length));

export async function manifest(base = root) {
  const files = JSON.parse(await readFile(path.join(base, 'project-files.json'), 'utf8'));
  const page = pageReferences(await readFile(path.join(base, 'index.html'), 'utf8'));
  const browserTests = pageReferences(await readFile(path.join(base, 'tests/browser.html'), 'utf8'), '').map((file) => path.posix.normalize(`tests/${file}`));
  const web = ['index.html', ...page, ...files.assets];
  return {
    ...files,
    page,
    web,
    browserTests: ['tests/browser.html', ...browserTests.filter((file) => file.startsWith('tests/'))],
    javascript: files.source.filter((file) => /\.(?:m?js)$/.test(file) && !file.startsWith('vendor/')),
    nodeTests: files.source.filter((file) => /^tests\/[^/]+\.test\.mjs$/.test(file)),
  };
}

// Script and stylesheet URLs carry a content hash; the names themselves must still be revalidated.
export const noCacheHeaders = (files) => ['/', '/index.html', ...files.filter((file) => /\.(?:js|css)$/.test(file)).map((file) => `/${file}`), '/cad/KinmoFusion.zip']
  .map((route) => `${route}\n  Cache-Control: no-cache`).join('\n\n');
