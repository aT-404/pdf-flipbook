'use client';

import React, { useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { Download, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { buildFlipbookBlob, downloadBlob, flipbookFileName } from '@/lib/export/build-flipbook';
import { renderPageToCanvas } from '@/lib/pdf/pdf-utils';

interface Props {
  pdf: PDFDocumentProxy;
  file: File;
  title: string;
  twoPages: boolean;
  coverAlone: boolean;
  soundOn: boolean;
}

type Status =
  | { kind: 'idle' }
  | { kind: 'working'; percent: number }
  | { kind: 'done'; name: string; megabytes: number; coverDataUrl?: string }
  | { kind: 'error' };

/** "Download as flipbook": saves one HTML file that opens anywhere, without this app. */
export function ExportButton({ pdf, file, title, twoPages, coverAlone, soundOn }: Props) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const running = useRef(false);

  const start = async () => {
    if (running.current) return;
    running.current = true;
    setStatus({ kind: 'working', percent: 0 });
    try {
      let coverDataUrl: string | undefined;
      try {
        const canvas = await renderPageToCanvas(pdf, 1, 400).promise;
        if (canvas) {
          coverDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          canvas.width = 0;
          canvas.height = 0;
        }
      } catch {
        /* cover thumbnail is optional; never block export */
      }

      const blob = await buildFlipbookBlob(
        file,
        { title, twoPages, coverAlone, soundOn, coverDataUrl },
        (fraction) => setStatus({ kind: 'working', percent: Math.round(fraction * 100) })
      );
      const name = flipbookFileName(title);
      downloadBlob(blob, name);
      setStatus({
        kind: 'done',
        name,
        megabytes: blob.size / (1024 * 1024),
        coverDataUrl,
      });
    } catch (err) {
      console.error(err);
      setStatus({ kind: 'error' });
    } finally {
      running.current = false;
    }
  };

  return (
    <div className="relative pointer-events-auto">
      <button
        onClick={start}
        disabled={status.kind === 'working'}
        title="Save this book as one file you can send to anyone"
        className="flex items-center gap-2 pl-3 pr-3 py-1.5 hover:bg-neutral-800/80 rounded-xl text-neutral-300 hover:text-white text-sm transition-colors disabled:opacity-60"
      >
        {status.kind === 'working' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">Download as flipbook</span>
      </button>

      {status.kind !== 'idle' && (
        <div className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-1.5rem)] rounded-xl border border-neutral-700 bg-neutral-900 p-3 text-sm shadow-2xl">
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
              <div className="flex-1 space-y-1 min-w-0">
                <p className="text-neutral-200 break-words flex items-start gap-1.5">
                  {status.coverDataUrl && (
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
                  )}
                  <span>
                    Saved <b>{status.name}</b> ({status.megabytes.toFixed(1)} MB)
                  </span>
                </p>
                <p className="text-xs text-neutral-400">
                  Send this one file to anyone. They double-click it and it opens in their browser.
                  No app and no internet needed. It starts with your current page and sound settings.
                </p>
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
