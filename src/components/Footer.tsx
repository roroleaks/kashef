import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="footer" role="contentinfo">
      <div className="container space-y-2">
        {/* Line 1: Disclaimer Line */}
        <p className="text-xs text-[var(--color-text-muted)] max-w-3xl mx-auto leading-relaxed">
          Reference aid — does not replace human editorial judgement. Results are probabilistic indicators and must never be used as the sole basis for academic, disciplinary, or administrative decisions.
        </p>

        {/* Line 2: One External Link */}
        <p>
          <a
            href="https://github.com/roroleaks/kashef"
            target="_blank"
            rel="noopener"
            className="text-xs font-medium text-[var(--color-primary)] hover:underline"
          >
            View source and documentation on GitHub
            <span className="visually-hidden"> (opens in a new tab)</span>→
          </a>
        </p>

        {/* Line 3: Credit Line */}
        <p className="credit text-xs font-semibold text-[var(--color-text)]">
          Created by Dr. Raouf Roshdy
        </p>
      </div>
    </footer>
  );
};
