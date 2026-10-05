'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { PageFlip } from 'page-flip';
import { renderPageToCanvas } from '@/lib/pdf/pdf-utils';
import { playFlipSound } from '@/lib/flip-sound';

export interface FlipbookRef {
  next: () => void;
  prev: () => void;
  goTo: (page: number) => void;
}

interface Props {
  pdf: PDFDocumentProxy;
  totalPages: number;
  /** 1 = normal size. Changes the real size of the book. */
  zoom: number;
  /** true = two pages at a time, false = one page at a time */
  twoPages: boolean;
  /** true = page 1 stands alone like a book cover (then 2|3, 4|5 ...) */
  coverAlone: boolean;
  /** Play a page-turn sound */
  soundEnabled: boolean;
  /** Called with the number of the first visible page */
  onPageChange: (page: number) => void;
  /** Called once the first page is on screen */
  onReady: () => void;
}

// Only pages near the one being read are kept drawn (saves memory on big PDFs)
const KEEP_BEHIND = 2;
const KEEP_AHEAD = 4;

const CANVAS_STYLE =
  'display:block;width:100%;height:100%;object-fit:contain;background:#fff;';

function blankCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  canvas.style.cssText = CANVAS_STYLE;
  return canvas;
}

/**
 * IMPORTANT: page-flip moves and later DELETES the page elements it controls.
 * If React also owned those elements, the book would turn empty after the
 * first restart. So React renders only ONE empty host <div>; the book, the
 * pages and the canvases inside it are made with plain DOM code.
 */
