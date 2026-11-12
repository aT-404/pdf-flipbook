import type { PDFDocumentProxy } from 'pdfjs-dist';
import { renderPageToCanvas } from '@/lib/pdf/pdf-utils';

/**
 * Builds ONE self-contained HTML file with every page pre-rendered as an image
 * alongside the page-turn library and viewer. Opens offline with instant page jumps.
 */

export interface ExportSettings {
  title: string;
  twoPages: boolean;
  coverAlone: boolean;
  soundOn: boolean;
  coverDataUrl?: string;
}

function assetUrl(relativePath: string): string {
  return new URL(relativePath, document.baseURI).toString();
}

async function fetchText(relativePath: string): Promise<string> {
  const response = await fetch(assetUrl(relativePath));
  if (!response.ok) throw new Error(`Missing file: ${relativePath}`);
  return response.text();
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Never let stored text close its own <script> tag
function safeInline(text: string): string {
  return text.replace(/<\/(script)/gi, '<\\/$1').replace(/<!--/g, '<\\!--');
}

export async function buildFlipbookBlob(
  pdf: PDFDocumentProxy,
  settings: ExportSettings,
  onProgress: (fraction: number) => void
): Promise<Blob> {
  onProgress(0.02);
  const [css, viewerJs, pageFlipJs, firstPage] = await Promise.all([
    fetchText('export/viewer.css'),
    fetchText('export/viewer.js'),
    fetchText('pdfjs/page-flip.browser.js'),
    pdf.getPage(1),
  ]);
  const viewport = firstPage.getViewport({ scale: 1 });
  const ratio = Math.min(3.5, Math.max(0.3, viewport.height / viewport.width));
  onProgress(0.06);

  const total = pdf.numPages;
  const pageDataUrls: string[] = [];
  for (let n = 1; n <= total; n++) {
    const canvas = await renderPageToCanvas(pdf, n, 1200).promise;
    if (!canvas) throw new Error(`Failed to render page ${n}`);
    pageDataUrls.push(canvas.toDataURL('image/jpeg', 0.85));
    canvas.width = 0;
    canvas.height = 0;
    onProgress(0.06 + 0.9 * (n / total));
  }

  const config = JSON.stringify({
    title: settings.title,
    twoPages: settings.twoPages,
    coverAlone: settings.coverAlone,
    soundOn: settings.soundOn,
    ratio,
  }).replace(/</g, '\\u003c');

  const safeTitle = escapeHtml(settings.title);
  const coverHeadTags = settings.coverDataUrl
    ? `<link rel="icon" type="image/jpeg" href="${settings.coverDataUrl}">\n` +
      `<meta property="og:title" content="${safeTitle}">\n` +
      '<meta property="og:description" content="Interactive PDF Flipbook">\n' +
      `<meta property="og:image" content="${settings.coverDataUrl}">\n` +
      '<meta name="twitter:card" content="summary_large_image">\n' +
      `<meta name="twitter:image" content="${settings.coverDataUrl}">\n`
    : `<meta property="og:title" content="${safeTitle}">\n` +
      '<meta property="og:description" content="Interactive PDF Flipbook">\n';

  const parts: BlobPart[] = [
    '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
      `<title>${safeTitle}</title>\n` +
      coverHeadTags +
      `<style>\n${css}\n</style>\n</head>\n<body>\n<div id="app"></div>\n` +
      `<script id="fb-config" type="application/json">${config}</script>\n` +
      `<script id="fb-pages" type="application/json">${JSON.stringify(pageDataUrls)}</script>\n` +
      `<script>\n${safeInline(pageFlipJs)}\n</script>\n` +
      `<script>\n${safeInline(viewerJs)}\n</script>\n</body>\n</html>\n`,
  ];
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

export function coverFileName(title: string): string {
  const clean = title.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'flipbook';
  return `${clean} (cover).jpg`;
}
