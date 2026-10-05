import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';

type PdfJs = typeof import('pdfjs-dist');

let pdfjsPromise: Promise<PdfJs> | null = null;

// Files in /public/pdfjs are copied there by scripts/copy-pdfjs-assets.mjs
function assetUrl(relativePath: string): string {
  return new URL(relativePath, document.baseURI).toString();
}

function loadPdfJs(): Promise<PdfJs> {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = assetUrl('pdfjs/pdf.worker.min.mjs');
      return lib;
    });
  }
  return pdfjsPromise;
}

class PasswordCancelled extends Error {
  constructor() {
    super('This PDF is locked with a password, and no password was entered.');
  }
}

/** Opens a PDF chosen by the person. Everything stays inside the browser. */
export async function openPdfFile(file: File): Promise<PDFDocumentProxy> {
  const pdfjs = await loadPdfJs();
  const data = new Uint8Array(await file.arrayBuffer());

  const task = pdfjs.getDocument({
    data,
    cMapUrl: assetUrl('pdfjs/cmaps/'),
    cMapPacked: true,
    standardFontDataUrl: assetUrl('pdfjs/standard_fonts/'),
    wasmUrl: assetUrl('pdfjs/wasm/'),
    iccUrl: assetUrl('pdfjs/iccs/'),
  });

  let cancelled = false;
  task.onPassword = (updatePassword: (password: string) => void, reason: number) => {
    const text =
      reason === 2
        ? 'That password was not correct. Try again:'
        : 'This PDF is locked. Please type its password:';
    const password = window.prompt(text);
    if (password === null) {
      cancelled = true;
      void task.destroy();
    } else {
      updatePassword(password);
    }
  };

  try {
    return await task.promise;
  } catch (err) {
    if (cancelled) throw new PasswordCancelled();
    throw err;
  }
}

/** Turns a technical PDF error into a simple sentence. */
export function explainPdfError(err: unknown): string {
  const name = (err as { name?: string } | null)?.name;
  if (err instanceof PasswordCancelled) return err.message;
  if (name === 'InvalidPDFException') {
    return 'This file could not be opened as a PDF. It may be damaged, or it may not be a PDF file.';
  }
  if (name === 'PasswordException') {
    return 'This PDF is locked with a password that was not accepted.';
  }
  return 'Sorry, this PDF could not be opened. Please try a different file.';
}

export interface RenderJob {
  promise: Promise<HTMLCanvasElement | null>;
  cancel: () => void;
}

/**
 * Draws one PDF page onto a new canvas that is `targetWidth` pixels wide.
 * Resolves to null if the job was cancelled.
 */
export function renderPageToCanvas(
  pdf: PDFDocumentProxy,
  pageNumber: number,
  targetWidth: number
): RenderJob {
  let cancelled = false;
  let cancelRender: (() => void) | null = null;

  const promise = (async () => {
    const page: PDFPageProxy = await pdf.getPage(pageNumber);
    if (cancelled) return null;

    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: targetWidth / base.width });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const context = canvas.getContext('2d');
    if (!context) return null;
    // PDF pages are transparent; paint white paper first
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    const task = page.render({ canvasContext: context, canvas, viewport });
    cancelRender = () => task.cancel();
    try {
      await task.promise;
    } catch (err) {
      if ((err as { name?: string })?.name === 'RenderingCancelledException') return null;
      throw err;
    } finally {
      page.cleanup();
    }
    return cancelled ? null : canvas;
  })();

  return {
    promise,
    cancel: () => {
      cancelled = true;
      cancelRender?.();
    },
  };
}
