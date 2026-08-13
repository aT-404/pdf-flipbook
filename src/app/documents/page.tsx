'use client';

import React, { useEffect, useState } from 'react';
import { BookOpen, Search, Filter } from 'lucide-react';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { ConfigurationErrorBanner } from '@/components/shared/ConfigurationErrorBanner';
import { getSupabaseConfigStatus } from '@/lib/supabase/config';
import { fetchPublishedDocuments } from '@/lib/storage/document-service';
import { Document } from '@/types';
import { PublicDocumentCard } from '@/components/documents/PublicDocumentCard';

export default function PublicLibraryPage() {
  const configStatus = getSupabaseConfigStatus();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    if (!configStatus.isConfigured) return;

    const loadDocs = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPublishedDocuments();
        setDocuments(data);
      } catch (err) {
        console.error('Failed to load library:', err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    loadDocs();
  }, []);

  if (!configStatus.isConfigured) {
    return <ConfigurationErrorBanner missingVars={configStatus.missingVars} />;
  }

  // Extract unique categories
  const categories = ['all', ...Array.from(new Set(documents.map((d) => d.category).filter(Boolean))) as string[]];

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (doc.author && doc.author.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCat =
      selectedCategory === 'all' ? true : doc.category === selectedCategory;

    return matchesSearch && matchesCat;
  });

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-8">
        {/* Header Title Section */}
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400 text-xs font-semibold uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5" /> Public Publication Library
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Explore Interactive Digital Flipbooks
          </h1>
          <p className="text-sm text-neutral-400 leading-relaxed">
            Browse our collection of digital magazines, annual reports, whitepapers, and books. Open any document instantly without an account.
          </p>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-xl">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search publications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-neutral-500 outline-none focus:border-amber-500"
            />
          </div>

          {categories.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              <Filter className="w-4 h-4 text-neutral-500 shrink-0" />
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-amber-500 text-neutral-950'
                      : 'bg-neutral-950 hover:bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Library Document Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-neutral-900 border border-neutral-800 rounded-2xl h-80 animate-pulse"
              />
            ))}
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-16 text-center space-y-4 shadow-xl max-w-md mx-auto">
            <BookOpen className="w-12 h-12 text-neutral-600 mx-auto" />
            <h3 className="text-base font-bold text-white">No Publications Found</h3>
            <p className="text-xs text-neutral-400">
              No published documents match your search criteria or no publications have been released yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocs.map((doc) => (
              <PublicDocumentCard key={doc.id} document={doc} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
