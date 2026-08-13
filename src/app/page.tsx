'use client';

import React from 'react';
import Link from 'next/link';
import { BookOpen, Sparkles, Shield, ArrowRight, Layers, Eye, Smartphone, Zap } from 'lucide-react';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans flex flex-col selection:bg-amber-500 selection:text-neutral-950">
      <Navbar />

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center max-w-6xl w-full mx-auto px-6 py-20 space-y-16">
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400 text-xs font-semibold uppercase tracking-wider animate-pulse">
            <Sparkles className="w-3.5 h-3.5" /> Premium Digital Publishing Platform
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
            Digital documents, <br />
            <span className="bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500 bg-clip-text text-transparent">
              beautifully presented.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-neutral-400 leading-relaxed font-light">
            Transform flat PDF files into realistic, interactive 3D digital flipbooks. Read magazines, reports, and books through an immersive reading experience across any device.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/documents"
              className="w-full sm:w-auto px-8 py-4 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-2xl text-sm flex items-center justify-center gap-2 transition-all shadow-xl shadow-amber-500/10 hover:scale-105"
            >
              <BookOpen className="w-4 h-4" /> Browse Public Library
            </Link>
            <Link
              href="/admin/login"
              className="w-full sm:w-auto px-8 py-4 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 font-semibold rounded-2xl text-sm flex items-center justify-center gap-2 transition-all"
            >
              <Shield className="w-4 h-4 text-neutral-400" /> Admin Publisher Portal
            </Link>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10 border-t border-neutral-900">
          <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-3xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Realistic 3D Page Turning</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Paper shadows, subtle depth, corner folding animations, and dual-page desktop spreads.
            </p>
          </div>

          <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-3xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Mobile & Gesture Optimized</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Single-page portrait mode, touch swipe gestures, pinch zoom, and responsive viewports.
            </p>
          </div>

          <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-3xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Stable Public URLs</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Share stable links like <code className="text-amber-400 font-mono">/view/annual-report-2026</code>. Instant access with zero login required.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
