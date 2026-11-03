import React from 'react';
import Image from 'next/image';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { InputTabs } from '@/components/InputTabs';
import { BarChart2, Layers, Download } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="container my-8 flex-1">
        {/* Eyebrow & Hero Section with Author Profile on the right */}
        <div className="mb-8 p-6 sm:p-8 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] text-[11px] font-bold uppercase tracking-[0.14em] mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] animate-pulse" />
              Linguistic Analysis & Document Integrity
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text)]">
              Kashef — AI Authorship & Origin Estimation
            </h2>
            <p className="mt-2 text-sm text-[var(--color-text-muted)] leading-relaxed">
              Multi-signal probabilistic evaluation combining statistical language proxies (sentence burstiness, transition entropy, lexical diversity) with server-side model classifiers.
            </p>
          </div>

          {/* Dr. Raouf Roshdy Photo Card at the right of the first page */}
          <div className="flex items-center gap-4 shrink-0 bg-[var(--color-bg)] p-4 rounded-xl border border-[var(--color-border)] self-start md:self-center shadow-xs">
            <Image
              src="/dr-raouf-roshdy.jpg"
              alt="Dr. Raouf Roshdy"
              width={80}
              height={80}
              className="size-16 sm:size-20 rounded-full object-cover ring-2 ring-[var(--color-primary)]/30 shadow-sm"
            />
            <div>
              <p className="text-sm font-bold text-[var(--color-text)] tracking-tight">
                Dr. Raouf Roshdy
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Lead Clinical & AI Researcher
              </p>
              <span className="inline-flex items-center mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                Author & Platform Architect
              </span>
            </div>
          </div>
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
