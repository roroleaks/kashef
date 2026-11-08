'use client';

import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  Globe,
  FileText,
  Info,
  Loader2,
  AlertTriangle,
  RotateCcw,
  ShieldAlert,
  Download,
} from 'lucide-react';
import type { DetectionResult } from '@/lib/detectors/types';

type TabType = 'upload' | 'url' | 'paste';

interface ApiResponse {
  success: boolean;
  source?: string;
  wordCount?: number;
  language?: string;
  isEnglish?: boolean;
  warning?: string;
  analysis?: DetectionResult;
  error?: string;
  message?: string;
}

export const InputTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state for new analysis
  const handleReset = () => {
    setResult(null);
    setErrorMessage(null);
    setSelectedFileName(null);
    setUrlInput('');
    setPastedText('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Helper to send analysis request
  const submitAnalysis = async (body: FormData | string, isFormData: boolean) => {
    setIsLoading(true);
    setErrorMessage(null);
    setResult(null);
    setLoadingMessage('Processing in memory...');

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: isFormData ? undefined : { 'Content-Type': 'application/json' },
        body,
      });

      const data: ApiResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || data.error || 'Analysis failed. Please check your input.');
      }

      setResult(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Handle File Upload
  const handleFileSelected = (file: File) => {
    const nameLower = file.name.toLowerCase();
    if (!nameLower.endsWith('.docx') && !nameLower.endsWith('.pdf')) {
      setErrorMessage('Unsupported file format. Please upload a .docx or .pdf document.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('File size exceeds the maximum allowed limit of 10 MB.');
      return;
    }

    setSelectedFileName(file.name);
    const formData = new FormData();
    formData.append('file', file);
    setLoadingMessage(`Extracting ${file.name} in volatile memory...`);
    submitAnalysis(formData, true);
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelected(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelected(file);
  };

  // 2. Handle URL Submit
  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setErrorMessage('Please enter a valid web article URL.');
      return;
    }
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setErrorMessage('URL must begin with http:// or https://');
      return;
    }

    setLoadingMessage(`Fetching article from ${trimmed}...`);
    submitAnalysis(JSON.stringify({ url: trimmed }), false);
  };

  // 3. Handle Pasted Text Submit
  const handlePasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = pastedText.trim();
    if (!trimmed) {
      setErrorMessage('Please paste text to analyze.');
      return;
    }
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length < 250) {
      setErrorMessage(
        `Insufficient text: Input contains ${words.length} words. A minimum of 250 words is required for reliable statistical stylometry.`
      );
      return;
    }

    setLoadingMessage('Evaluating statistical linguistic proxies...');
    submitAnalysis(JSON.stringify({ text: trimmed }), false);
  };

  const handleDownloadJson = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kashef-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const analysis = result?.analysis;

  return (
    <div className="w-full space-y-6">
      {/* Live Region for Screen Readers */}
      <div id="analysis-status-region" role="status" aria-live="polite" className="visually-hidden">
        {isLoading ? loadingMessage : errorMessage ? `Error: ${errorMessage}` : result ? 'Analysis complete' : ''}
      </div>

      {/* Input Selection Tabs */}
      {!result && (
        <div
          role="tablist"
          aria-label="Document input sources"
          className="flex flex-row border border-[var(--color-border)] rounded-xl overflow-hidden bg-[var(--color-bg)] p-1"
        >
          <button
            type="button"
            role="tab"
            id="tab-upload"
            aria-selected={activeTab === 'upload'}
            aria-controls="tabpanel-upload"
            onClick={() => { setActiveTab('upload'); setErrorMessage(null); }}
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
            onClick={() => { setActiveTab('url'); setErrorMessage(null); }}
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
            onClick={() => { setActiveTab('paste'); setErrorMessage(null); }}
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
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
          <div className="flex-1">
            <p className="font-semibold">Analysis Request Failed</p>
            <p className="text-xs mt-0.5 opacity-90 leading-relaxed">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs underline hover:no-underline font-medium cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Input Form Panels */}
      {!result && (
        <div className="card">
          {/* TAB 1: FILE UPLOAD */}
          {activeTab === 'upload' && (
            <div
              role="tabpanel"
              id="tabpanel-upload"
              aria-labelledby="tab-upload"
              className="space-y-4"
            >
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-colors bg-[var(--color-bg)]/40 ${
                  isDragging
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]/20'
                    : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
                }`}
              >
                <div className="w-12 h-12 mx-auto rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center mb-4">
                  {isLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <UploadCloud className="w-6 h-6" aria-hidden="true" />
                  )}
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
                    className={`inline-flex items-center justify-center px-5 py-2.5 min-h-[44px] rounded-lg bg-[#1a5c8a] dark:bg-[#4da8da] text-white dark:text-[#0f1720] text-xs font-semibold shadow-sm cursor-pointer hover:opacity-95 transition-opacity ${
                      isLoading ? 'pointer-events-none opacity-60' : ''
                    }`}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing Document...
                      </span>
                    ) : (
                      'Choose Document File'
                    )}
                  </label>
                  <input
                    ref={fileInputRef}
                    id="file-upload-input"
                    type="file"
                    accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={onFileInputChange}
                    disabled={isLoading}
                    className="visually-hidden"
                  />
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
                <Info className="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  <strong>Document Requirements:</strong> Minimum 250 words. PDF files must contain an extractable text layer (scanned images will report a clear advisory; OCR is out of scope for this phase). Files are processed purely in volatile RAM.
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: ARTICLE URL */}
          {activeTab === 'url' && (
            <form
              onSubmit={handleUrlSubmit}
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
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/research-paper"
                    disabled={isLoading}
                    required
                    className="flex-1 bg-[var(--color-bg)] focus:bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3.5 py-2.5 min-h-[44px] text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-border-focus)] transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !urlInput.trim()}
                    className="inline-flex items-center justify-center px-5 py-2.5 min-h-[44px] rounded-lg bg-[#1a5c8a] dark:bg-[#4da8da] text-white dark:text-[#0f1720] text-xs font-semibold shadow-sm hover:opacity-95 disabled:opacity-50 transition-opacity cursor-pointer shrink-0"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Fetching & Analyzing...
                      </span>
                    ) : (
                      'Analyze Web Article'
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
                <Info className="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  <strong>Security Guardrails:</strong> Target host is checked against private/internal subnets with socket connection IP pinning to reduce DNS rebinding windows. Redirects capped at 3 hops; max download 10 MB; timeout 8 seconds.
                </span>
              </div>
            </form>
          )}

          {/* TAB 3: PASTED DIRECT TEXT */}
          {activeTab === 'paste' && (
            <form
              onSubmit={handlePasteSubmit}
              role="tabpanel"
              id="tabpanel-paste"
              aria-labelledby="tab-paste"
              className="space-y-4"
            >
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="paste-textarea" className="block text-xs font-semibold text-[var(--color-text)]">
                    Direct Text Input
                  </label>
                  <span className="text-[11px] text-[var(--color-text-muted)]">
                    {pastedText.trim().split(/\s+/).filter(Boolean).length} words (min. 250)
                  </span>
                </div>
                <textarea
                  id="paste-textarea"
                  rows={8}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste academic article or text excerpt here for multi-signal statistical evaluation..."
                  disabled={isLoading}
                  className="w-full bg-[var(--color-bg)] focus:bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-3 text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-border-focus)] transition-colors resize-y"
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setPastedText('')}
                  className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
                >
                  Clear text
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !pastedText.trim()}
                  className="inline-flex items-center justify-center px-6 py-2.5 min-h-[44px] rounded-lg bg-[#1a5c8a] dark:bg-[#4da8da] text-white dark:text-[#0f1720] text-xs font-semibold shadow-sm hover:opacity-95 disabled:opacity-50 transition-opacity cursor-pointer"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Evaluating Stylometry...
                    </span>
                  ) : (
                    'Analyze Pasted Text'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ANALYSIS RESULT PRESENTATION */}
      {result && analysis && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Header Action Bar */}
          <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs">
            <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
              <span>Source: <strong>{result.source || selectedFileName || 'Document'}</strong></span>
              <span>•</span>
              <span>{result.wordCount} words</span>
              <span>•</span>
              <span className="uppercase">{result.language || 'eng'}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadJson}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] hover:bg-[var(--color-primary-light)] text-xs font-semibold text-[var(--color-text)] transition-colors cursor-pointer"
                title="Download structured JSON assessment report"
              >
                <Download className="w-3.5 h-3.5" />
                Export JSON
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] hover:bg-[var(--color-primary-light)] text-xs font-semibold text-[var(--color-text)] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                New Analysis
              </button>
            </div>
          </div>

          {/* Primary Result Card */}
          <div className="card space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--color-border)]">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)] mb-1">
                  Probabilistic Assessment Verdict
                </p>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-sm font-bold border shadow-xs ${
                      analysis.label === 'Likely human'
                        ? 'bg-[var(--color-ai-human-bg)] text-[var(--color-ai-human)] border-[var(--color-ai-human-border)]'
                        : analysis.label === 'Likely AI-assisted'
                        ? 'bg-[var(--color-ai-high-bg)] text-[var(--color-ai-high)] border-[var(--color-ai-high-border)]'
                        : 'bg-[var(--color-ai-mixed-bg)] text-[var(--color-ai-mixed)] border-[var(--color-ai-mixed-border)]'
                    }`}
                  >
                    {analysis.label}
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    Confidence: <strong>{Math.round(analysis.confidence * 100)}%</strong>
                  </span>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[11px] uppercase font-bold text-[var(--color-text-muted)] block mb-1">
                  Estimated Probability Range
                </span>
                <span className="text-xl sm:text-2xl font-extrabold text-[var(--color-text)] tracking-tight">
                  {Math.round(analysis.score[0] * 100)}% – {Math.round(analysis.score[1] * 100)}%
                </span>
              </div>
            </div>

            {/* Probability Scale Visualization */}
            <div>
              <div className="flex justify-between text-xs font-medium text-[var(--color-text-muted)] mb-2">
                <span>0% (Human Baselines)</span>
                <span>50% (Transition Zone)</span>
                <span>100% (High AI Machine Likelihood)</span>
              </div>
              <div className="w-full h-3 bg-gray-200 dark:bg-gray-800 rounded-full relative overflow-hidden">
                <div
                  className={`absolute top-0 bottom-0 rounded-full transition-all duration-500 ${
                    analysis.label === 'Likely human'
                      ? 'bg-[var(--color-ai-human)]'
                      : analysis.label === 'Likely AI-assisted'
                      ? 'bg-[var(--color-ai-high)]'
                      : 'bg-[var(--color-ai-mixed)]'
                  }`}
                  style={{
                    left: `${Math.round(analysis.score[0] * 100)}%`,
                    width: `${Math.max(5, Math.round((analysis.score[1] - analysis.score[0]) * 100))}%`,
                  }}
                />
              </div>
            </div>

            {/* Evidence Breakdown Grid (6 Signals) */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-4">
                Evaluated Linguistic Proxy Evidence (Engine A)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {analysis.evidence.map((sig, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/50 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--color-text)] capitalize">
                        {sig.name.replace(/_/g, ' ')}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          sig.direction === 'human'
                            ? 'bg-[var(--color-ai-human-bg)] text-[var(--color-ai-human)]'
                            : sig.direction === 'ai'
                            ? 'bg-[var(--color-ai-high-bg)] text-[var(--color-ai-high)]'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        {sig.direction === 'human'
                          ? 'Human-like'
                          : sig.direction === 'ai'
                          ? 'AI-like'
                          : 'Neutral'}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                      {sig.reason}
                    </p>
                    {sig.benchmark && (
                      <p className="text-[10px] text-[var(--color-text-muted)] opacity-80 pt-1 border-t border-[var(--color-border)]/50">
                        {sig.benchmark}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Paragraph Heat-Map Breakdown */}
            {analysis.paragraphs && analysis.paragraphs.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
                  Granular Paragraph Breakdown ({analysis.paragraphs.length} paragraphs)
                </h4>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {analysis.paragraphs.map((p, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border text-xs leading-relaxed transition-all ${
                        p.label === 'Likely human'
                          ? 'border-[var(--color-ai-human-border)] bg-[var(--color-ai-human-bg)]/20'
                          : p.label === 'Likely AI-assisted'
                          ? 'border-[var(--color-ai-high-border)] bg-[var(--color-ai-high-bg)]/20'
                          : p.label === 'Insufficient evidence'
                          ? 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20'
                          : 'border-[var(--color-ai-mixed-border)] bg-[var(--color-ai-mixed-bg)]/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-[var(--color-text)]">
                          Paragraph #{idx + 1} ({p.wordCount} words)
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-[var(--color-text)]">
                            {Math.round(p.score[0] * 100)}% – {Math.round(p.score[1] * 100)}%
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                              p.label === 'Likely human'
                                ? 'bg-[var(--color-ai-human-bg)] text-[var(--color-ai-human)]'
                                : p.label === 'Likely AI-assisted'
                                ? 'bg-[var(--color-ai-high-bg)] text-[var(--color-ai-high)]'
                                : p.label === 'Insufficient evidence'
                                ? 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                                : 'bg-[var(--color-ai-mixed-bg)] text-[var(--color-ai-mixed)]'
                            }`}
                          >
                            {p.label}
                          </span>
                        </div>
                      </div>
                      <p className="text-[var(--color-text)] line-clamp-3 hover:line-clamp-none transition-all">
                        {p.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Methodological Limitations Warning */}
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>Methodological Boundaries & Disclaimers</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-amber-800/90 dark:text-amber-300/90 leading-relaxed pl-1">
                {analysis.limitations.map((lim, idx) => (
                  <li key={idx}>{lim}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
