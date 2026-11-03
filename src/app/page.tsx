import React from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { InputTabs } from '@/components/InputTabs';
import { ShieldCheck, BarChart2, Layers, Download } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="container my-8 flex-1">
        {/* Eyebrow & Hero Section (matching AIFV PageHeader pattern) */}
        <div className="mb-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-primary)] mb-1">
            Linguistic Analysis & Document Integrity
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text)]">
            Kashef — AI Authorship & Origin Estimation
          </h2>
          <p className="mt-2 text-sm text-[var(--color-text-muted)] max-w-2xl leading-relaxed">
            Multi-signal probabilistic evaluation combining statistical language proxies (burstiness, perplexity indicators, lexical diversity) with server-side model classifiers.
          </p>
        </div>

        {/* Input Interface */}
        <section aria-label="Analysis Input" className="mb-10">
          <InputTabs />
        </section>

        {/* Pipeline Architecture Highlights */}
        <section aria-label="System Capabilities" className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          <div className="card">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center mb-3">
              <BarChart2 className="w-4 h-4" aria-hidden="true" />
            </div>
            <h3 className="text-sm font-bold text-[var(--color-text)] mb-1">
              Statistical Language Proxies
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              Calculates sentence-length burstiness, transition entropy, repetition index, and vocabulary richness without external leaks.
            </p>
          </div>

          <div className="card">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center mb-3">
              <Layers className="w-4 h-4" aria-hidden="true" />
            </div>
            <h3 className="text-sm font-bold text-[var(--color-text)] mb-1">
              Per-Paragraph Heat-Map
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              Provides granular paragraph-level highlighting with individual proxy scores rather than an opaque binary verdict.
            </p>
          </div>

          <div className="card">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center mb-3">
              <Download className="w-4 h-4" aria-hidden="true" />
            </div>
            <h3 className="text-sm font-bold text-[var(--color-text)] mb-1">
              Multi-Format Export
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              Following the AIFV export pattern: print-ready PDF, structured JSON, and Markdown summaries with persistent disclaimers.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
