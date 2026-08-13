'use client';

import React from 'react';
import Link from 'next/link';
import { BookOpen, Shield, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';

export function Navbar() {
  const { user, isAdmin, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800/80">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-white group-hover:text-amber-400 transition-colors">
              FolioFlip
            </span>
            <span className="text-[10px] text-neutral-400 font-mono tracking-wide uppercase">
              Digital Publishing
            </span>
          </div>
        </Link>

        {/* Nav Links */}
        <nav className="flex items-center gap-6">
          <Link
            href="/documents"
            className="text-xs font-medium text-neutral-300 hover:text-white transition-colors"
          >
            Public Library
          </Link>

          {isAdmin ? (
            <div className="flex items-center gap-3">
              <Link
                href="/admin"
                className="text-xs font-medium text-amber-400 hover:text-amber-300 flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg"
              >
                <Shield className="w-3.5 h-3.5" />
                Admin Dashboard
              </Link>
              <button
                onClick={() => signOut()}
                title="Sign out admin session"
                className="p-2 text-neutral-400 hover:text-red-400 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/admin/login"
              className="text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 text-neutral-200 px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5 text-neutral-400" />
              Admin Portal
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
