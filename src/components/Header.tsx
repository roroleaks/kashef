'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';

export const Header: React.FC = () => {
  const { theme, toggle } = useTheme();

  return (
    <header className="header" role="banner">
      <div className="container header-content">
        {/* Left Side: Logo Link with App Icon */}
        <Link 
          href="/" 
          className="logo-link flex items-center gap-2.5 group select-none"
          title="Kashef Home"
          aria-label="Kashef Home, AI text authorship estimation"
        >
          <Image
            src="/app-icon.jpg"
            alt="Kashef Logo"
            width={40}
            height={40}
            className="w-10 h-10 rounded-xl object-cover shadow-sm ring-1 ring-[var(--color-border)] transition-transform group-hover:scale-105"
            priority
          />
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight text-[var(--color-text)]">
              Kashef
            </span>
            <span className="text-[11px] text-[var(--color-text-muted)] font-medium">
              Authorship Analysis
            </span>
          </div>
        </Link>

        {/* Center: Short Centered Label */}
        <div className="header-center hidden sm:inline-flex items-center gap-1.5">
          <span>Kashef AI Engine</span>
        </div>

        {/* Right Side: Info Block (Page Title, Subtitle/Source Link, Theme Toggle) */}
        <div className="flex items-center gap-4">
          <div className="header-info text-right hidden md:block">
            <h1 className="text-sm font-bold text-[var(--color-text)]">
              Probabilistic AI Authorship Estimation
            </h1>
            <p className="source-link mt-0.5">
              <a
                href="https://github.com/roroleaks/kashef"
                target="_blank"
                rel="noopener"
              >
                Source: Linguistic Proxy Architecture
                <span className="visually-hidden"> (opens in a new tab)</span>→
              </a>
            </p>
          </div>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggle}
            className="w-9 h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] flex items-center justify-center hover:bg-[var(--color-primary-light)] transition-colors cursor-pointer"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" aria-hidden="true" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
