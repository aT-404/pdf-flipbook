'use client';

import React from 'react';
import { X } from 'lucide-react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { PdfPageCanvas } from './PdfPageCanvas';

interface Props {
  isOpen: boolean;
  pdf: PDFDocumentProxy | null;
  totalPages: number;
  currentPage: number;
  onClose: () => void;
  onSelectPage: (page: number) => void;
}

export function ThumbnailDrawer({
  isOpen,
  pdf,
  totalPages,
  currentPage,
  onClose,
  onSelectPage,
}: Props) {
  if (!isOpen) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative ml-auto w-80 max-w-full h-full bg-neutral-900 border-l border-neutral-800 shadow-2xl flex flex-col z-10 text-white font-sans">
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-tight text-neutral-200">
            Page Overview ({totalPages} pages)
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-3">
          {pages.map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => {
                onSelectPage(pageNum);
                onClose();
              }}
              className={`group relative aspect-[3/4] bg-neutral-800 rounded-xl overflow-hidden border-2 transition-all ${
                pageNum === currentPage
                  ? 'border-amber-500 shadow-lg shadow-amber-500/10 scale-105'
                  : 'border-transparent hover:border-neutral-700'
              }`}
            >
              <PdfPageCanvas
                pdf={pdf}
                pageNumber={pageNum}
                zoom={0.5}
                shouldRender={isOpen}
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 text-center">
                <span className="text-[11px] font-mono text-neutral-300 group-hover:text-amber-400">
                  {pageNum}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
