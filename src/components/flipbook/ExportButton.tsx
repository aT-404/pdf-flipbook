'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import {
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  FileCode2,
  Image as ImageIcon,
  Share2,
  ChevronDown,
} from 'lucide-react';
import {
  buildFlipbookBlob,
  coverFileName,
  downloadBlob,
  flipbookFileName,
} from '@/lib/export/build-flipbook';
import { renderPageToCanvas } from '@/lib/pdf/pdf-utils';

interface Props {
  pdf: PDFDocumentProxy;
  title: string;
  twoPages: boolean;
  coverAlone: boolean;
  soundOn: boolean;
}

type Status =
  | { kind: 'idle' }
  | { kind: 'working'; percent: number }
  | {
      kind: 'done';
      name: string;
      megabytes: number;
      htmlBlob: Blob;
      coverDataUrl?: string;
      coverBlob?: Blob;
      coverName?: string;
      withThumbnail: boolean;
    }
  | { kind: 'error' };

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality));
}

/** "Download as flipbook": offers HTML-only or Flipbook + cover thumbnail export. */
export function ExportButton({ pdf, title, twoPages, coverAlone, soundOn }: Props) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [menuOpen, setMenuOpen] = useState(false);
  const running = useRef(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const start = async (withThumbnail: boolean) => {
    if (running.current) return;
    running.current = true;
    setMenuOpen(false);
    setStatus({ kind: 'working', percent: 0 });
    try {
      let coverDataUrl: string | undefined;
      let coverBlob: Blob | undefined;
      try {
        const canvas = await renderPageToCanvas(pdf, 1, withThumbnail ? 600 : 400).promise;
        if (canvas) {
          coverDataUrl = canvas.toDataURL('image/jpeg', 0.88);
          if (withThumbnail) {
            const generated = await canvasToJpegBlob(canvas, 0.88);
            if (generated) coverBlob = generated;
          }
          canvas.width = 0;
          canvas.height = 0;
        }
      } catch {
        /* cover thumbnail is optional; never block export */
      }

      const htmlBlob = await buildFlipbookBlob(
        pdf,
        { title, twoPages, coverAlone, soundOn, coverDataUrl },
        (fraction) => setStatus({ kind: 'working', percent: Math.round(fraction * 100) })
      );
      const name = flipbookFileName(title);
      const coverName = coverFileName(title);

      downloadBlob(htmlBlob, name);
      if (withThumbnail && coverBlob) {
        const cBlob = coverBlob;
        setTimeout(() => downloadBlob(cBlob, coverName), 350);
      }

      setStatus({
        kind: 'done',
        name,
        megabytes: htmlBlob.size / (1024 * 1024),
        htmlBlob,
        coverDataUrl,
        coverBlob,
        coverName,
        withThumbnail,
      });
    } catch (err) {
      console.error(err);
      setStatus({ kind: 'error' });
    } finally {
      running.current = false;
    }
  };

  const canShareFiles =
    status.kind === 'done' &&
    status.withThumbnail &&
    Boolean(status.coverBlob) &&
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    (() => {
      try {
        const htmlFile = new File([status.htmlBlob], status.name, { type: 'text/html' });
        const imgFile = new File([status.coverBlob!], status.coverName || 'cover.jpg', {
          type: 'image/jpeg',
        });
        return navigator.canShare({ files: [htmlFile, imgFile] });
      } catch {
        return false;
      }
    })();

  const shareBoth = async () => {
    if (status.kind !== 'done' || !status.coverBlob) return;
    try {
      const htmlFile = new File([status.htmlBlob], status.name, { type: 'text/html' });
      const imgFile = new File([status.coverBlob], status.coverName || 'cover.jpg', {
        type: 'image/jpeg',
      });
      await navigator.share({ title, files: [imgFile, htmlFile] });
    } catch {
      /* user cancelled share */
    }
  };

  return (
    <div ref={wrapperRef} className="relative pointer-events-auto">
      <button
        onClick={() => {
          if (status.kind === 'working') return;
          if (status.kind !== 'idle') setStatus({ kind: 'idle' });
          setMenuOpen((v) => !v);
        }}
        disabled={status.kind === 'working'}
        title="Save this book as one file you can send to anyone"
        className="flex items-center gap-2 pl-3 pr-2.5 py-1.5 hover:bg-neutral-800/80 rounded-xl text-neutral-300 hover:text-white text-sm transition-colors disabled:opacity-60"
      >
        {status.kind === 'working' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">Download as flipbook</span>
        <ChevronDown className="w-3.5 h-3.5 opacity-70" />
      </button>

      {menuOpen && status.kind !== 'working' && (
        <div className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-1.5rem)] rounded-xl border border-neutral-700 bg-neutral-900 p-1.5 text-sm shadow-2xl">
          <button
            onClick={() => void start(false)}
            className="w-full flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-neutral-800 transition-colors"
          >
            <FileCode2 className="w-4 h-4 mt-0.5 text-amber-400 shrink-0" />
            <div>
              <div className="font-medium text-neutral-100">As HTML only</div>
              <div className="text-xs text-neutral-400">
                Single self-contained .html file
              </div>
            </div>
          </button>
          <button
            onClick={() => void start(true)}
            className="w-full flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-neutral-800 transition-colors"
          >
            <ImageIcon className="w-4 h-4 mt-0.5 text-amber-400 shrink-0" />
            <div>
              <div className="font-medium text-neutral-100">Flipbook + cover thumbnail</div>
              <div className="text-xs text-neutral-400">
                Downloads .html + front-page .jpg for sharing
              </div>
            </div>
          </button>
        </div>
      )}

      {status.kind !== 'idle' && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-1.5rem)] rounded-xl border border-neutral-700 bg-neutral-900 p-3 text-sm shadow-2xl">
          {status.kind === 'working' && (
            <div className="space-y-2">
              <p className="text-neutral-200">Making your flipbook file… {status.percent}%</p>
              <div className="h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all"
                  style={{ width: `${status.percent}%` }}
                />
              </div>
            </div>
          )}
          {status.kind === 'done' && (
            <div className="flex gap-2.5">
              {status.coverDataUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={status.coverDataUrl}
                  alt={`${title} front cover`}
                  className="w-12 h-16 object-cover rounded border border-neutral-700 bg-white shrink-0"
                />
              ) : (
                <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
              )}
              <div className="flex-1 space-y-1.5 min-w-0">
                <p className="text-neutral-200 break-words flex items-start gap-1.5">
                  {status.coverDataUrl && (
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
                  )}
                  <span>
                    Saved <b>{status.name}</b> ({status.megabytes.toFixed(1)} MB)
                    {status.withThumbnail && status.coverName && (
                      <>
                        {' '}
                        and <b>{status.coverName}</b>
                      </>
                    )}
                  </span>
                </p>
                <p className="text-xs text-neutral-400">
                  {status.withThumbnail
                    ? 'Send the cover image along with the HTML file so recipients see the front page.'
                    : 'Send this one file to anyone. They double-click it and it opens in their browser.'}
                </p>
                {status.withThumbnail && status.coverBlob && status.coverName && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <button
                      onClick={() => downloadBlob(status.coverBlob!, status.coverName!)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 px-2.5 py-1 text-xs text-neutral-200 transition-colors"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      Download cover (.jpg)
                    </button>
                    {canShareFiles && (
                      <button
                        onClick={() => void shareBoth()}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-2.5 py-1 text-xs transition-colors"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        Share both
                      </button>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => setStatus({ kind: 'idle' })}
                title="Close"
                className="text-neutral-500 hover:text-white self-start"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {status.kind === 'error' && (
            <div className="flex gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 text-red-400 shrink-0" />
              <p className="flex-1 text-neutral-200">
                Sorry, the file could not be made. Very big PDFs can run out of memory. Try a smaller PDF.
              </p>
              <button
                onClick={() => setStatus({ kind: 'idle' })}
                title="Close"
                className="text-neutral-500 hover:text-white self-start"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
