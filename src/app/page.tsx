import React from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { InputTabs } from '@/components/InputTabs';
import { ShieldCheck, BarChart3, Search, Sparkles } from 'lucide-react';

export default function Home() {
  return (
    <div className="wrap flex flex-col min-h-screen">
      <Header />

      <main id="main-content" className="solo my-8">
        {/* Hero Section */}
        <section className="text-center mb-8 px-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>Phase 1 Architecture Scaffold · Statistical & LLM Proxy Engine</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-2">
            AI Text Authorship & Integrity Estimation
          </h2>
          <p className="text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Kashef analyzes digital text against statistical language patterns (perplexity, burstiness, vocabulary diversity) and verified model classifier APIs with complete probabilistic transparency.
          </p>
        </section>

        {/* Core Input Card & Tabs */}
        <section className="card mb-8">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
            <div>
              <span className="pill">Input Document</span>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                Select Analysis Source
              </h3>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Memory Only (Zero Data Storage)</span>
            </div>
          </div>

          <InputTabs />
        </section>

        {/* Feature Highlights Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center mb-3">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">
              Multi-Signal Statistical Proxies
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Calculates perplexity indicators, sentence length burstiness, repetition rates, and lexical richness.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center mb-3">
              <Search className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">
              Per-Paragraph Heat-Mapping
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Provides granular paragraph-level scoring rather than a crude overall black-box label.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center mb-3">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">
              Strict Non-Verdict Transparency
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Permanent probabilistic disclaimers ensure results are treated as supportive signals, never disciplinary verdicts.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
