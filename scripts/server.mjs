import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fusionArchive } from './archive.mjs';

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = process.argv.includes('--dist') ? path.join(workspace, 'dist') : workspace;
const port = Number(process.env.PORT || 5173);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.zip': 'application/zip', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
const allowed = new Set(['index.html', 'app.js', 'engine.js', 'double-drawer.js', 'editor.js', 'physics.js', 'exports.js', 'cad.js', 'styles.css', 'favicon.svg', 'projects/dvojite-sklopeny-suflik-reference.png', 'cad/KinmoFusion.zip', ...['pdfmake.min.js', 'vfs_fonts.js', 'LICENSE', 'Roboto-LICENSE.txt', 'PROVENANCE.md'].map((file) => `vendor/pdfmake/${file}`)]);
if (!process.argv.includes('--dist')) {
  for (const file of ['tests/browser.html', 'tests/cases.js', 'tests/editor-cases.js', 'tests/physics-cases.js', 'tests/export-cases.js', 'tests/browser.js']) allowed.add(file);
}

const server = http.createServer(async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end('Method not allowed'); return; }
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    if (!allowed.has(relative)) { res.writeHead(404); res.end('Not found'); return; }
    if (relative === 'cad/KinmoFusion.zip' && root === workspace) {
      const archive = await fusionArchive(workspace);
      res.writeHead(200, { 'Content-Type': types['.zip'], 'Content-Length': archive.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end(req.method === 'HEAD' ? undefined : archive);
      return;
    }
    const filename = path.join(root, relative);
    const info = await stat(filename);
    res.writeHead(200, { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream', 'Content-Length': info.size, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : await readFile(filename));
  } catch {
    res.writeHead(404); res.end('Not found');
  }
});

server.on('error', (error) => { console.error(`Server sa nepodarilo spustiť: ${error.message}`); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`\n  Kinematika Studio\n  http://localhost:${port}\n\n  Zastaviť: Ctrl+C\n`));
