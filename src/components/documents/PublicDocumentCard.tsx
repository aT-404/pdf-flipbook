'use client';

import React from 'react';
import Link from 'next/link';
import { BookOpen, Calendar, FileText, ArrowRight } from 'lucide-react';
import { Document } from '@/types';
import { formatDate } from '@/lib/utils/formatters';
import { getPublicStorageUrl, BUCKET_COVERS } from '@/lib/storage/document-service';

export function PublicDocumentCard({ document }: { document: Document }) {
  const coverUrl = getPublicStorageUrl(BUCKET_COVERS, document.cover_image_path);

  return (
    <div className="group bg-neutral-900 border border-neutral-800/80 hover:border-neutral-700 rounded-2xl overflow-hidden shadow-lg transition-all duration-300 flex flex-col">
      {/* Cover Image / Thumbnail Container */}
      <div className="relative aspect-[4/3] bg-neutral-950 overflow-hidden flex items-center justify-center border-b border-neutral-800/60">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={document.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-neutral-600">
            <BookOpen className="w-12 h-12" />
            <span className="text-xs font-mono text-neutral-500">PDF Flipbook</span>
          </div>
        )}

        {document.category && (
          <div className="absolute top-3 left-3 bg-neutral-900/90 backdrop-blur-md border border-neutral-700/60 text-amber-400 text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-lg">
            {document.category}
          </div>
        )}
      </div>

      {/* Card Details */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-white group-hover:text-amber-400 transition-colors line-clamp-1">
            {document.title}
          </h3>
          {document.description && (
            <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
              {document.description}
            </p>
          )}
        </div>

        <div className="space-y-4 pt-2 border-t border-neutral-800/60">
          <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-neutral-500" />
              {formatDate(document.published_at || document.created_at)}
            </span>
            <span className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-neutral-500" />
              {document.page_count} pages
            </span>
          </div>

          <Link
            href={`/view/${document.slug}`}
            className="w-full py-2.5 px-4 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-neutral-950 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all duration-200"
          >
            Read Publication <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
