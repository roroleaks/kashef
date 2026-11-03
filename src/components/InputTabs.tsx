'use client';

import React, { useState } from 'react';
import { UploadCloud, Globe, FileText, AlertCircle, Info } from 'lucide-react';

type TabType = 'upload' | 'url' | 'paste';

export const InputTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('upload');

  return (
    <div className="w-full">
      {/* Tab Header (Segmented Sysrevai / Preppt Stepper Style) */}
      <div 
        role="tablist" 
        aria-label="Input Methods"
        className="flex flex-row border border-slate-300 rounded-xl overflow-hidden bg-slate-50 mb-6 p-1 shadow-xs"
      >
        <button
          type="button"
          role="tab"
          id="tab-upload"
          aria-selected={activeTab === 'upload'}
          aria-controls="tabpanel-upload"
          tabIndex={activeTab === 'upload' ? 0 : -1}
          onClick={() => setActiveTab('upload')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === 'upload'
              ? 'bg-white text-teal-800 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <UploadCloud className={`w-4 h-4 ${activeTab === 'upload' ? 'text-teal-700' : 'text-slate-500'}`} />
          <span>Upload Document</span>
          <span className="hidden sm:inline text-[11px] font-normal text-slate-400">(.docx, .pdf)</span>
        </button>

        <button
          type="button"
          role="tab"
          id="tab-url"
          aria-selected={activeTab === 'url'}
          aria-controls="tabpanel-url"
          tabIndex={activeTab === 'url' ? 0 : -1}
          onClick={() => setActiveTab('url')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === 'url'
              ? 'bg-white text-teal-800 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <Globe className={`w-4 h-4 ${activeTab === 'url' ? 'text-teal-700' : 'text-slate-500'}`} />
          <span>Article URL</span>
          <span className="hidden sm:inline text-[11px] font-normal text-slate-400">(Web Page)</span>
        </button>

        <button
          type="button"
          role="tab"
          id="tab-paste"
          aria-selected={activeTab === 'paste'}
          aria-controls="tabpanel-paste"
          tabIndex={activeTab === 'paste' ? 0 : -1}
          onClick={() => setActiveTab('paste')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === 'paste'
              ? 'bg-white text-teal-800 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <FileText className={`w-4 h-4 ${activeTab === 'paste' ? 'text-teal-700' : 'text-slate-500'}`} />
          <span>Paste Text</span>
          <span className="hidden sm:inline text-[11px] font-normal text-slate-400">(Direct)</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs">
        {/* TAB 1: FILE UPLOAD */}
        {activeTab === 'upload' && (
          <div 
            role="tabpanel" 
            id="tabpanel-upload" 
            aria-labelledby="tab-upload"
            className="space-y-4"
          >
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 sm:p-12 text-center hover:border-teal-600 transition-colors bg-slate-50/50">
              <div className="w-12 h-12 mx-auto rounded-full bg-teal-50 text-teal-700 flex items-center justify-center mb-4">
                <UploadCloud className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800 mb-1">
                Choose a document or drag it here
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Supports Microsoft Word (<strong>.docx</strong>) and Adobe PDF (<strong>.pdf</strong>) up to 10 MB.
              </p>
              <div className="inline-flex items-center gap-2">
                <label 
                  htmlFor="file-input" 
                  className="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors"
                >
                  Select File
                </label>
                <input 
                  id="file-input" 
                  type="file" 
                  accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
                  className="sr-only" 
                />
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
              <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <span>
                <strong>Document Requirements:</strong> Minimum text length of 250 words. PDF documents must have an extractable digital text layer (scanned images without OCR will be flagged).
              </span>
            </div>
          </div>
        )}

        {/* TAB 2: URL INPUT */}
        {activeTab === 'url' && (
          <div 
            role="tabpanel" 
            id="tabpanel-url" 
            aria-labelledby="tab-url"
            className="space-y-4"
          >
            <div>
              <label htmlFor="url-input" className="block text-xs font-semibold text-slate-700 mb-2">
                Web Article or Document URL
              </label>
              <div className="flex gap-2">
                <input
                  id="url-input"
                  type="url"
                  placeholder="https://example.com/article"
                  className="flex-1 bg-slate-50 focus:bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition-all"
                />
                <button
                  type="button"
                  disabled
                  className="px-4 py-2.5 rounded-lg bg-teal-700 text-white text-xs font-semibold opacity-60 cursor-not-allowed shadow-xs"
                >
                  Fetch & Analyze
                </button>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
              <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <span>
                <strong>Security Protection:</strong> Server-side extraction parses the main article text and strips navigation, boilerplate, and ads. Private IPs, localhost, and internal cloud addresses are blocked (SSRF protection).
              </span>
            </div>
          </div>
        )}

        {/* TAB 3: DIRECT TEXT PASTE */}
        {activeTab === 'paste' && (
          <div 
            role="tabpanel" 
            id="tabpanel-paste" 
            aria-labelledby="tab-paste"
            className="space-y-4"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="paste-textarea" className="block text-xs font-semibold text-slate-700">
                  Paste Document Text
                </label>
                <span className="text-[11px] text-slate-400">
                  Minimum 250 words
                </span>
              </div>
              <textarea
                id="paste-textarea"
                rows={8}
                placeholder="Paste English text here for probabilistic AI authorship estimation..."
                className="w-full bg-slate-50 focus:bg-white border border-slate-300 rounded-lg p-3.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition-all resize-y"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                disabled
                className="px-5 py-2.5 rounded-lg bg-teal-700 text-white text-xs font-semibold opacity-60 cursor-not-allowed shadow-xs"
              >
                Analyze Text (Ready in Phase 2)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
