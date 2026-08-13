export interface PdfMetadata {
  pageCount: number;
  coverBlob: Blob | null;
}

/**
 * Dynamically import PDF.js library only in browser environment to prevent SSR DOMMatrix errors
 */
async function getPdfJsLib() {
  if (typeof window === 'undefined') {
    throw new Error('PDF.js can only be executed in client browser environment.');
  }

  const pdfjsLib = await import('pdfjs-dist');

  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  }

  return pdfjsLib;
}

/**
 * Validate PDF magic bytes (%PDF- header signature) to prevent renamed non-PDF uploads
 */
export function validatePdfHeader(headerBytes: Uint8Array): boolean {
  if (headerBytes.length < 5) return false;
  // Check '%PDF-' signature: 0x25, 0x50, 0x44, 0x46, 0x2D
  return (
    headerBytes[0] === 0x25 &&
    headerBytes[1] === 0x50 &&
    headerBytes[2] === 0x44 &&
    headerBytes[3] === 0x46 &&
    headerBytes[4] === 0x2d
  );
}

/**
 * Load PDF file in browser using PDF.js and render page 1 to extract a cover image thumbnail blob.
 */
export async function extractPdfMetadata(file: File): Promise<PdfMetadata> {
  if (file.size === 0) {
    throw new Error('The selected file is empty (0 bytes). Please upload a valid PDF document.');
  }

  const arrayBuffer = await file.arrayBuffer();
  const headerBytes = new Uint8Array(arrayBuffer.slice(0, 5));

  if (!validatePdfHeader(headerBytes)) {
    throw new Error(
      'Invalid PDF header structure. The file is corrupted or is not a valid PDF document.'
    );
  }

  const pdfjsLib = await getPdfJsLib();

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
    cMapPacked: true,
  });

  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;

  if (pageCount === 0) {
    throw new Error('The uploaded PDF contains no readable pages.');
  }

  let coverBlob: Blob | null = null;

  try {
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.0 });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    // Scale canvas for good cover resolution (e.g. max width 600px)
    const scale = Math.min(600 / viewport.width, 2.0);
    const scaledViewport = page.getViewport({ scale });

    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;

    if (context) {
      await page.render({
        canvasContext: context,
        canvas: canvas,
        viewport: scaledViewport,
      } as any).promise;

      coverBlob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/webp', 0.85);
      });
    }
  } catch (err) {
    console.warn('Failed to render PDF first page cover thumbnail:', err);
  }

  return {
    pageCount,
    coverBlob,
  };
}

/**
 * Load a PDF document from URL or ArrayBuffer
 */
export async function getPdfDocument(src: string | ArrayBuffer) {
  const pdfjsLib = await getPdfJsLib();

  const loadingTask = pdfjsLib.getDocument(
    typeof src === 'string'
      ? {
          url: src,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
          cMapPacked: true,
        }
      : {
          data: new Uint8Array(src),
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
          cMapPacked: true,
        }
  );

  return await loadingTask.promise;
}
