'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { FlipbookViewer, FlipbookRef } from './FlipbookViewer';
import { ViewerToolbar } from './ViewerToolbar';
import { ThumbnailDrawer } from './ThumbnailDrawer';
import { ExportButton } from './ExportButton';
import { useFullscreen } from '@/hooks/use-fullscreen';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

interface Props {
  pdf: PDFDocumentProxy;
  file: File;
  title: string;
  onClose: () => void;
}

export function ReaderScreen({ pdf, file, title, onClose }: Props) {
  const totalPages = pdf.numPages;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const flipbookRef = useRef<FlipbookRef | null>(null);
  const { isFullscreen, isSupported, toggleFullscreen } = useFullscreen(containerRef);

  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [twoPages, setTwoPages] = useState(true); // two pages is the default everywhere
  const [coverAlone, setCoverAlone] = useState(true);
  const [soundOn, setSoundOn] = useState(true); // page-turn sound
  const [ready, setReady] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);

  const handleReady = useCallback(() => setReady(true), []);
  const closeThumbnails = useCallback(() => setShowThumbnails(false), []);

  // Keyboard: arrows, page up/down, home/end
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showThumbnails) return;
      if (e.target instanceof HTMLInputElement) return;
      const book = flipbookRef.current;
      if (!book) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') book.next();
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') book.prev();
      else if (e.key === 'Home') book.goTo(1);
      else if (e.key === 'End') book.goTo(totalPages);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showThumbnails, totalPages]);

  // Show "4–5" when two pages are visible, otherwise just the number
  const twoPagesVisible =
    twoPages && !(coverAlone && currentPage === 1) && currentPage < totalPages;
  const pageLabel = twoPagesVisible
    ? `${currentPage}–${Math.min(currentPage + 1, totalPages)}`
    : String(currentPage);

  return (
    <div ref={containerRef} className="fixed inset-0 bg-neutral-950 text-white overflow-hidden">
      <header className="absolute top-0 inset-x-0 z-30 bg-gradient-to-b from-black/80 to-transparent px-3 py-3 flex items-center gap-2 pointer-events-none">
        <button
          onClick={onClose}
          className="pointer-events-auto flex items-center gap-2 pl-2 pr-3 py-1.5 hover:bg-neutral-800/80 rounded-xl text-neutral-300 hover:text-white text-sm transition-colors"
          title="Choose a different PDF"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Choose another PDF</span>
        </button>
        <h1 className="text-sm font-semibold text-neutral-200 line-clamp-1 flex-1">{title}</h1>
        <ExportButton
          file={file}
          title={title}
          twoPages={twoPages}
          coverAlone={coverAlone}
          soundOn={soundOn}
        />
      </header>

      <FlipbookViewer
        ref={flipbookRef}
        pdf={pdf}
        totalPages={totalPages}
        zoom={zoom}
        twoPages={twoPages}
        coverAlone={coverAlone}
        soundEnabled={soundOn}
        onPageChange={setCurrentPage}
        onReady={handleReady}
      />

      {!ready && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-neutral-950 text-neutral-400">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
          <span className="text-sm">Preparing your book…</span>
        </div>
      )}

      <ViewerToolbar
        currentPage={currentPage}
        totalPages={totalPages}
        pageLabel={pageLabel}
        zoom={zoom}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        isFullscreen={isFullscreen}
        canFullscreen={isSupported}
        twoPages={twoPages}
        coverAlone={coverAlone}
        onSetTwoPages={setTwoPages}
        onSetCoverAlone={setCoverAlone}
        soundOn={soundOn}
        onSetSoundOn={setSoundOn}
        onPrev={() => flipbookRef.current?.prev()}
        onNext={() => flipbookRef.current?.next()}
        onJumpToPage={(page) => flipbookRef.current?.goTo(page)}
        onZoomIn={() => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP))}
        onZoomOut={() => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP))}
        onResetZoom={() => setZoom(1)}
        onToggleFullscreen={toggleFullscreen}
        onToggleThumbnails={() => setShowThumbnails(true)}
      />

      <ThumbnailDrawer
        isOpen={showThumbnails}
        pdf={pdf}
        totalPages={totalPages}
        currentPage={currentPage}
        onClose={closeThumbnails}
        onSelectPage={(page) => flipbookRef.current?.goTo(page)}
      />
    </div>
  );
}
