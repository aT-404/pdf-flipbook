'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  RefreshCw,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { getSupabaseConfigStatus } from '@/lib/supabase/config';
import { ConfigurationErrorBanner } from '@/components/shared/ConfigurationErrorBanner';
import {
  fetchDocumentByIdAdmin,
  updateDocumentMetadata,
  replaceDocumentPdf,
  deleteDocument,
} from '@/lib/storage/document-service';
import { Document, DocumentStatus } from '@/types';
import { PdfDropzone } from '@/components/admin/PdfDropzone';
import { DeleteConfirmModal } from '@/components/admin/DeleteConfirmModal';

export default function EditDocumentPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAdmin, loading: authLoading } = useAuth();

  const id = params.id as string;
  const configStatus = getSupabaseConfigStatus();

  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<DocumentStatus>('published');

  // Replace PDF File State
  const [newPdfFile, setNewPdfFile] = useState<File | null>(null);
  const [newPdfPageCount, setNewPdfPageCount] = useState<number>(0);
  const [newCoverBlob, setNewCoverBlob] = useState<Blob | null>(null);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadDocument = async () => {
    setLoading(true);
    setError(null);
    try {
      const doc = await fetchDocumentByIdAdmin(id);
      if (!doc) {
        setError('Document not found');
        setLoading(false);
        return;
      }
      setDocument(doc);
      setTitle(doc.title);
      setDescription(doc.description || '');
      setAuthor(doc.author || '');
      setCategory(doc.category || '');
      setStatus(doc.status);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user || !isAdmin) {
        router.push('/admin/login');
      } else {
        loadDocument();
      }
    }
  }, [id, user, isAdmin, authLoading]);

  if (!configStatus.isConfigured) {
    return <ConfigurationErrorBanner missingVars={configStatus.missingVars} />;
  }

  const handleSaveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const updated = await updateDocumentMetadata(id, {
        title,
        description,
        author,
        category,
        status,
      });

      setDocument(updated);
      setSuccessMsg('Document metadata updated successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleReplacePdf = async () => {
    if (!newPdfFile || !document) return;

    setReplacing(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const updated = await replaceDocumentPdf({
        id,
        pdfFile: newPdfFile,
        pageSize: newPdfFile.size,
        pageCount: newPdfPageCount,
        newCoverBlob,
      });

      setDocument(updated);
      setNewPdfFile(null);
      setSuccessMsg('PDF file replaced successfully while maintaining stable URL slug!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setReplacing(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await deleteDocument(id);
      router.push('/admin');
    } catch (err) {
      setError((err as Error).message);
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-neutral-400 font-medium">Loading document...</span>
        </div>
      </div>
    );
  }

  if (!document && error) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 max-w-md w-full text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="text-lg font-bold text-white">Document Not Found</h2>
          <p className="text-xs text-neutral-400">{error}</p>
          <Link
            href="/admin"
            className="inline-block px-4 py-2 bg-amber-500 text-neutral-950 font-bold rounded-xl text-xs"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

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
          <div className="flex items-center gap-3">
            <Link
              href={`/view/${document?.slug}`}
              target="_blank"
              className="text-xs font-semibold text-amber-400 hover:underline flex items-center gap-1"
            >
              View Public Link <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="p-2 text-neutral-400 hover:text-red-400 transition-colors"
              title="Delete Document"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Edit Document Metadata
          </h1>
          <p className="text-xs font-mono text-neutral-400">
            Stable Public URL Slug: <span className="text-amber-400">/view/{document?.slug}</span>
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/40 border border-red-900/50 p-4 rounded-2xl">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            {error}
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 p-4 rounded-2xl">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            {successMsg}
          </div>
        )}

        {/* Metadata Form */}
        <form onSubmit={handleSaveMetadata} className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <h3 className="text-sm font-semibold text-white border-b border-neutral-800 pb-3">
            Metadata Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                Author
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white placeholder-neutral-500 outline-none focus:border-amber-500 resize-none"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                Publication Status
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setStatus('published')}
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    status === 'published'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" /> Published
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('draft')}
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    status === 'draft'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                  }`}
                >
                  <FileText className="w-4 h-4" /> Draft
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-800 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <span className="animate-pulse">Saving...</span>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Metadata
                </>
              )}
            </button>
          </div>
        </form>

        {/* Replace PDF Section */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="space-y-1 border-b border-neutral-800 pb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-sky-400" /> Replace PDF File
            </h3>
            <p className="text-xs text-neutral-400">
              Upload a new PDF to replace the current document file. The public URL slug (<code className="text-amber-400 font-mono">/view/{document?.slug}</code>) will remain unchanged.
            </p>
          </div>

          <PdfDropzone
            onFileSelected={(data) => {
              setNewPdfFile(data.file);
              setNewPdfPageCount(data.pageCount);
              setNewCoverBlob(data.coverBlob);
            }}
            onFileCleared={() => setNewPdfFile(null)}
          />

          {newPdfFile && (
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleReplacePdf}
                disabled={replacing}
                className="px-6 py-2.5 bg-sky-500 hover:bg-sky-400 text-neutral-950 font-bold rounded-xl text-xs flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {replacing ? (
                  <span className="animate-pulse font-medium">Replacing PDF...</span>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" /> Replace PDF File
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        title={document?.title || ''}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </div>
  );
}
