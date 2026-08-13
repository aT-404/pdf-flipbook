'use client';

import React from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export function DeleteConfirmModal({
  isOpen,
  title,
  onClose,
  onConfirm,
  isDeleting,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-neutral-900 border border-red-900/40 rounded-2xl shadow-2xl p-6 z-10 text-white font-sans space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="text-base font-semibold tracking-tight text-white">
              Delete Document
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-neutral-300">
            Are you sure you want to permanently delete{' '}
            <span className="font-semibold text-white">"{title}"</span>?
          </p>
          <p className="text-xs text-neutral-400">
            This action cannot be undone. The PDF file, metadata, and public link will be removed.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {isDeleting ? (
              <span className="animate-pulse">Deleting...</span>
            ) : (
              <>
                <Trash2 className="w-4 h-4" /> Delete Document
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
