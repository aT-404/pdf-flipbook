'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';

interface Props {
  pdf: PDFDocumentProxy | null;
  pageNumber: number;
  zoom: number;
  shouldRender: boolean;
  onPageRendered?: () => void;
}

export function PdfPageCanvas({
  pdf,
  pageNumber,
  zoom,
  shouldRender,
  onPageRendered,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!pdf || !canvasRef.current || !shouldRender) return;

    let isMounted = true;
    setLoading(true);
    setError(false);

    const renderPage = async () => {
      try {
        const page = await pdf.getPage(pageNumber);
        if (!isMounted || !canvasRef.current) return;

        const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
        const unscaledViewport = page.getViewport({ scale: 1.0 });

        // Calculate container scale to fit standard page dimensions
        const baseScale = 1.2;
        const totalScale = baseScale * zoom * dpr;

        const viewport = page.getViewport({ scale: totalScale });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context) return;

        // Cancel previous render task if active
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width / dpr}px`;
        canvas.style.height = `${viewport.height / dpr}px`;

        const renderContext: any = {
          canvasContext: context,
          canvas: canvas,
          viewport,
        };

        const task = page.render(renderContext);
        renderTaskRef.current = task;

        await task.promise;

        if (isMounted) {
          setLoading(false);
          if (onPageRendered) onPageRendered();
        }
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error(`Page ${pageNumber} render error:`, err);
          if (isMounted) {
            setError(true);
            setLoading(false);
          }
        }
      }
    };

    renderPage();

    return () => {
      isMounted = false;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [pdf, pageNumber, zoom, shouldRender]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-white shadow-md overflow-hidden select-none">
      {shouldRender ? (
        <>
          <canvas ref={canvasRef} className="block max-w-full max-h-full object-contain" />
          {loading && (
            <div className="absolute inset-0 bg-neutral-100/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
              <div className="w-8 h-8 border-3 border-neutral-300 border-t-neutral-800 rounded-full animate-spin" />
              <span className="text-xs text-neutral-500 font-medium">Page {pageNumber}</span>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 bg-neutral-100 flex items-center justify-center text-xs text-red-500 font-medium">
              Failed to render page {pageNumber}
            </div>
          )}
        </>
      ) : (
        <div className="w-full h-full bg-neutral-50 flex items-center justify-center text-neutral-300 text-sm font-serif">
          {pageNumber}
        </div>
      )}
    </div>
  );
}
