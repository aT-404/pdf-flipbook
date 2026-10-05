// Copies the PDF.js support files (worker, fonts, character maps) and the
// page-flip browser build into
// public/pdfjs so the app works offline and always matches the installed
// PDF.js version. Runs automatically after "npm install" and before "build".
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'node_modules', 'pdfjs-dist');
const dest = path.join(root, 'public', 'pdfjs');

if (!fs.existsSync(src)) {
  console.error('pdfjs-dist is not installed yet. Run "npm install" first.');
  process.exit(1);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });
fs.copyFileSync(
  path.join(src, 'build', 'pdf.worker.min.mjs'),
  path.join(dest, 'pdf.worker.min.mjs')
);
// Extra files used only by the "Download as flipbook" export
fs.copyFileSync(path.join(src, 'build', 'pdf.min.mjs'), path.join(dest, 'pdf.min.mjs'));
const pageFlipFile = path.join(root, 'node_modules', 'page-flip', 'dist', 'js', 'page-flip.browser.js');
if (fs.existsSync(pageFlipFile)) {
  fs.copyFileSync(pageFlipFile, path.join(dest, 'page-flip.browser.js'));
}
for (const dir of ['cmaps', 'standard_fonts', 'wasm', 'iccs']) {
  if (fs.existsSync(path.join(src, dir))) {
    fs.cpSync(path.join(src, dir), path.join(dest, dir), { recursive: true });
  }
}
console.log('PDF.js support files are ready.');
