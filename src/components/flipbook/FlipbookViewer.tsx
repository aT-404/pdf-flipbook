'use client';

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { PdfPageCanvas } from './PdfPageCanvas';
import { useMediaQuery } from '@/hooks/use-media-query';

export interface FlipbookRef {
  nextPage: () => void;
  prevPage: () => void;
  flipToPage: (page: number) => void;
}

interface Props {
  pdf: PDFDocumentProxy;
  totalPages: number;
  zoom: number;
  onPageChange?: (page: number) => void;
}

export const FlipbookViewer = forwardRef<FlipbookRef, Props>(function FlipbookViewer(
  { pdf, totalPages, zoom, onPageChange },
  ref
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bookRef = useRef<HTMLDivElement | null>(null);
  const pageFlipInstance = useRef<any>(null);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Range of adjacent pages to keep rendered in memory
  const getRenderRange = (page: number) => {
    const min = Math.max(1, page - 3);
    const max = Math.min(totalPages, page + 4);
    return { min, max };
  };

  const [renderRange, setRenderRange] = useState(getRenderRange(1));

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const media = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(media.matches);
    }
  }, []);

  // Initialize PageFlip instance
  useEffect(() => {
    if (!bookRef.current || totalPages === 0) return;

    let isMounted = true;

    const initFlipbook = async () => {
      try {
        const { PageFlip } = await import('page-flip');

        if (!isMounted || !bookRef.current) return;

        // Destroy previous instance if exists
        if (pageFlipInstance.current) {
          try {
            pageFlipInstance.current.destroy();
          } catch (e) {}
        }

        const width = isDesktop ? 480 : 360;
        const height = isDesktop ? 680 : 540;

        const pageFlip = new PageFlip(bookRef.current, {
          width,
          height,
          size: 'stretch',
          minWidth: 280,
          maxWidth: 900,
          minHeight: 400,
          maxHeight: 1200,
          maxShadowOpacity: 0.4,
          showCover: true,
          mobileScrollSupport: false,
          usePortrait: !isDesktop,
          startPage: 0,
          drawShadow: !prefersReducedMotion,
          flippingTime: prefersReducedMotion ? 0 : 700,
        });

        const pageElements = bookRef.current.querySelectorAll('.page-item');
        if (pageElements.length > 0) {
          pageFlip.loadFromHTML(pageElements as any);
        }

        pageFlip.on('flip', (e: any) => {
          const newPageIndex = e.data + 1; // 1-indexed
          setCurrentPage(newPageIndex);
          setRenderRange(getRenderRange(newPageIndex));
          if (onPageChange) onPageChange(newPageIndex);
        });

        pageFlipInstance.current = pageFlip;
      } catch (err) {
        console.error('Failed to initialize PageFlip engine:', err);
      }
    };

    initFlipbook();

    return () => {
      isMounted = false;
      if (pageFlipInstance.current) {
        try {
          pageFlipInstance.current.destroy();
          pageFlipInstance.current = null;
        } catch (e) {}
      }
    };
  }, [totalPages, isDesktop, prefersReducedMotion]);

  // Imperative handle for parent toolbar buttons
  useImperativeHandle(ref, () => ({
    nextPage: () => {
      if (pageFlipInstance.current) {
        pageFlipInstance.current.flipNext();
      } else {
        const next = Math.min(totalPages, currentPage + (isDesktop ? 2 : 1));
        setCurrentPage(next);
        if (onPageChange) onPageChange(next);
      }
    },
    prevPage: () => {
      if (pageFlipInstance.current) {
        pageFlipInstance.current.flipPrev();
      } else {
        const prev = Math.max(1, currentPage - (isDesktop ? 2 : 1));
        setCurrentPage(prev);
        if (onPageChange) onPageChange(prev);
      }
    },
    flipToPage: (pageNumber: number) => {
      const target = Math.max(1, Math.min(totalPages, pageNumber));
      if (pageFlipInstance.current) {
        pageFlipInstance.current.flip(target - 1);
      }
      setCurrentPage(target);
      setRenderRange(getRenderRange(target));
      if (onPageChange) onPageChange(target);
    },
  }));

  const pagesArray = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center relative overflow-hidden select-none p-4"
      style={{
        transform: `scale(${zoom})`,
        transformOrigin: 'center center',
        transition: 'transform 0.2s ease-out',
      }}
    >
      <div
        ref={bookRef}
        className="flipbook-wrapper shadow-2xl rounded-sm transition-shadow duration-300"
      >
        {pagesArray.map((pageNum) => {
          const shouldRender = pageNum >= renderRange.min && pageNum <= renderRange.max;
          const isHardCover = pageNum === 1 || pageNum === totalPages;

          return (
            <div
              key={pageNum}
              className={`page-item page-${pageNum} ${
                isHardCover ? 'page-hard' : ''
              } bg-white shadow-inner relative overflow-hidden`}
              data-density={isHardCover ? 'hard' : 'soft'}
            >
              <PdfPageCanvas
                pdf={pdf}
                pageNumber={pageNum}
                zoom={1.0}
                shouldRender={shouldRender}
              />
              <div className="absolute bottom-2 right-3 text-[10px] text-neutral-400 font-mono select-none pointer-events-none">
                {pageNum}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
