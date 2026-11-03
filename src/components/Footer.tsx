import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShieldAlert, FileText, Lock, ExternalLink } from 'lucide-react';
import { GithubIcon } from './GithubIcon';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-200 bg-slate-100 text-slate-600 text-xs py-10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Mandatory Honesty & Academic Integrity Disclaimer */}
        <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-200/90 flex items-start gap-3 mb-8 shadow-xs">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-[11px] text-amber-950 leading-relaxed">
            <strong className="font-bold text-amber-900 block mb-0.5">
              Probabilistic Assessment Notice & Academic Integrity Disclaimer:
            </strong>
            Kashef generates probabilistic estimates based on statistical proxy signals and language model classifiers. All AI detectors can produce false positives and false negatives. Scores must never be interpreted as definitive verdicts, proof of authorship, or used as the sole basis for academic, disciplinary, or administrative decisions. Human peer review and editorial context remain essential.
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand & Investigator */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-7 h-7 rounded-lg bg-teal-700 text-white flex items-center justify-center shadow-xs">
                <span className="font-bold text-sm">K</span>
              </div>
              <span className="font-bold text-base text-slate-900">Kashef</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 uppercase">
                Probabilistic Suite
              </span>
            </div>
            <p className="text-slate-600 text-xs leading-relaxed max-w-md mb-4">
              AI text and document integrity analyzer built with transparent proxy metrics, per-paragraph signal breakdown, in-memory privacy preservation, and strict non-verdict reporting.
            </p>
            <div className="flex items-center gap-3">
              <Image
                src="/dr-raouf.jpg"
                alt="Dr. Raouf Roshdy"
                width={36}
                height={36}
                className="w-9 h-9 rounded-full object-cover border-2 border-teal-600/40 shrink-0 shadow-xs"
              />
              <div>
                <div className="text-xs font-bold text-slate-900">Dr. Raouf Roshdy</div>
                <div className="text-[11px] text-teal-700 font-semibold">Lead Investigator & Creator</div>
              </div>
            </div>
          </div>

          {/* Core Principles & Privacy */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Privacy & Integrity
            </h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-teal-600" />
                <span>Zero text persistence</span>
              </li>
              <li className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-teal-600" />
                <Link href="/privacy" className="hover:text-teal-700 underline underline-offset-2">
                  Privacy Statement
                </Link>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
                <span>SSRF protected URL reader</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
                <span>Bilingual layout (LTR / RTL ready)</span>
              </li>
            </ul>
          </div>

          {/* Repos & Suite Links */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Repositories & Source
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://github.com/roroleaks/kashef"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-teal-700 flex items-center gap-1.5"
                >
                  <GithubIcon className="w-3.5 h-3.5" />
                  <span>GitHub: roroleaks/kashef</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/roroleaks"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-teal-700 flex items-center gap-1.5"
                >
                  <GithubIcon className="w-3.5 h-3.5" />
                  <span>GitHub Profile: roroleaks</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>
            © {new Date().getFullYear()} Kashef • Dr. Raouf Roshdy (roroleaks). All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <span>Next.js 15 & TypeScript</span>
            <span>•</span>
            <span>Tailwind CSS</span>
            <span>•</span>
            <span>Deployable to Vercel</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
