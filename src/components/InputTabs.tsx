'use client';

import React, { useState } from 'react';
import { UploadCloud, Globe, FileText, Info } from 'lucide-react';

type TabType = 'upload' | 'url' | 'paste';

export const InputTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('upload');

  return (
    <div className="w-full">
      {/* Live Region for Screen Readers & Analysis Feedback */}
      <div 
        id="analysis-status-region" 
        role="status" 
        aria-live="polite" 
        className="visually-hidden"
      >
        Current input mode: {activeTab === 'upload' ? 'Document file upload' : activeTab === 'url' ? 'Web article URL' : 'Pasted direct text'}
      </div>

      {/* Tabs Header */}
      <div
        role="tablist"
        aria-label="Document input sources"
        className="flex flex-row border border-[var(--color-border)] rounded-xl overflow-hidden bg-[var(--color-bg)] mb-6 p-1"
      >
        <button
          type="button"
          role="tab"
          id="tab-upload"
          aria-selected={activeTab === 'upload'}
          aria-controls="tabpanel-upload"
          tabIndex={activeTab === 'upload' ? 0 : -1}
          onClick={() => setActiveTab('upload')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 min-h-[44px] text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === 'upload'
              ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm border border-[var(--color-border)]'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          <UploadCloud className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Upload Document</span>
          <span className="hidden sm:inline text-[11px] font-normal text-[var(--color-text-muted)]">(.docx, .pdf)</span>
        </button>

        <button
          type="button"
          role="tab"
          id="tab-url"
          aria-selected={activeTab === 'url'}
          aria-controls="tabpanel-url"
          tabIndex={activeTab === 'url' ? 0 : -1}
          onClick={() => setActiveTab('url')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 min-h-[44px] text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === 'url'
              ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm border border-[var(--color-border)]'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          <Globe className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Article URL</span>
          <span className="hidden sm:inline text-[11px] font-normal text-[var(--color-text-muted)]">(Web Page)</span>
        </button>

        <button
          type="button"
          role="tab"
          id="tab-paste"
          aria-selected={activeTab === 'paste'}
          aria-controls="tabpanel-paste"
          tabIndex={activeTab === 'paste' ? 0 : -1}
          onClick={() => setActiveTab('paste')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 min-h-[44px] text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === 'paste'
              ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm border border-[var(--color-border)]'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          <FileText className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Pasted Text</span>
          <span className="hidden sm:inline text-[11px] font-normal text-[var(--color-text-muted)]">(Secondary)</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="card">
        {/* TAB 1: FILE UPLOAD */}
        {activeTab === 'upload' && (
          <div
            role="tabpanel"
            id="tabpanel-upload"
            aria-labelledby="tab-upload"
            className="space-y-4"
          >
            <div className="border-2 border-dashed border-[var(--color-border)] rounded-xl p-8 sm:p-12 text-center hover:border-[var(--color-primary)] transition-colors bg-[var(--color-bg)]/40">
              <div className="w-12 h-12 mx-auto rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center mb-4">
                <UploadCloud className="w-6 h-6" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--color-text)] mb-1">
                Drag and drop your document here, or browse
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] mb-5">
                Accepts Microsoft Word (<strong>.docx</strong>) and Adobe PDF (<strong>.pdf</strong>) up to 10 MB.
              </p>
              <div>
                <label
                  htmlFor="file-upload-input"
                  className="inline-flex items-center justify-center px-5 py-2.5 min-h-[44px] rounded-lg bg-[#1a5c8a] dark:bg-[#4da8da] text-white dark:text-[#0f1720] text-xs font-semibold shadow-sm cursor-pointer hover:opacity-95 transition-opacity"
                >
                  Choose Document File
                </label>
                <input
                  id="file-upload-input"
                  type="file"
                  accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="visually-hidden"
                />
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
              <Info className="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                <strong>Document Requirements:</strong> Minimum 250 words. PDF files must have an extractable digital text layer (scanned images will report a clear advisory message; OCR is planned for a later phase).
              </span>
            </div>
          </div>
        )}

        {/* TAB 2: ARTICLE URL */}
        {activeTab === 'url' && (
          <div
            role="tabpanel"
            id="tabpanel-url"
            aria-labelledby="tab-url"
            className="space-y-4"
          >
            <div>
              <label htmlFor="url-input" className="block text-xs font-semibold text-[var(--color-text)] mb-2">
                Article Web Address
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="url-input"
                  type="url"
                  placeholder="https://example.com/article"
                  className="flex-1 bg-[var(--color-bg)] focus:bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3.5 py-2.5 min-h-[44px] text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-border-focus)] transition-colors"
                />
                <button
                  type="button"
                  disabled
                  className="px-5 py-2.5 min-h-[44px] rounded-lg bg-[#1a5c8a] dark:bg-[#4da8da] text-white dark:text-[#0f1720] text-xs font-semibold opacity-60 cursor-not-allowed shadow-sm"
                >
                  Fetch & Analyze
                </button>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
              <Info className="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                <strong>Security Guardrails:</strong> Server-side extraction isolates the main article content and strips ads and navigation. Private network ranges, loopback, and cloud metadata IPs are strictly blocked (SSRF mitigation).
              </span>
            </div>
          </div>
        )}

        {/* TAB 3: PASTED TEXT */}
        {activeTab === 'paste' && (
          <div
            role="tabpanel"
            id="tabpanel-paste"
            aria-labelledby="tab-paste"
            className="space-y-4"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="paste-input" className="block text-xs font-semibold text-[var(--color-text)]">
                  Paste Text Content
                </label>
                <span className="text-[11px] text-[var(--color-text-muted)]">
                  Minimum 250 words
                </span>
              </div>
              <textarea
                id="paste-input"
                rows={7}
                placeholder="Paste English text here to estimate probabilistic AI authorship..."
                className="w-full bg-[var(--color-bg)] focus:bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-3.5 text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-border-focus)] transition-colors resize-y"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                disabled
                className="px-5 py-2.5 min-h-[44px] rounded-lg bg-[#1a5c8a] dark:bg-[#4da8da] text-white dark:text-[#0f1720] text-xs font-semibold opacity-60 cursor-not-allowed shadow-sm"
              >
                Analyze Text (Phase 2)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
