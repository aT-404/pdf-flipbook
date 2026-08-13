'use client';

import React from 'react';
import { BookOpen, CheckCircle, FileEdit, Eye } from 'lucide-react';
import { Document } from '@/types';

export function DashboardMetrics({ documents }: { documents: Document[] }) {
  const totalDocs = documents.length;
  const publishedDocs = documents.filter((d) => d.status === 'published').length;
  const draftDocs = documents.filter((d) => d.status === 'draft').length;
  const totalViews = documents.reduce((acc, curr) => acc + (curr.view_count || 0), 0);

  const stats = [
    {
      title: 'Total Documents',
      value: totalDocs,
      icon: BookOpen,
      color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    },
    {
      title: 'Published',
      value: publishedDocs,
      icon: CheckCircle,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: 'Drafts',
      value: draftDocs,
      icon: FileEdit,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
    {
      title: 'Total Reader Views',
      value: totalViews.toLocaleString(),
      icon: Eye,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div
            key={s.title}
            className="bg-neutral-900 border border-neutral-800/80 rounded-2xl p-5 shadow-lg flex items-center justify-between"
          >
            <div className="space-y-1">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                {s.title}
              </p>
              <p className="text-2xl font-bold text-white tracking-tight">{s.value}</p>
            </div>
            <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${s.color}`}>
              <Icon className="w-6 h-6" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
