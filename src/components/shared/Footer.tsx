import React from 'react';
import { BookOpen } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-neutral-950 border-t border-neutral-800/80 py-10 text-neutral-400 text-xs font-sans">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-amber-500" />
          <span className="font-semibold text-neutral-300">FolioFlip Platform</span>
          <span className="text-neutral-600">|</span>
          <span className="text-neutral-400">Interactive Digital Publishing</span>
        </div>

        <p className="text-neutral-400">
          Powered by Next.js, PDF.js & Supabase Engine
        </p>
      </div>
    </footer>
  );
}
