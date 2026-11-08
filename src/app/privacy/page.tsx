import React from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ArrowLeft, Shield, Lock, Trash2, EyeOff } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-bg)]">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary)] hover:underline transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Kashef Analysis</span>
          </Link>
        </div>

        <article className="card p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="pill border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)] text-[11px]">
                Privacy Policy
              </span>
              <h1 className="text-xl font-bold text-[var(--color-text)] mt-1">
                Data Privacy & Ephemeral Processing Commitment
              </h1>
            </div>
          </div>

          <div className="space-y-6 text-sm text-[var(--color-text-muted)] leading-relaxed">
            <p className="text-[var(--color-text)]">
              Kashef is built by Dr. Raouf Roshdy with an uncompromising commitment to document privacy, academic confidentiality, and data minimization.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
              <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center mb-2">
                  <Lock className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-[var(--color-text)] text-xs mb-1">In-Memory Only</h3>
                <p className="text-xs text-[var(--color-text-muted)]">
                  All uploaded documents (.docx, .pdf), fetched URLs, and pasted texts are processed exclusively in transient server memory.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center mb-2">
                  <Trash2 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-[var(--color-text)] text-xs mb-1">Immediate Discard</h3>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Once analysis signals and the response payload are delivered to your browser session, memory buffers are immediately garbage collected and destroyed.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center mb-2">
                  <EyeOff className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-[var(--color-text)] text-xs mb-1">No Model Training</h3>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Your submitted materials are never saved to persistent disks, database tables, analytics trackers, or used to train any AI models.
                </p>
              </div>
            </div>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-[var(--color-text)]">1. Data Storage & Retention</h2>
              <p>
                We do not operate any persistent document store, database, or cloud cache for user-submitted content. No logs contain the full text or identifiable excerpts of your files.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-[var(--color-text)]">2. Zero External Model Calls</h2>
              <p>
                Kashef does NOT call any external LLM classifier APIs (e.g. Gemini, OpenAI, Claude). All statistical stylometry is performed strictly in-process by the local heuristics engine. If external classifiers are integrated in a future phase, this section will be updated with explicit zero-data-retention disclosure.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-[var(--color-text)]">3. SSRF Protection for URL Ingestion</h2>
              <p>
                When an article URL is analyzed, our server fetches the target content via a hardened proxy that validates destination hostnames and blocks private, internal, or loopback network addresses (including 127.0.0.1, 10.0.0.0/8, 192.168.0.0/16, and cloud metadata services).
              </p>
            </section>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