export const FlipbookViewer = forwardRef<FlipbookRef, Props>(function FlipbookViewer(
  { pdf, totalPages, zoom, twoPages, coverAlone, soundEnabled, onPageChange, onReady },
  ref
) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const pageFlipRef = useRef<PageFlip | null>(null);
  const indexRef = useRef(0); // 0-based index of the page shown first
  const syncRef = useRef<() => void>(() => {});
  const refreshRef = useRef<() => void>(() => {});
  const onPageChangeRef = useRef(onPageChange);
  const onReadyRef = useRef(onReady);
  const soundRef = useRef(soundEnabled);

  useEffect(() => {
    onPageChangeRef.current = onPageChange;
    onReadyRef.current = onReady;
    soundRef.current = soundEnabled;
  }, [onPageChange, onReady, soundEnabled]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || totalPages < 1) return;

    let cancelled = false;
    let pageFlip: PageFlip | null = null;
    let releaseHandler: (() => void) | null = null;
    let ratio = 1.414; // page height / page width
    const slots: HTMLCanvasElement[] = [];
    const drawn = new Map<number, number>(); // page -> pixel width it was drawn at
    const jobs = new Map<number, { width: number; cancel: () => void }>();

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // How many pixels wide a page should be drawn so it looks sharp but not heavy
    const wantedWidth = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const columns = twoPages ? 2 : 1;
      const availableWidth = Math.max(200, host.clientWidth - 24);
      const availableHeight = Math.max(200, host.clientHeight - 136);
      const cssWidth = Math.min(availableWidth / columns, availableHeight / ratio);
      return Math.round(Math.min(1800, Math.max(600, cssWidth * dpr)));
    };

    const swapCanvas = (pageNumber: number, next: HTMLCanvasElement) => {
      const old = slots[pageNumber - 1];
      if (!old) return;
      next.style.cssText = CANVAS_STYLE;
      old.replaceWith(next);
      old.width = 0; // lets the browser free the memory
      old.height = 0;
      slots[pageNumber - 1] = next;
    };

    const drawPage = (pageNumber: number): Promise<void> => {
      const want = wantedWidth();
      const have = drawn.get(pageNumber);
      if (have && have >= want * 0.8 && have <= want * 1.6) return Promise.resolve();

      const running = jobs.get(pageNumber);
      if (running) {
        if (Math.abs(running.width - want) / want < 0.2) return Promise.resolve();
        running.cancel();
      }

      const job = renderPageToCanvas(pdf, pageNumber, want);
      jobs.set(pageNumber, { width: want, cancel: job.cancel });
      return job.promise
        .then((canvas) => {
          if (cancelled || !canvas) return;
          swapCanvas(pageNumber, canvas);
          drawn.set(pageNumber, want);
        })
        .catch((err) => {
          console.error(`Could not draw page ${pageNumber}:`, err);
        })
        .finally(() => {
          if (jobs.get(pageNumber)?.cancel === job.cancel) jobs.delete(pageNumber);
        });
    };

    const updateVisiblePages = (current: number): Promise<void> => {
      const min = Math.max(1, current - KEEP_BEHIND);
      const max = Math.min(totalPages, current + KEEP_AHEAD);

      const order: number[] = [];
      for (let p = min; p <= max; p++) order.push(p);
      order.sort((a, b) => Math.abs(a - current) - Math.abs(b - current));
      const firstPromises = order.map((p) => drawPage(p));

      // Free pages that are far away
      for (const p of [...drawn.keys()]) {
        if (p < min - 2 || p > max + 2) {
          swapCanvas(p, blankCanvas());
          drawn.delete(p);
        }
      }
      for (const [p, job] of jobs) {
        if (p < min - 2 || p > max + 2) {
          job.cancel();
          jobs.delete(p);
        }
      }
      return Promise.all(firstPromises.slice(0, 2)).then(() => undefined);
    };

    // Two-page spreads: with a lone cover they are [1] [2|3] [4|5] ... so the first
    // visible page has an odd 0-based index. Without a lone cover they are
    // [1|2] [3|4] ... so it has an even 0-based index.
    const toFirstVisible = (index: number) => {
      if (!twoPages) return index;
      if (coverAlone) return index > 0 && index % 2 === 0 ? index - 1 : index;
      return index % 2 === 1 ? index - 1 : index;
    };

    const report = (index?: number) => {
      if (!pageFlip) return;
      const idx = toFirstVisible(
        typeof index === 'number' ? index : pageFlip.getCurrentPageIndex()
      );
      indexRef.current = idx;
      onPageChangeRef.current(idx + 1);
      void updateVisiblePages(idx + 1);
    };

    const init = async () => {
      try {
        const firstPage = await pdf.getPage(1);
        const viewport = firstPage.getViewport({ scale: 1 });
        ratio = Math.min(3.5, Math.max(0.3, viewport.height / viewport.width));

        const { PageFlip } = await import('page-flip');
        if (cancelled) return;

        host.replaceChildren();
        const book = document.createElement('div');
        book.style.cssText = 'width:100%;height:100%;';
        host.appendChild(book);

        // The last page stands alone when the pages do not pair up evenly.
        // A lone first or last page becomes a hard cover.
        const lastIsAlone = coverAlone ? totalPages % 2 === 0 : totalPages % 2 === 1;
        const pageElements: HTMLElement[] = [];
        for (let n = 1; n <= totalPages; n++) {
          const el = document.createElement('div');
          el.className = 'page-item';
          const hard = (coverAlone && n === 1) || (n === totalPages && lastIsAlone);
          el.setAttribute('data-density', hard ? 'hard' : 'soft');
          el.style.cssText = 'background:#fff;overflow:hidden;';
          const canvas = blankCanvas();
          el.appendChild(canvas);
          slots.push(canvas);
          pageElements.push(el);
        }

        const startIndex = toFirstVisible(
          Math.min(Math.max(0, indexRef.current), totalPages - 1)
        );
        const baseWidth = 500;
        pageFlip = new PageFlip(book, {
          width: baseWidth,
          height: Math.round(baseWidth * ratio),
          size: 'stretch',
          // page-flip decides one page vs two pages by itself using minWidth.
          // We want to decide, so in one-page mode minWidth is set huge here and
          // its side effect (a wide minimum box) is undone right after loading.
          // In two-page mode a small value lets two pages fit on a phone.
          minWidth: twoPages ? 100 : 5000,
          maxWidth: 1600,
          minHeight: 200,
          maxHeight: 2600,
          maxShadowOpacity: 0.5,
          showCover: coverAlone,
          mobileScrollSupport: false, // swiping turns pages instead of scrolling
          usePortrait: !twoPages, // follows the "View" setting
          useMouseEvents: true,
          swipeDistance: 30,
          clickEventForward: false,
          startPage: startIndex,
          drawShadow: !reducedMotion,
          flippingTime: reducedMotion ? 0 : 750,
        });

        pageFlip.loadFromHTML(pageElements);
        book.style.minWidth = '0px';
        pageFlipRef.current = pageFlip;
        // 'flipping' = the page is turning now (button, key, swipe or drag)
        // A button, key or quick swipe says 'flipping' right away. A slower drag
        // only turns when the finger or mouse is released, so we also listen for that.
        let dragging = false;
        pageFlip.on('changeState', (e) => {
          if (e.data === 'user_fold') dragging = true;
          else if (e.data === 'read') dragging = false;
          else if (e.data === 'flipping' && soundRef.current) playFlipSound();
        });
        releaseHandler = () => {
          if (dragging && soundRef.current) playFlipSound();
          dragging = false;
        };
        window.addEventListener('pointerup', releaseHandler);
        pageFlip.on('flip', (e) => report(typeof e.data === 'number' ? e.data : undefined));

        syncRef.current = () => report();
        refreshRef.current = () => {
          pageFlip?.update();
          void updateVisiblePages(indexRef.current + 1);
        };

        onPageChangeRef.current(startIndex + 1);
        await updateVisiblePages(startIndex + 1);
        if (!cancelled) onReadyRef.current();
      } catch (err) {
        console.error('Could not start the flipbook:', err);
        if (!cancelled) onReadyRef.current();
      }
    };

    void init();

    return () => {
      cancelled = true;
      if (releaseHandler) window.removeEventListener('pointerup', releaseHandler);
      jobs.forEach((job) => job.cancel());
      jobs.clear();
      try {
        pageFlip?.destroy();
      } catch {
        /* already gone */
      }
      pageFlipRef.current = null;
      syncRef.current = () => {};
      refreshRef.current = () => {};
      host.replaceChildren();
    };
  }, [pdf, totalPages, twoPages, coverAlone]);

  // When zoom changes the host gets a new size: re-measure, re-center, redraw sharper
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      refreshRef.current();
      const scroller = scrollRef.current;
      if (scroller) {
        scroller.scrollLeft = (scroller.scrollWidth - scroller.clientWidth) / 2;
        scroller.scrollTop = (scroller.scrollHeight - scroller.clientHeight) / 2;
      }
    });
    const later = window.setTimeout(() => refreshRef.current(), 250);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(later);
    };
  }, [zoom]);

  useImperativeHandle(ref, () => ({
    next: () => pageFlipRef.current?.flipNext(),
    prev: () => pageFlipRef.current?.flipPrev(),
    goTo: (page: number) => {
      const pf = pageFlipRef.current;
      if (!pf) return;
      const target = Math.max(0, Math.min(totalPages - 1, page - 1));
      const current = pf.getCurrentPageIndex();
      if (target === current) return;
      if (Math.abs(target - current) > 3) {
        pf.turnToPage(target); // far away: jump instead of a long animation
        syncRef.current();
      } else {
        pf.flip(target);
      }
    },
  }));

  return (
    <div ref={scrollRef} className="w-full h-full overflow-auto select-none flex">
      <div
        ref={hostRef}
        className="shrink-0 m-auto"
        style={{
          width: `${zoom * 100}%`,
          height: `${zoom * 100}%`,
          padding: '56px 12px 80px', // room for the top bar and the toolbar
          boxSizing: 'border-box',
          touchAction: 'pan-y',
        }}
      />
    </div>
  );
});
