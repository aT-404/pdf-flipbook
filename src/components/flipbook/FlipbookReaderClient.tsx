'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { BookOpen, AlertCircle, ArrowLeft, Home } from 'lucide-react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { getSupabaseConfigStatus } from '@/lib/supabase/config';
import { ConfigurationErrorBanner } from '@/components/shared/ConfigurationErrorBanner';
import {
  fetchDocumentBySlug,
  getPublicStorageUrl,
  incrementDocumentViews,
  BUCKET_PDFS,
} from '@/lib/storage/document-service';
import { getPdfDocument } from '@/lib/pdf/pdf-utils';
import { Document } from '@/types';
import { FlipbookViewer, FlipbookRef } from './FlipbookViewer';
import { ViewerToolbar } from './ViewerToolbar';
import { ThumbnailDrawer } from './ThumbnailDrawer';
import { ShareModal } from './ShareModal';
import { FlipbookSkeleton } from './FlipbookSkeleton';
import { useFullscreen } from '@/hooks/use-fullscreen';

export function FlipbookReaderClient({ slug }: { slug: string }) {
  const configStatus = getSupabaseConfigStatus();

  const flipbookRef = useRef<FlipbookRef | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [document, setDocument] = useState<Document | null>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);

  // Viewer State
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1.0);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const { isFullscreen, toggleFullscreen } = useFullscreen(containerRef);

  useEffect(() => {
    if (!configStatus.isConfigured || !slug) return;

    let isMounted = true;

    const loadPublication = async () => {
      setLoading(true);
      setError(null);
      setIsNotFound(false);

      try {
        // 1. Fetch metadata from Supabase
        const doc = await fetchDocumentBySlug(slug);

        if (!doc || doc.status !== 'published') {
          if (isMounted) {
            setIsNotFound(true);
            setLoading(false);
          }
          return;
        }

        if (isMounted) {
          setDocument(doc);
          window.document.title = `${doc.title} | Flipbook Reader`;
        }

        // 2. Increment view count (session debounced)
        incrementDocumentViews(slug);

        // 3. Fetch PDF binary from storage and initialize PDF.js
        const pdfUrl = getPublicStorageUrl(BUCKET_PDFS, doc.file_path);
        if (!pdfUrl) {
          throw new Error('PDF storage URL could not be resolved.');
        }

        const pdfDoc = await getPdfDocument(pdfUrl);

        if (isMounted) {
          setPdf(pdfDoc);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading flipbook PDF:', err);
        if (isMounted) {
          setError((err as Error).message);
          setLoading(false);
        }
      }
    };

    loadPublication();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!flipbookRef.current || showShareModal || showThumbnails) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        flipbookRef.current.nextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        flipbookRef.current.prevPage();
      } else if (e.key === 'Home') {
        flipbookRef.current.flipToPage(1);
      } else if (e.key === 'End' && pdf) {
        flipbookRef.current.flipToPage(pdf.numPages);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pdf, showShareModal, showThumbnails]);

  if (!configStatus.isConfigured) {
    return <ConfigurationErrorBanner missingVars={configStatus.missingVars} />;
  }

  if (loading) {
    return <FlipbookSkeleton title={document?.title} />;
  }

  // 404 / Not Found / Unpublished Document Error State
  if (isNotFound) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
            <BookOpen className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white">Document Not Available</h1>
            <p className="text-xs text-neutral-400">
              The publication you are looking for does not exist, has been unpublished by the administrator, or the URL link is invalid.
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              href="/documents"
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
            >
              <Home className="w-4 h-4" /> Browse Public Library
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // PDF Load Error State
  if (error || !document || !pdf) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-neutral-900 border border-red-900/40 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white">Unable to Load Flipbook</h1>
            <p className="text-xs text-neutral-400">{error || 'An unexpected rendering error occurred.'}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold rounded-xl text-xs"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-neutral-950 text-white font-sans flex flex-col overflow-hidden select-none"
    >
      {/* Top Overlay Header */}
      <header className="absolute top-0 inset-x-0 z-30 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-4 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <Link
            href="/documents"
            className="p-2 hover:bg-neutral-800/80 rounded-xl text-neutral-300 hover:text-white backdrop-blur-md transition-colors"
            title="Return to Public Library"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="space-y-0.5">
            <h1 className="text-sm font-bold text-white drop-shadow line-clamp-1">
              {document.title}
            </h1>
            {document.author && (
              <p className="text-[11px] text-neutral-400 font-mono drop-shadow line-clamp-1">
                By {document.author}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Main 3D Flipbook Reader Container */}
      <main className="flex-1 w-full h-full flex items-center justify-center relative bg-neutral-950">
        <FlipbookViewer
          ref={flipbookRef}
          pdf={pdf}
          totalPages={pdf.numPages}
          zoom={zoom}
          onPageChange={(page) => setCurrentPage(page)}
        />
      </main>

      {/* Floating Bottom Controls Toolbar */}
      <ViewerToolbar
        currentPage={currentPage}
        totalPages={pdf.numPages}
        zoom={zoom}
        isFullscreen={isFullscreen}
        onPrev={() => flipbookRef.current?.prevPage()}
        onNext={() => flipbookRef.current?.nextPage()}
        onJumpToPage={(p) => flipbookRef.current?.flipToPage(p)}
        onZoomIn={() => setZoom((z) => Math.min(2.0, z + 0.15))}
        onZoomOut={() => setZoom((z) => Math.max(0.6, z - 0.15))}
        onResetZoom={() => setZoom(1.0)}
        onToggleFullscreen={toggleFullscreen}
        onToggleThumbnails={() => setShowThumbnails((prev) => !prev)}
        onShare={() => setShowShareModal(true)}
      />

      {/* Slide-out Thumbnail Drawer */}
      <ThumbnailDrawer
        isOpen={showThumbnails}
        pdf={pdf}
        totalPages={pdf.numPages}
        currentPage={currentPage}
        onClose={() => setShowThumbnails(false)}
        onSelectPage={(p) => flipbookRef.current?.flipToPage(p)}
      />

      {/* Share Link Modal */}
      <ShareModal
        isOpen={showShareModal}
        title={document.title}
        url={currentUrl}
        onClose={() => setShowShareModal(false)}
      />
    </div>
  );
}
