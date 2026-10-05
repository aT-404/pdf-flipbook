/**
 * Builds ONE self-contained HTML file that holds the PDF, PDF.js, the page-turn
 * library and the viewer. The file works by double-clicking it: no internet,
 * no app, no server.
 */

export interface ExportSettings {
  title: string;
  twoPages: boolean;
  coverAlone: boolean;
  soundOn: boolean;
}

function assetUrl(relativePath: string): string {
  return new URL(relativePath, document.baseURI).toString();
}

async function fetchBytes(relativePath: string): Promise<Uint8Array> {
  const response = await fetch(assetUrl(relativePath));
  if (!response.ok) throw new Error(`Missing file: ${relativePath}`);
  return new Uint8Array(await response.arrayBuffer());
}

async function fetchText(relativePath: string): Promise<string> {
  const response = await fetch(assetUrl(relativePath));
  if (!response.ok) throw new Error(`Missing file: ${relativePath}`);
  return response.text();
}

/** Bytes -> base64 text (safe for big arrays) */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return btoa(binary);
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Never let stored text close its own <script> tag
function safeInline(text: string): string {
  return text.replace(/<\/(script)/gi, '<\\/$1').replace(/<!--/g, '<\\!--');
}

export async function buildFlipbookBlob(
  file: File,
  settings: ExportSettings,
  onProgress: (fraction: number) => void
): Promise<Blob> {
  onProgress(0.02);
  const [css, viewerJs, pageFlipJs, pdfjsBytes, workerBytes] = await Promise.all([
    fetchText('export/viewer.css'),
    fetchText('export/viewer.js'),
    fetchText('pdfjs/page-flip.browser.js'),
    fetchBytes('pdfjs/pdf.min.mjs'),
    fetchBytes('pdfjs/pdf.worker.min.mjs'),
  ]);

  // Image decoders PDF.js may need (scanned pages, special image types)
  const wasmNames = ['openjpeg.wasm', 'jbig2.wasm', 'qcms_bg.wasm'];
  const files: Record<string, string> = {};
  for (const name of wasmNames) {
    files[`wasm/${name}`] = bytesToBase64(await fetchBytes(`pdfjs/wasm/${name}`));
  }
  onProgress(0.1);

  const config = JSON.stringify({
    title: settings.title,
    twoPages: settings.twoPages,
    coverAlone: settings.coverAlone,
    soundOn: settings.soundOn,
  }).replace(/</g, '\\u003c');

  const parts: BlobPart[] = [];
  parts.push(
    '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
      `<title>${escapeHtml(settings.title)}</title>\n` +
      `<style>\n${css}\n</style>\n</head>\n<body>\n<div id="app"></div>\n` +
      `<script id="fb-config" type="application/json">${config}</script>\n` +
      `<script id="fb-files" type="application/json">${JSON.stringify(files)}</script>\n` +
      `<script id="fb-pdfjs" type="text/plain">${bytesToBase64(pdfjsBytes)}</script>\n` +
      `<script id="fb-worker" type="text/plain">${bytesToBase64(workerBytes)}</script>\n` +
      '<script id="fb-pdf" type="text/plain">'
  );
  onProgress(0.2);

  // The PDF itself, in 3 MB pieces so very big files do not freeze the page
  const chunk = 3 * 1024 * 1024; // multiple of 3 keeps base64 pieces joinable
  for (let offset = 0; offset < file.size; offset += chunk) {
    const bytes = new Uint8Array(await file.slice(offset, offset + chunk).arrayBuffer());
    parts.push(bytesToBase64(bytes));
    onProgress(0.2 + 0.75 * Math.min(1, (offset + chunk) / file.size));
  }

  parts.push(
    '</script>\n' +
      `<script>\n${safeInline(pageFlipJs)}\n</script>\n` +
      `<script>\n${safeInline(viewerJs)}\n</script>\n</body>\n</html>\n`
  );
  onProgress(1);
  return new Blob(parts, { type: 'text/html' });
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function flipbookFileName(title: string): string {
  const clean = title.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'flipbook';
  return `${clean} (flipbook).html`;
}
