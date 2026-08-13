'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Plus, RefreshCw, LogOut, BookOpen, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { getSupabaseConfigStatus } from '@/lib/supabase/config';
import { ConfigurationErrorBanner } from '@/components/shared/ConfigurationErrorBanner';
import { Document } from '@/types';
import { fetchAllDocumentsAdmin } from '@/lib/storage/document-service';
import { DashboardMetrics } from '@/components/admin/DashboardMetrics';
import { DocumentTable } from '@/components/admin/DocumentTable';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const configStatus = getSupabaseConfigStatus();

  const loadDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllDocumentsAdmin();
      setDocuments(data);
    } catch (err) {
      console.error('Failed to load documents:', err);
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
        loadDocuments();
      }
    }
  }, [user, isAdmin, authLoading, router]);

  if (!configStatus.isConfigured) {
    return <ConfigurationErrorBanner missingVars={configStatus.missingVars} />;
  }

  if (authLoading || (!user && loading)) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-neutral-400 font-medium">Loading Admin Portal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans flex flex-col">
      {/* Admin Dashboard Header */}
      <header className="sticky top-0 z-40 bg-neutral-900/90 backdrop-blur-md border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white">
                CMS Admin Dashboard
              </h1>
              <p className="text-[11px] text-neutral-400 font-mono">
                {user?.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/upload"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-amber-500/10"
            >
              <Plus className="w-4 h-4" /> Upload New PDF
            </Link>

            <button
              onClick={() => loadDocuments()}
              title="Refresh documents"
              className="p-2 hover:bg-neutral-800 rounded-xl text-neutral-400 hover:text-white transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-neutral-800" />

            <button
              onClick={() => signOut()}
              className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-red-400 rounded-xl text-xs font-semibold transition-colors"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {error && (
          <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/40 border border-red-900/50 p-4 rounded-2xl">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            {error}
          </div>
        )}

        {/* Overview Stat Cards */}
        <DashboardMetrics documents={documents} />

        {/* Document Management Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight text-white">
              Published & Draft Publications
            </h2>
            <span className="text-xs text-neutral-400 font-mono">
              Showing {documents.length} items
            </span>
          </div>

          {loading ? (
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center text-neutral-500 text-xs">
              Fetching database documents...
            </div>
          ) : (
            <DocumentTable documents={documents} onRefresh={loadDocuments} />
          )}
        </div>
      </main>
    </div>
  );
}
