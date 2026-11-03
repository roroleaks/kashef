import React from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ArrowLeft, Shield, Lock, Trash2, EyeOff } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="wrap flex flex-col min-h-screen">
      <Header />

      <main className="solo my-8">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Kashef Analysis</span>
          </Link>
        </div>

        <article className="card p-8">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="pill">Privacy Policy</span>
              <h1 className="text-xl font-bold text-slate-900 mt-1">
                Data Privacy & Ephemeral Processing Commitment
              </h1>
            </div>
          </div>

          <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
            <p>
              Kashef is built by Dr. Raouf Roshdy with an uncompromising commitment to document privacy, academic confidentiality, and data minimization.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center mb-2">
                  <Lock className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-xs mb-1">In-Memory Only</h3>
                <p className="text-xs text-slate-600">
                  All uploaded documents (.docx, .pdf), fetched URLs, and pasted texts are processed exclusively in transient server memory.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center mb-2">
                  <Trash2 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-xs mb-1">Immediate Discard</h3>
                <p className="text-xs text-slate-600">
                  Once analysis signals and the response payload are delivered to your browser session, memory buffers are immediately garbage collected and destroyed.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center mb-2">
                  <EyeOff className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-xs mb-1">No Model Training</h3>
                <p className="text-xs text-slate-600">
                  Your submitted materials are never saved to persistent disks, database tables, analytics trackers, or used to train any AI models.
                </p>
              </div>
            </div>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-slate-900">1. Data Storage & Retention</h2>
              <p>
                We do not operate any persistent document store, database, or cloud cache for user-submitted content. No logs contain the full text or identifiable excerpts of your files.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-slate-900">2. External Classifier Invocations</h2>
              <p>
                When calling external LLM classifier APIs (e.g. Gemini, OpenAI, Claude), requests are executed strictly server-side using zero-data-retention enterprise API endpoints. Client browser code never receives or exposes API secret keys.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-slate-900">3. SSRF Protection for URL Ingestion</h2>
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
