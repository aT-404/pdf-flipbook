// One-command launcher: prepares the app (first time only) and opens it.
//   npm start
// Add --no-open to skip opening the browser automatically.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'out');
const shouldOpen = !process.argv.includes('--no-open') && !process.env.NO_OPEN;

function fail(message) {
  console.log('\n  ' + message.split('\n').join('\n  ') + '\n');
  process.exit(1);
}

// 1) Node version check
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 20 || (major === 20 && minor < 9)) {
  fail(
    `Your Node.js is too old (version ${process.versions.node}).\n` +
      'Please install the newest "LTS" version from https://nodejs.org and try again.'
  );
}

// 2) Build the app if it was never built, or if the code changed
function newestModified(target) {
  let newest = 0;
  const stat = fs.statSync(target);
  if (stat.isDirectory()) {
    for (const name of fs.readdirSync(target)) {
      if (name === 'pdfjs' || name === 'node_modules') continue;
      newest = Math.max(newest, newestModified(path.join(target, name)));
    }
  } else {
    newest = stat.mtimeMs;
  }
  return newest;
}

function needsBuild() {
  const marker = path.join(outDir, 'index.html');
  if (!fs.existsSync(marker)) return true;
  const built = fs.statSync(marker).mtimeMs;
  const inputs = ['src', 'public', 'package.json', 'next.config.ts'].map((p) =>
    path.join(root, p)
  );
  return inputs.some((p) => fs.existsSync(p) && newestModified(p) > built);
}

if (needsBuild()) {
  console.log('\n  Preparing the app. This only happens the first time (about 1 minute)...\n');
  const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1' };
  const copy = spawnSync(process.execPath, [path.join(root, 'scripts', 'copy-pdfjs-assets.mjs')], {
    cwd: root,
    stdio: 'inherit',
    env,
  });
  const nextBin = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');
  const build =
    copy.status === 0 && fs.existsSync(nextBin)
      ? spawnSync(process.execPath, [nextBin, 'build'], { cwd: root, stdio: 'inherit', env })
      : { status: 1 };
  if (build.status !== 0) {
    fail(
      'Something went wrong while preparing the app.\n' +
        'Please take a screenshot of this window and send it to the person who shared this with you.'
    );
  }
}

// 3) Tiny web server for the "out" folder
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
  '.map': 'application/json',
};

const server = http.createServer((req, res) => {
  try {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    let file = path.normalize(path.join(outDir, urlPath));
    if (!file.startsWith(outDir)) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file) && fs.existsSync(file + '.html')) file += '.html';
    if (!fs.existsSync(file)) {
      const notFound = path.join(outDir, '404.html');
      res.writeHead(404, { 'Content-Type': MIME['.html'] });
      res.end(fs.existsSync(notFound) ? fs.readFileSync(notFound) : 'Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(file).pipe(res);
  } catch {
    res.writeHead(500).end('Server error');
  }
});

function openBrowser(url) {
  try {
    const opts = { stdio: 'ignore', detached: true };
    let child;
    if (process.platform === 'win32') child = spawn('cmd', ['/c', 'start', '', url], opts);
    else if (process.platform === 'darwin') child = spawn('open', [url], opts);
    else child = spawn('xdg-open', [url], opts);
    child.on('error', () => {});
    child.unref();
  } catch {
    /* the link is printed below anyway */
  }
}

let port = Number(process.env.PORT) || 3000;
const lastPort = port + 10;

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE' && port < lastPort) {
    port += 1;
    server.listen(port, '127.0.0.1');
  } else {
    fail('Could not start the app: ' + err.message);
  }
});

server.on('listening', () => {
  const url = `http://localhost:${port}`;
  console.log('\n  ============================================================');
  console.log('    PDF Flipbook is running!');
  console.log('');
  console.log(`    Open this address in your browser:  ${url}`);
  console.log('');
  console.log('    Keep this window open while you read.');
  console.log('    To stop the app, close this window (or press Ctrl+C).');
  console.log('  ============================================================\n');
  if (shouldOpen) openBrowser(url);
});

server.listen(port, '127.0.0.1');
