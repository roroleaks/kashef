import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck } from 'lucide-react';
import { GithubIcon } from './GithubIcon';

export const Header: React.FC = () => {
  return (
    <header className="hdr sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center gap-3 cursor-pointer select-none group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 via-emerald-500 to-cyan-500 p-[1.5px] shadow-sm shadow-teal-900/30 group-hover:scale-105 transition-all duration-300">
            <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-teal-700" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xl tracking-tight text-white group-hover:text-teal-200 transition-colors">
                Kashef
              </span>
              <span className="version-badge">
                v1.0
              </span>
            </div>
            <p className="text-xs text-teal-100/90 hidden sm:block">
              AI Authorship & Document Integrity Platform
            </p>
          </div>
        </Link>

        {/* Center Tagline / Mission */}
        <div className="hidden md:block text-center">
          <h1 className="text-sm font-semibold text-white/95 tracking-wide">
            Probabilistic AI Text Estimation & Evidence Breakdown
          </h1>
          <p className="text-xs text-teal-100/80 italic mt-0.5">
            Statistical Proxy Signals • Multi-Factor Verification • Strict Non-Verdict Transparency
          </p>
        </div>

        {/* Right Tools & Author Badge */}
        <div className="flex items-center gap-3">
          {/* GitHub Link */}
          <a
            href="https://github.com/roroleaks/kashef"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/25 transition-all text-xs font-medium"
            title="Kashef on GitHub"
          >
            <GithubIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">roroleaks/kashef</span>
          </a>

          {/* Lead Investigator Badge */}
          <div className="flex items-center gap-2 pl-2 border-l border-white/20">
            <div className="relative">
              <Image
                src="/dr-raouf.jpg"
                alt="Dr. Raouf Roshdy"
                width={36}
                height={36}
                className="w-9 h-9 rounded-full object-cover border-2 border-white/60 shadow-xs"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-teal-900"></span>
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold text-white leading-tight">Dr. Raouf Roshdy</div>
              <div className="text-[10px] text-teal-200 font-semibold">Lead Investigator</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
