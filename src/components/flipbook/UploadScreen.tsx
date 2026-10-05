'use client';

import React, { useState } from 'react';
import { BookOpen, FileUp, AlertCircle, Loader2 } from 'lucide-react';

interface Props {
  busy: boolean;
  error: string | null;
  onFile: (file: File) => void;
}

export function UploadScreen({ busy, error, onFile }: Props) {
  const [dragging, setDragging] = useState(false);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-xl text-center space-y-8">
        <div className="space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400">
            <BookOpen className="w-7 h-7" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">PDF Flipbook</h1>
          <p className="text-neutral-400">
            Choose a PDF and read it like a real book. Two pages at a time. Swipe to turn the page.
          </p>
        </div>

        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file && !busy) onFile(file);
          }}
          className={`flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed px-6 py-14 cursor-pointer transition-colors ${
            dragging
              ? 'border-amber-400 bg-amber-500/10'
              : 'border-neutral-700 hover:border-neutral-500 hover:bg-neutral-900/50'
          } ${busy ? 'pointer-events-none opacity-80' : ''}`}
        >
          {busy ? (
            <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
          ) : (
            <FileUp className="w-10 h-10 text-amber-400" />
          )}
          <span className="text-lg font-semibold">
            {busy ? 'Opening your PDF…' : 'Click here to choose a PDF'}
          </span>
          <span className="text-sm text-neutral-400">
            {busy ? 'Big files can take a few seconds.' : 'or drag a PDF file and drop it here'}
          </span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = ''; // lets you pick the same file again later
              if (file) onFile(file);
            }}
          />
        </label>

        {error && (
          <p className="flex items-start justify-center gap-2 text-sm text-red-400 text-left">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </p>
        )}

        <p className="text-xs text-neutral-500">
          Your file stays on your own device. It is not uploaded anywhere.
        </p>
      </div>
    </main>
  );
}
