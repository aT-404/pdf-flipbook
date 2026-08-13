'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { extractPdfMetadata } from '@/lib/pdf/pdf-utils';
import { formatBytes } from '@/lib/utils/formatters';

interface Props {
  onFileSelected: (data: {
    file: File;
    pageCount: number;
    coverBlob: Blob | null;
    coverPreviewUrl: string | null;
  }) => void;
  onFileCleared?: () => void;
}

export function PdfDropzone({ onFileSelected, onFileCleared }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const processFile = async (file: File) => {
    setError(null);

    // 1. Validate file extension
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setError('Only PDF (.pdf) files are supported.');
      return;
    }

    // 2. Validate file size (max 50MB)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError(`File size exceeds 50MB limit (${formatBytes(file.size)}).`);
      return;
    }

    setLoading(true);
    setSelectedFile(file);

    try {
      // 3. Extract page count and first page cover thumbnail using PDF.js
      const { pageCount, coverBlob } = await extractPdfMetadata(file);

      let url: string | null = null;
      if (coverBlob) {
        url = URL.createObjectURL(coverBlob);
        setPreviewUrl(url);
      }

      setPageCount(pageCount);
      setLoading(false);

      onFileSelected({
        file,
        pageCount,
        coverBlob,
        coverPreviewUrl: url,
      });
    } catch (err) {
      console.error('PDF parsing error:', err);
      setError('Unable to parse PDF file. Ensure the PDF is valid and not password-protected.');
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPageCount(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (onFileCleared) onFileCleared();
  };

  return (
    <div className="space-y-3 font-sans">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleInputChange}
        className="hidden"
      />

      {!selectedFile ? (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 ${
            dragActive
              ? 'border-amber-500 bg-amber-500/10 scale-[1.01]'
              : 'border-neutral-800 hover:border-neutral-700 bg-neutral-950/60 hover:bg-neutral-950'
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Upload className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">
              Drag & Drop your PDF file here, or <span className="text-amber-400 underline">browse</span>
            </p>
            <p className="text-xs text-neutral-400">
              Only PDF documents up to 50MB are supported
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-4">
            {/* First Page Cover Preview Thumbnail */}
            <div className="w-14 h-16 bg-neutral-950 rounded-xl overflow-hidden border border-neutral-800 shrink-0 flex items-center justify-center">
              {loading ? (
                <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              ) : previewUrl ? (
                <img src={previewUrl} alt="Cover Preview" className="w-full h-full object-cover" />
              ) : (
                <FileText className="w-7 h-7 text-amber-400" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-white line-clamp-1">
                  {selectedFile.name}
                </h4>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              </div>
              <div className="flex items-center gap-3 text-xs font-mono text-neutral-400">
                <span>{formatBytes(selectedFile.size)}</span>
                {pageCount !== null && (
                  <>
                    <span>•</span>
                    <span className="text-amber-400 font-semibold">{pageCount} pages</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClear}
            className="p-2 hover:bg-neutral-800 rounded-xl text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/30 border border-red-900/40 p-3 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          {error}
        </div>
      )}
    </div>
  );
}
