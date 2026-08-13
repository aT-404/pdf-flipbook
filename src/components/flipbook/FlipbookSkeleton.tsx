'use client';

import React from 'react';
import { BookOpen } from 'lucide-react';

export function FlipbookSkeleton({ title }: { title?: string }) {
  return (
    <div className="fixed inset-0 z-50 bg-neutral-950 text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full flex flex-col items-center text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 animate-pulse shadow-xl shadow-amber-500/5">
          <BookOpen className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight text-white">
            {title ? `Loading "${title}"` : 'Preparing your document...'}
          </h2>
          <p className="text-xs text-neutral-400">
            Rendering high-resolution vector pages into digital flipbook
          </p>
        </div>

        {/* Animated Progress Loader Bar */}
        <div className="w-48 h-1.5 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
          <div className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full w-2/3 animate-[pulse_1.5s_infinite]" />
        </div>
      </div>
    </div>
  );
}
