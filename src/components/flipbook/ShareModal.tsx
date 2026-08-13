'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Share2, MessageCircle, Send, Mail } from 'lucide-react';

interface Props {
  isOpen: boolean;
  title: string;
  url: string;
  onClose: () => void;
}

export function ShareModal({ isOpen, title, url, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error('Failed to copy URL:', e);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: `Read "${title}" online flipbook`,
          url,
        });
      } catch (err) {
        // User cancelled share
      }
    }
  };

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(`Read "${title}" digital flipbook`);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-6 z-10 text-white font-sans space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-400">
            <Share2 className="w-5 h-5" />
            <h3 className="text-base font-semibold tracking-tight text-white">
              Share Document
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium text-neutral-200 line-clamp-1">{title}</p>
          <p className="text-xs text-neutral-400">
            Anyone with this link can view the publication without an account.
          </p>
        </div>

        {/* Copy Link Input */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Public Share Link
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={url}
              className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono text-neutral-300 outline-none select-all"
            />
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" /> Copy
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Social Action Icons */}
        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-neutral-800">
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              onClick={handleNativeShare}
              className="flex flex-col items-center gap-1.5 p-3 bg-neutral-800/60 hover:bg-neutral-800 rounded-xl transition-colors text-xs text-neutral-300"
            >
              <Share2 className="w-5 h-5 text-amber-400" />
              Share
            </button>
          )}

          <a
            href={`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center gap-1.5 p-3 bg-neutral-800/60 hover:bg-neutral-800 rounded-xl transition-colors text-xs text-neutral-300"
          >
            <MessageCircle className="w-5 h-5 text-emerald-400" />
            WhatsApp
          </a>

          <a
            href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center gap-1.5 p-3 bg-neutral-800/60 hover:bg-neutral-800 rounded-xl transition-colors text-xs text-neutral-300"
          >
            <Send className="w-5 h-5 text-sky-400" />
            X / Twitter
          </a>

          <a
            href={`mailto:?subject=${encodedTitle}&body=${encodedUrl}`}
            className="flex flex-col items-center gap-1.5 p-3 bg-neutral-800/60 hover:bg-neutral-800 rounded-xl transition-colors text-xs text-neutral-300"
          >
            <Mail className="w-5 h-5 text-purple-400" />
            Email
          </a>
        </div>
      </div>
    </div>
  );
}
