'use client';

import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Grid,
  Share2,
  RotateCcw,
} from 'lucide-react';

interface Props {
  currentPage: number;
  totalPages: number;
  zoom: number;
  isFullscreen: boolean;
  onPrev: () => void;
  onNext: () => void;
  onJumpToPage: (page: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onToggleFullscreen: () => void;
  onToggleThumbnails: () => void;
  onShare: () => void;
}

export function ViewerToolbar({
  currentPage,
  totalPages,
  zoom,
  isFullscreen,
  onPrev,
  onNext,
  onJumpToPage,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onToggleFullscreen,
  onToggleThumbnails,
  onShare,
}: Props) {
  const [isVisible, setIsVisible] = useState(true);
  const [showJumpInput, setShowJumpInput] = useState(false);
  const [jumpValue, setJumpValue] = useState(currentPage.toString());

  // Auto-hide toolbar during inactive reading
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const handleUserActivity = () => {
      setIsVisible(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setIsVisible(false);
      }, 4000);
    };

    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);

    handleUserActivity();

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
    };
  }, []);

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(jumpValue, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      onJumpToPage(pageNum);
      setShowJumpInput(false);
    }
  };

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <div className="bg-neutral-900/90 backdrop-blur-md border border-neutral-800/80 rounded-2xl shadow-2xl px-4 py-2.5 flex items-center gap-3 text-neutral-200 text-xs font-medium">
        {/* Thumbnails Sidebar Toggle */}
        <button
          onClick={onToggleThumbnails}
          title="Overview Thumbnails"
          className="p-2 hover:bg-neutral-800 rounded-xl text-neutral-300 hover:text-white transition-colors"
        >
          <Grid className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-neutral-800" />

        {/* Page Navigation */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onPrev}
            disabled={currentPage <= 1}
            title="Previous Page (Left Arrow)"
            className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-300 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {showJumpInput ? (
            <form onSubmit={handleJumpSubmit} className="flex items-center">
              <input
                type="number"
                min={1}
                max={totalPages}
                value={jumpValue}
                onChange={(e) => setJumpValue(e.target.value)}
                autoFocus
                className="w-12 bg-neutral-800 border border-neutral-700 rounded px-1.5 py-0.5 text-center text-white text-xs outline-none focus:border-amber-500"
              />
              <span className="ml-1 text-neutral-500">/ {totalPages}</span>
            </form>
          ) : (
            <button
              onClick={() => {
                setJumpValue(currentPage.toString());
                setShowJumpInput(true);
              }}
              title="Click to jump to page"
              className="px-2 py-1 hover:bg-neutral-800 rounded text-neutral-300 hover:text-amber-400 font-mono transition-colors"
            >
              Page {currentPage} <span className="text-neutral-500 font-normal">/ {totalPages}</span>
            </button>
          )}

          <button
            onClick={onNext}
            disabled={currentPage >= totalPages}
            title="Next Page (Right Arrow)"
            className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-300 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="w-px h-4 bg-neutral-800" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={onZoomOut}
            disabled={zoom <= 0.6}
            title="Zoom Out"
            className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-300 disabled:opacity-40 transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="w-12 text-center font-mono text-[11px] text-neutral-400">
            {Math.round(zoom * 100)}%
          </span>

          <button
            onClick={onZoomIn}
            disabled={zoom >= 2.0}
            title="Zoom In"
            className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-300 disabled:opacity-40 transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {zoom !== 1.0 && (
            <button
              onClick={onResetZoom}
              title="Reset Zoom"
              className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="w-px h-4 bg-neutral-800" />

        {/* Fullscreen & Share */}
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Fullscreen'}
            className="p-2 hover:bg-neutral-800 rounded-xl text-neutral-300 hover:text-white transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onShare}
            title="Share Document"
            className="p-2 hover:bg-neutral-800 rounded-xl text-amber-400 hover:text-amber-300 transition-colors"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
