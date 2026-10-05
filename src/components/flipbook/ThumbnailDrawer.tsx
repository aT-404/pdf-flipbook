'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { renderPageToCanvas } from '@/lib/pdf/pdf-utils';

interface Props {
  isOpen: boolean;
  pdf: PDFDocumentProxy;
  totalPages: number;
  currentPage: number;
  onClose: () => void;
  onSelectPage: (page: number) => void;
}

/** One small preview. It is drawn only when it scrolls into view. */
function Thumbnail({
  pdf,
  pageNumber,
  scroller,
}: {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  scroller: HTMLDivElement | null;
}) {
  const holder = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = holder.current;
    if (!element || !scroller) return;
    let job: ReturnType<typeof renderPageToCanvas> | null = null;
    let started = false;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || started) return;
        started = true;
        observer.disconnect();
        job = renderPageToCanvas(pdf, pageNumber, 260);
        job.promise
          .then((canvas) => {
            if (!canvas || !holder.current) return;
            canvas.style.cssText = 'display:block;width:100%;height:100%;object-fit:contain;';
            holder.current.replaceChildren(canvas);
          })
          .catch(() => {});
      },
      { root: scroller, rootMargin: '400px' }
    );
    observer.observe(element);

    return () => {
      observer.disconnect();
      job?.cancel();
    };
  }, [pdf, pageNumber, scroller]);

  return <div ref={holder} className="absolute inset-0 bg-white" />;
}

export function ThumbnailDrawer({
  isOpen,
  pdf,
  totalPages,
  currentPage,
  onClose,
  onSelectPage,
}: Props) {
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Scroll the current page into view when the drawer opens
  useEffect(() => {
    if (!isOpen || !scroller) return;
    scroller
      .querySelector<HTMLElement>(`[data-page="${currentPage}"]`)
      ?.scrollIntoView({ block: 'center' });
    // only when opening
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, scroller]);

  if (!isOpen) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto w-80 max-w-full h-full bg-neutral-900 border-l border-neutral-800 shadow-2xl flex flex-col z-10 text-white">
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-200">All pages ({totalPages})</h3>
          <button
            onClick={onClose}
            title="Close"
            className="p-1 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div ref={setScroller} className="flex-1 overflow-y-auto p-4 flex flex-wrap gap-3 content-start">
          {pages.map((pageNumber) => (
            <button
              key={pageNumber}
              data-page={pageNumber}
              onClick={() => {
                onSelectPage(pageNumber);
                onClose();
              }}
              className={`group relative block w-[calc(50%-6px)] shrink-0 bg-neutral-800 rounded-lg overflow-hidden border-2 transition-all ${
                pageNumber === currentPage
                  ? 'border-amber-500'
                  : 'border-transparent hover:border-neutral-600'
              }`}
            >
              {/* spacer: gives the box a 3:4 shape */}
              <div className="pt-[133.33%]" />
              <Thumbnail pdf={pdf} pageNumber={pageNumber} scroller={scroller} />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 text-center">
                <span className="text-[11px] font-mono text-neutral-200">{pageNumber}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
