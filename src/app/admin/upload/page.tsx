'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Upload,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  BookOpen,
  AlertCircle,
  FileText,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '@/lib/auth/auth-context';
import { getSupabaseConfigStatus } from '@/lib/supabase/config';
import { ConfigurationErrorBanner } from '@/components/shared/ConfigurationErrorBanner';
import { PdfDropzone } from '@/components/admin/PdfDropzone';
import { generateSlug } from '@/lib/utils/slugify';
import { createDocumentWithFiles } from '@/lib/storage/document-service';
import { Document, DocumentStatus } from '@/types';

export default function UploadPdfPage() {
  const router = useRouter();
  const { user, isAdmin, loading: authLoading } = useAuth();

  const configStatus = getSupabaseConfigStatus();

  // Upload Form States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [coverBlob, setCoverBlob] = useState<Blob | null>(null);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<DocumentStatus>('published');

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishedDoc, setPublishedDoc] = useState<Document | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push('/admin/login');
    }
  }, [user, isAdmin, authLoading, router]);

  if (!configStatus.isConfigured) {
    return <ConfigurationErrorBanner missingVars={configStatus.missingVars} />;
  }

  const handleFileSelected = (data: {
    file: File;
    pageCount: number;
    coverBlob: Blob | null;
  }) => {
    setSelectedFile(data.file);
    setPageCount(data.pageCount);
    setCoverBlob(data.coverBlob);

    // Auto-generate title from filename if empty
    const rawTitle = data.file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    const formattedTitle = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);

    if (!title) {
      setTitle(formattedTitle);
      setSlug(generateSlug(formattedTitle));
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    setSlug(generateSlug(val));
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a PDF document to upload.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const doc = await createDocumentWithFiles({
        pdfFile: selectedFile,
        coverBlob,
        input: {
          title,
          slug,
          description,
          author,
          category,
          file_path: '',
          file_size: selectedFile.size,
          page_count: pageCount,
          status,
        },
      });

      setPublishedDoc(doc);
      setUploading(false);

      // Trigger celebratory confetti animation
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {}
    } catch (err) {
      console.error('Upload failed:', err);
      setError((err as Error).message);
      setUploading(false);
    }
  };

  const publicUrl = publishedDoc
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/view/${publishedDoc.slug}`
    : '';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {}
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <Link
            href="/admin"
            className="flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <div className="text-xs font-mono text-neutral-500">PDF Publishing Suite</div>
        </div>

        {!publishedDoc ? (
          <form onSubmit={handleUploadSubmit} className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Upload & Publish PDF
              </h1>
              <p className="text-xs text-neutral-400">
                Transform any PDF document into an interactive, publicly shareable 3D flipbook.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/40 border border-red-900/50 p-4 rounded-2xl">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                {error}
              </div>
            )}

            {/* Step 1: PDF File Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                1. Select PDF File
              </label>
              <PdfDropzone
                onFileSelected={handleFileSelected}
                onFileCleared={() => {
                  setSelectedFile(null);
                  setPageCount(0);
                  setCoverBlob(null);
                }}
              />
            </div>

            {/* Step 2: Metadata Form */}
            {selectedFile && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4 shadow-xl">
                <h3 className="text-sm font-semibold text-white border-b border-neutral-800 pb-3">
                  2. Document Metadata & Options
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Document Title */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                      Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={handleTitleChange}
                      placeholder="e.g. Annual Financial Report 2026"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Public Slug URL Preview */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                      Public URL Slug *
                    </label>
                    <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono text-neutral-400">
                      <span className="text-neutral-500 select-none">/view/</span>
                      <input
                        type="text"
                        required
                        value={slug}
                        onChange={(e) => setSlug(generateSlug(e.target.value))}
                        className="flex-1 bg-transparent text-amber-400 outline-none"
                      />
                    </div>
                  </div>

                  {/* Author */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                      Author / Publisher
                    </label>
                    <input
                      type="text"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      placeholder="e.g. Acme Corporation"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                      Category
                    </label>
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="e.g. Reports, Magazines, Books"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Brief overview of the document contents..."
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white placeholder-neutral-500 outline-none focus:border-amber-500 resize-none"
                    />
                  </div>

                  {/* Visibility / Status */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                      Publication Visibility
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setStatus('published')}
                        className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                          status === 'published'
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" /> Published (Publicly Accessible)
                      </button>

                      <button
                        type="button"
                        onClick={() => setStatus('draft')}
                        className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                          status === 'draft'
                            ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                        }`}
                      >
                        <FileText className="w-4 h-4" /> Draft (Admin Only)
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-800 flex justify-end">
                  <button
                    type="submit"
                    disabled={uploading}
                    className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs flex items-center gap-2 transition-colors shadow-lg shadow-amber-500/10 disabled:opacity-50"
                  >
                    {uploading ? (
                      <span className="animate-pulse">Uploading & Processing...</span>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" /> Publish Publication
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        ) : (
          /* Step 3: Success Screen with Stable Public Link */
          <div className="bg-neutral-900 border border-emerald-500/40 rounded-3xl p-8 shadow-2xl space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-xl">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Published Successfully
              </span>
              <h2 className="text-2xl font-bold text-white">{publishedDoc.title}</h2>
              <p className="text-xs text-neutral-400">
                Your PDF has been converted into an interactive flipbook and is now available via its permanent public URL.
              </p>
            </div>

            {/* Prominent Public Link Card */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-3 max-w-lg mx-auto">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block text-left">
                Permanent Public URL
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={publicUrl}
                  className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono text-amber-400 outline-none select-all"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> Copy Link
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 pt-4 border-t border-neutral-800">
              <Link
                href={`/view/${publishedDoc.slug}`}
                target="_blank"
                className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold rounded-xl text-xs flex items-center gap-2 transition-colors"
              >
                Open Flipbook Viewer <ExternalLink className="w-4 h-4" />
              </Link>
              <Link
                href="/admin"
                className="px-5 py-2.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 font-semibold rounded-xl text-xs transition-colors"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
