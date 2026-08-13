'use client';

import React from 'react';
import { AlertTriangle, Key, ExternalLink, Terminal } from 'lucide-react';

interface Props {
  missingVars: string[];
}

export function ConfigurationErrorBanner({ missingVars }: Props) {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6 font-sans">
      <div className="max-w-2xl w-full bg-neutral-900 border border-red-900/50 rounded-2xl p-8 shadow-2xl space-y-6">
        <div className="flex items-center gap-4 border-b border-neutral-800 pb-6">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white tracking-tight">
              Supabase Configuration Required
            </h1>
            <p className="text-sm text-neutral-400 mt-1">
              Backend services are currently unconfigured. To publish and read flipbooks, configure your Supabase environment credentials.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
            <Key className="w-4 h-4 text-red-400" />
            Missing Environment Variables
          </h2>
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-2">
            {missingVars.map((varName) => (
              <div
                key={varName}
                className="flex items-center gap-3 text-sm font-mono text-red-300 bg-red-950/30 px-3 py-2 rounded-lg border border-red-900/30"
              >
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                {varName}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
            <Terminal className="w-4 h-4 text-amber-400" />
            Setup Instructions
          </h2>
          <ol className="text-sm text-neutral-300 space-y-2 list-decimal list-inside bg-neutral-950/50 p-4 rounded-xl border border-neutral-800/80">
            <li>
              Create a file named <code className="text-amber-300 font-mono bg-neutral-800 px-1.5 py-0.5 rounded">.env.local</code> in the root directory.
            </li>
            <li>
              Copy the variables from <code className="text-neutral-300 font-mono bg-neutral-800 px-1.5 py-0.5 rounded">.env.example</code> into <code className="text-amber-300 font-mono bg-neutral-800 px-1.5 py-0.5 rounded">.env.local</code>.
            </li>
            <li>
              Fill in your Supabase URL and Anon Key from your Supabase Dashboard project settings.
            </li>
            <li>
              Execute the SQL schema in <code className="text-neutral-300 font-mono bg-neutral-800 px-1.5 py-0.5 rounded">supabase/schema.sql</code> inside the Supabase SQL Editor.
            </li>
            <li>Restart your Next.js development server.</li>
          </ol>
        </div>

        <div className="pt-4 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
          <span>Digital Flipbook Publishing Platform</span>
          <a
            href="https://supabase.com/docs"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-amber-400 hover:underline"
          >
            Supabase Docs <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
