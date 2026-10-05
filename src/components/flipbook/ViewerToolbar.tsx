'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  LayoutGrid,
  RotateCcw,
  BookOpen,
  Check,
  Volume2,
} from 'lucide-react';

interface Props {
  currentPage: number;
  totalPages: number;
  /** Text such as "4–5" or "7" */
  pageLabel: string;
  zoom: number;
  minZoom: number;
  maxZoom: number;
  isFullscreen: boolean;
  canFullscreen: boolean;
  twoPages: boolean;
  coverAlone: boolean;
  soundOn: boolean;
  onSetSoundOn: (soundOn: boolean) => void;
  onSetTwoPages: (twoPages: boolean) => void;
  onSetCoverAlone: (coverAlone: boolean) => void;
  onPrev: () => void;
  onNext: () => void;
  onJumpToPage: (page: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onToggleFullscreen: () => void;
  onToggleThumbnails: () => void;
}

const iconButton =
  'p-2 hover:bg-neutral-800 rounded-lg text-neutral-300 hover:text-white disabled:opacity-40 disabled:hover:bg-transparent transition-colors';

export function ViewerToolbar({
  currentPage,
  totalPages,
  pageLabel,
  zoom,
  minZoom,
  maxZoom,
  isFullscreen,
  canFullscreen,
  twoPages,
  coverAlone,
  soundOn,
  onSetSoundOn,
  onSetTwoPages,
  onSetCoverAlone,
  onPrev,
  onNext,
  onJumpToPage,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onToggleFullscreen,
  onToggleThumbnails,
}: Props) {
  const [visible, setVisible] = useState(true);
  const [jumping, setJumping] = useState(false);
  const [jumpValue, setJumpValue] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBoxRef = useRef<HTMLDivElement | null>(null);
  const jumpingRef = useRef(false);
  const hideTimer = useRef<number | undefined>(undefined);

  // The toolbar must not hide while the jump box or the View menu is open
  useEffect(() => {
    jumpingRef.current = jumping || menuOpen;
  }, [jumping, menuOpen]);

  // Close the View menu when clicking outside it, or pressing Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!menuBoxRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  // Hide the toolbar while reading, show it again on any movement
  const wake = useCallback(() => {
    setVisible(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (!jumpingRef.current) setVisible(false);
    }, 4000);
  }, []);

  useEffect(() => {
    // start the first countdown (the toolbar is visible at the start)
    hideTimer.current = window.setTimeout(() => {
      if (!jumpingRef.current) setVisible(false);
    }, 4000);
    const events = ['pointermove', 'pointerdown', 'keydown'] as const;
    events.forEach((name) => window.addEventListener(name, wake));
    return () => {
      window.clearTimeout(hideTimer.current);
      events.forEach((name) => window.removeEventListener(name, wake));
    };
  }, [wake]);

  const submitJump = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(jumpValue, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) onJumpToPage(page);
    setJumping(false);
  };

  return (
    <div
      className={`fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-0.75rem)] transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'
      }`}
    >
      <div className="bg-neutral-900/95 backdrop-blur-md border border-neutral-800 rounded-2xl shadow-2xl px-2 sm:px-3 py-1.5 flex items-center gap-1 sm:gap-2 whitespace-nowrap text-neutral-200 text-xs font-medium">
        <button onClick={onToggleThumbnails} title="See all pages" className={iconButton}>
          <LayoutGrid className="w-4 h-4" />
        </button>

        <div className="hidden sm:block w-px h-4 bg-neutral-700" />

        <button
          onClick={onPrev}
          disabled={currentPage <= 1}
          title="Previous page (Left arrow key)"
          className={iconButton}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {jumping ? (
          <form onSubmit={submitJump} className="flex items-center gap-1">
            <input
              autoFocus
              onFocus={(e) => e.target.select()}
              type="number"
              min={1}
              max={totalPages}
              value={jumpValue}
              onChange={(e) => setJumpValue(e.target.value)}
              onBlur={() => setJumping(false)}
              className="w-14 bg-neutral-800 border border-neutral-700 rounded-md px-1.5 py-1 text-center text-white outline-none focus:border-amber-500"
            />
            <span className="text-neutral-500">/ {totalPages}</span>
          </form>
        ) : (
          <button
            onClick={() => {
              setJumpValue(String(currentPage));
              setJumping(true);
            }}
            title="Go to a page"
            className="px-2 py-1 rounded-lg hover:bg-neutral-800 min-w-[72px] sm:min-w-[84px] text-center"
          >
            Page {pageLabel} <span className="text-neutral-500 font-normal">/ {totalPages}</span>
          </button>
        )}

        <button
          onClick={onNext}
          disabled={currentPage >= totalPages}
          title="Next page (Right arrow key)"
          className={iconButton}
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <div className="hidden sm:block w-px h-4 bg-neutral-700" />

        <button onClick={onZoomOut} disabled={zoom <= minZoom} title="Zoom out" className={iconButton}>
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="hidden sm:inline-block w-10 text-center font-mono text-[11px] text-neutral-400">
          {Math.round(zoom * 100)}%
        </span>
        <button onClick={onZoomIn} disabled={zoom >= maxZoom} title="Zoom in" className={iconButton}>
          <ZoomIn className="w-4 h-4" />
        </button>
        {zoom !== 1 && (
          <button onClick={onResetZoom} title="Back to 100%" className={iconButton}>
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}

        <div className="hidden sm:block w-px h-4 bg-neutral-700" />

        <div ref={menuBoxRef} className="relative">
          <button
            onClick={() => setMenuOpen((open) => !open)}
            title="How many pages to show"
            className={`${iconButton} ${menuOpen ? 'bg-neutral-800 text-white' : ''}`}
          >
            <BookOpen className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="absolute bottom-full right-0 mb-3 w-64 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-1.5 text-left whitespace-normal">
              <p className="px-2.5 pt-1.5 pb-1 text-[11px] uppercase tracking-wide text-neutral-500">
                Pages on screen
              </p>
              {[
                { value: true, text: '2 pages (like a book)' },
                { value: false, text: '1 page' },
              ].map((option) => (
                <button
                  key={String(option.value)}
                  onClick={() => onSetTwoPages(option.value)}
                  className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg hover:bg-neutral-800 text-neutral-200 text-left"
                >
                  <span>{option.text}</span>
                  {twoPages === option.value && <Check className="w-4 h-4 text-amber-400" />}
                </button>
              ))}
              <div className="my-1 h-px bg-neutral-800" />
              <button
                onClick={() => onSetSoundOn(!soundOn)}
                className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg hover:bg-neutral-800 text-neutral-200 text-left"
              >
                <span className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-neutral-400" />
                  Page-turn sound
                </span>
                {soundOn && <Check className="w-4 h-4 text-amber-400" />}
              </button>
              {twoPages && (
                <>
                  <div className="my-1 h-px bg-neutral-800" />
                  <button
                    onClick={() => onSetCoverAlone(!coverAlone)}
                    className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg hover:bg-neutral-800 text-neutral-200 text-left"
                  >
                    <span>
                      First page alone
                      <span className="block text-[11px] text-neutral-500 font-normal">
                        Turn off if pictures that cross two pages do not line up
                      </span>
                    </span>
                    {coverAlone && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {canFullscreen && (
          <>
            <div className="hidden sm:block w-px h-4 bg-neutral-700" />
            <button
              onClick={onToggleFullscreen}
              title={isFullscreen ? 'Leave full screen (Esc)' : 'Full screen'}
              className={iconButton}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
