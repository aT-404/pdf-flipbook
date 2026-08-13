'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ExternalLink,
  Copy,
  Check,
  Edit3,
  Trash2,
  Eye,
  FileText,
  Search,
  BookOpen,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Document, DocumentStatus } from '@/types';
import { formatDate, formatBytes } from '@/lib/utils/formatters';
import { getPublicStorageUrl, BUCKET_COVERS, updateDocumentMetadata, deleteDocument } from '@/lib/storage/document-service';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface Props {
  documents: Document[];
  onRefresh: () => void;
}

export function DocumentTable({ documents, onRefresh }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Deletion modal state
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.author && doc.author.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (doc.category && doc.category.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' ? true : doc.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleCopyLink = async (slug: string) => {
    const url = `${window.location.origin}/view/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 2000);
    } catch (e) {
      console.error('Failed to copy URL:', e);
    }
  };

  const handleToggleStatus = async (doc: Document) => {
    const newStatus: DocumentStatus = doc.status === 'published' ? 'draft' : 'published';
    try {
      await updateDocumentMetadata(doc.id, { status: newStatus });
      onRefresh();
    } catch (err) {
      alert(`Failed to update status: ${(err as Error).message}`);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteDocument(deleteTarget.id);
      setDeleteTarget(null);
      onRefresh();
    } catch (err) {
      alert(`Failed to delete document: ${(err as Error).message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-neutral-900 border border-neutral-800/80 rounded-2xl p-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by title, slug, category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-neutral-500 outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {['all', 'published', 'draft'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors ${
                statusFilter === status
                  ? 'bg-amber-500 text-neutral-950'
                  : 'bg-neutral-950 hover:bg-neutral-800 text-neutral-400'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl overflow-hidden shadow-xl">
        {filteredDocuments.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <BookOpen className="w-10 h-10 text-neutral-600 mx-auto" />
            <p className="text-sm font-semibold text-neutral-300">No documents found</p>
            <p className="text-xs text-neutral-500">
              Upload a new PDF to publish your first interactive flipbook publication.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Publication</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Details</th>
                  <th className="py-3.5 px-4">Views</th>
                  <th className="py-3.5 px-4">Created</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
                {filteredDocuments.map((doc) => {
                  const coverUrl = getPublicStorageUrl(BUCKET_COVERS, doc.cover_image_path);
                  return (
                    <tr key={doc.id} className="hover:bg-neutral-800/40 transition-colors">
                      {/* Title & Thumbnail */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-12 bg-neutral-950 rounded-lg overflow-hidden border border-neutral-800 shrink-0 flex items-center justify-center">
                            {coverUrl ? (
                              <img
                                src={coverUrl}
                                alt={doc.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <FileText className="w-5 h-5 text-neutral-600" />
                            )}
                          </div>
                          <div className="space-y-0.5 max-w-xs">
                            <h4 className="font-semibold text-white line-clamp-1">{doc.title}</h4>
                            <p className="text-[11px] font-mono text-neutral-400 line-clamp-1">
                              /view/{doc.slug}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleStatus(doc)}
                          title="Click to toggle status"
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider transition-all ${
                            doc.status === 'published'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                          }`}
                        >
                          {doc.status === 'published' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" /> Published
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" /> Draft
                            </>
                          )}
                        </button>
                      </td>

                      {/* Details (Page count & size) */}
                      <td className="py-3.5 px-4 font-mono text-neutral-400 text-[11px]">
                        <div>{doc.page_count} pages</div>
                        <div className="text-[10px] text-neutral-400">{formatBytes(doc.file_size)}</div>
                      </td>

                      {/* View Count */}
                      <td className="py-3.5 px-4 font-mono text-purple-400 font-semibold">
                        <div className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5 text-purple-500" />
                          {doc.view_count || 0}
                        </div>
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 text-neutral-400 text-[11px]">
                        {formatDate(doc.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Open Public View */}
                          <Link
                            href={`/view/${doc.slug}`}
                            target="_blank"
                            title="Open public flipbook view"
                            className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>

                          {/* Copy Share Link */}
                          <button
                            onClick={() => handleCopyLink(doc.slug)}
                            title="Copy public URL"
                            className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-amber-400 transition-colors"
                          >
                            {copiedSlug === doc.slug ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>

                          {/* Edit / Replace */}
                          <Link
                            href={`/admin/documents/${doc.id}`}
                            title="Edit metadata & replace PDF"
                            className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-sky-400 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Link>

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteTarget(doc)}
                            title="Delete publication"
                            className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        title={deleteTarget?.title || ''}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </div>
  );
}
