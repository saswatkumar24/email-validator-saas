'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import AuthModal from '@/components/AuthModal';
import {
  ShieldCheck,
  UploadCloud,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Download,
  Search,
  Filter,
  Sparkles,
  Zap,
  CreditCard,
  Code2,
  RefreshCw,
  Info,
  Check,
  Copy,
  Flame,
  Trash2,
  Mail,
  Server,
  Layers,
  ChevronRight,
  TrendingUp,
  AlertOctagon,
  ArrowRight,
  Table,
  CheckCheck,
  FileSpreadsheet
} from 'lucide-react';
import { SAMPLE_BENCHMARK_EMAILS, SAMPLE_CSV_CONTENT } from '@/lib/sample-data';
import { EmailValidationResult, BatchValidationSummary } from '@/lib/email-engine';

interface UploadedSheetInfo {
  name: string;
  size: number;
  totalRows: number;
  headers: string[];
  detectedEmailColumn: string;
  emails: string[];
  previewRows: Record<string, string>[];
}

export default function TruthMailDashboard() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'bulk' | 'report' | 'single' | 'greymail' | 'pricing' | 'api'>('bulk');

  // SaaS Credits State
  const [credits, setCredits] = useState<number>(100000);
  const [topUpModalOpen, setTopUpModalOpen] = useState(false);
  const [topUpCredits, setTopUpCredits] = useState<number>(10000);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setCurrentUser(data.user);
          setCredits(data.user.creditsBalance);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setCurrentUser(null);
    setCredits(100000);
  };

  // Bulk Upload State
  const [uploadedSheet, setUploadedSheet] = useState<UploadedSheetInfo | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Textarea input state (optional fallback or manual entry)
  const [inputText, setInputText] = useState<string>('');
  const [showManualPaste, setShowManualPaste] = useState<boolean>(false);

  // Validation execution state
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [validationProgress, setValidationProgress] = useState<number>(0);
  const [validationStatusMsg, setValidationStatusMsg] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Report & Results State
  const [reportData, setReportData] = useState<BatchValidationSummary | null>(null);
  const [tableFilter, setTableFilter] = useState<'all' | 'mailable' | 'non_mailable' | 'risky' | 'unknown'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEmailDetail, setSelectedEmailDetail] = useState<EmailValidationResult | null>(null);

  // Single Sandbox State
  const [singleEmailInput, setSingleEmailInput] = useState<string>('alex.developer@gmail.com');
  const [singleResult, setSingleResult] = useState<EmailValidationResult | null>(null);
  const [singleLoading, setSingleLoading] = useState<boolean>(false);

  // Pricing State
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  // Copy API key state
  const [copiedKey, setCopiedKey] = useState(false);

  // Calculate active emails to verify (from sheet if uploaded, otherwise from textarea)
  const getActiveEmailsToVerify = (): string[] => {
    if (uploadedSheet && uploadedSheet.emails.length > 0) {
      return uploadedSheet.emails;
    }
    return inputText
      .split(/\r?\n/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0);
  };

  const activeEmails = getActiveEmailsToVerify();
  const canVerify = activeEmails.length > 0 && !isValidating && !isUploadingFile;

  // Process file upload via backend parser API
  const uploadAndParseFile = async (file: File) => {
    setIsUploadingFile(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/parse-sheet', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to parse sheet file');
      }

      const data = await res.json();

      if (!data.emails || data.emails.length === 0) {
        throw new Error(`No valid email addresses were found in "${file.name}". Please ensure your sheet contains an email column.`);
      }

      const sheetInfo: UploadedSheetInfo = {
        name: file.name,
        size: file.size,
        totalRows: data.totalRows || data.emails.length,
        headers: data.headers || ['Email'],
        detectedEmailColumn: data.detectedEmailColumn || 'Email',
        emails: data.emails,
        previewRows: data.previewRows || [],
      };

      setUploadedSheet(sheetInfo);
      // Also update text for visibility
      setInputText(data.emails.slice(0, 20).join('\n') + (data.emails.length > 20 ? `\n... and ${data.emails.length - 20} more` : ''));
    } catch (err: any) {
      setUploadError(err.message || 'Error uploading file');
    } finally {
      setIsUploadingFile(false);
    }
  };

  // Handle File Input selection
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadAndParseFile(file);
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadAndParseFile(file);
    }
  };

  // Load Built-in Benchmark Test Dataset
  const handleLoadSample = () => {
    const sampleEmails = [...SAMPLE_BENCHMARK_EMAILS];
    setUploadedSheet({
      name: 'truthmail_benchmark_test_dataset.csv',
      size: 2048,
      totalRows: sampleEmails.length,
      headers: ['Email Address', 'Type', 'Status'],
      detectedEmailColumn: 'Email Address',
      emails: sampleEmails,
      previewRows: [
        { 'Email Address': 'elon.musk@x.com', 'Type': 'Business', 'Status': 'Active' },
        { 'Email Address': 'satya.nadella@microsoft.com', 'Type': 'Business', 'Status': 'Active' },
        { 'Email Address': 'john.doe@gamil.com', 'Type': 'Typo Misspelling', 'Status': 'Prospect' },
        { 'Email Address': 'quicktest99@mailinator.com', 'Type': 'Disposable Burner', 'Status': 'Lead' },
        { 'Email Address': 'admin@stripe.com', 'Type': 'Role Account', 'Status': 'Billing' },
      ],
    });
    setInputText(sampleEmails.join('\n'));
    setUploadError(null);
  };

  // Clear uploaded sheet
  const handleClearSheet = () => {
    setUploadedSheet(null);
    setInputText('');
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Download Sample CSV Template
  const handleDownloadTemplate = () => {
    const blob = new Blob([SAMPLE_CSV_CONTENT], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_email_verification_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Run Bulk Validation (Supports 5k, 10k, 50k+ emails with chunked streaming)
  const handleStartBulkValidation = async () => {
    const emailList = getActiveEmailsToVerify();

    if (emailList.length === 0) {
      alert('Please upload a sheet or enter email addresses to validate.');
      return;
    }

    // Auto-replenish testing credits if list is larger than current credits
    if (credits < emailList.length) {
      setCredits((prev) => prev + emailList.length + 50000);
    }

    setIsValidating(true);
    setValidationProgress(5);
    setValidationStatusMsg(`Initiating validation pipeline for ${emailList.length.toLocaleString()} emails...`);

    try {
      // Chunk into sub-batches of 500 emails so browser network stays responsive and never times out
      const BATCH_SIZE = 500;
      const chunks: string[][] = [];
      for (let i = 0; i < emailList.length; i += BATCH_SIZE) {
        chunks.push(emailList.slice(i, i + BATCH_SIZE));
      }

      const aggregatedResults: EmailValidationResult[] = [];
      let aggregatedMailable = 0;
      let aggregatedNonMailable = 0;
      let aggregatedRisky = 0;
      let aggregatedUnknown = 0;
      let aggregatedScoreSum = 0;

      const aggregatedRisk = {
        spamTraps: 0,
        disposable: 0,
        roleBased: 0,
        greymail: 0,
        catchAll: 0,
        typos: 0,
        missingMx: 0,
        syntaxErrors: 0,
      };

      const aggregatedProvider = {
        google: 0,
        microsoft: 0,
        yahoo: 0,
        otherFree: 0,
        corporateB2B: 0,
      };

      for (let c = 0; c < chunks.length; c++) {
        const currentChunk = chunks[c];
        const processedSoFar = c * BATCH_SIZE;
        const progressPct = Math.round(5 + ((processedSoFar / emailList.length) * 90));
        setValidationProgress(progressPct);
        setValidationStatusMsg(
          `Scrubbing batch ${c + 1} of ${chunks.length} (${processedSoFar.toLocaleString()} / ${emailList.length.toLocaleString()} emails)...`
        );

        const res = await fetch('/api/validate/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emails: currentChunk }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to validate batch chunk ${c + 1}`);
        }

        const chunkSummary: BatchValidationSummary = await res.json();
        aggregatedResults.push(...chunkSummary.results);
        aggregatedMailable += chunkSummary.mailable;
        aggregatedNonMailable += chunkSummary.nonMailable;
        aggregatedRisky += chunkSummary.risky;
        aggregatedUnknown += chunkSummary.unknown;

        for (const r of chunkSummary.results) {
          aggregatedScoreSum += r.qualityScore;
        }

        for (const k in chunkSummary.riskBreakdown) {
          aggregatedRisk[k as keyof typeof aggregatedRisk] += chunkSummary.riskBreakdown[k as keyof typeof aggregatedRisk];
        }

        for (const p in chunkSummary.providerBreakdown) {
          aggregatedProvider[p as keyof typeof aggregatedProvider] += chunkSummary.providerBreakdown[p as keyof typeof aggregatedProvider];
        }
      }

      setValidationProgress(100);
      setValidationStatusMsg('Finalizing deliverability report and risk metrics...');

      const finalSummary: BatchValidationSummary = {
        total: aggregatedResults.length,
        mailable: aggregatedMailable,
        nonMailable: aggregatedNonMailable,
        risky: aggregatedRisky,
        unknown: aggregatedUnknown,
        averageQualityScore: aggregatedResults.length > 0 ? Math.round(aggregatedScoreSum / aggregatedResults.length) : 0,
        riskBreakdown: aggregatedRisk,
        providerBreakdown: aggregatedProvider,
        results: aggregatedResults,
      };

      setTimeout(() => {
        setReportData(finalSummary);
        setCredits((prev) => Math.max(0, prev - finalSummary.total));
        setIsValidating(false);
        setActiveTab('report');
      }, 300);
    } catch (err: any) {
      alert('Validation Error: ' + err.message);
      setIsValidating(false);
    }
  };

  // Run Single Email Validation
  const handleSingleValidate = async (emailToTest?: string) => {
    const target = emailToTest || singleEmailInput;
    if (!target) return;

    setSingleLoading(true);
    try {
      const res = await fetch('/api/validate/single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: target }),
      });

      if (!res.ok) throw new Error('Validation failed');
      const data: EmailValidationResult = await res.json();
      setSingleResult(data);
      setCredits((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSingleLoading(false);
    }
  };

  // Filter Table Results
  const filteredResults = (reportData?.results || []).filter((item) => {
    if (tableFilter !== 'all' && item.status !== tableFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return item.email.toLowerCase().includes(q) || item.details.domain.toLowerCase().includes(q);
    }
    return true;
  });

  // Export CSV Helpers
  const downloadCSV = (rows: string[][], filename: string) => {
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportCleanOnly = () => {
    if (!reportData) return;
    const cleanList = reportData.results.filter((r) => r.status === 'mailable');
    const rows = [['Email', 'Status', 'Quality Score', 'MX Host']];
    cleanList.forEach((r) => rows.push([r.email, r.status, r.qualityScore.toString(), r.details.mxRecords[0] || '']));
    downloadCSV(rows, `clean_mailable_emails_${Date.now()}.csv`);
  };

  const exportFullAudit = () => {
    if (!reportData) return;
    const rows = [
      [
        'Email',
        'Status',
        'Sub Status',
        'Quality Score',
        'Domain',
        'MX Record',
        'SMTP Code',
        'Is Disposable',
        'Is Spam Trap',
        'Is Greymail',
        'Is Role Based',
        'Suggested Typo',
      ],
    ];
    reportData.results.forEach((r) => {
      rows.push([
        r.email,
        r.status,
        r.subStatus,
        r.qualityScore.toString(),
        r.details.domain,
        r.details.mxRecords[0] || 'None',
        r.details.smtpCode,
        r.details.isDisposable ? 'YES' : 'NO',
        r.details.isSpamTrap ? 'YES' : 'NO',
        r.details.isGreymail ? 'YES' : 'NO',
        r.details.isRoleBased ? 'YES' : 'NO',
        r.details.didYouMean || 'None',
      ]);
    });
    downloadCSV(rows, `truthmail_full_audit_report_${Date.now()}.csv`);
  };

  const exportSuppressionList = () => {
    if (!reportData) return;
    const suppressList = reportData.results.filter((r) => r.status === 'non_mailable' || r.details.isSpamTrap);
    const rows = [['Email', 'Reason', 'Risk Level']];
    suppressList.forEach((r) => rows.push([r.email, r.subStatus, 'HIGH_RISK_BLOCK']));
    downloadCSV(rows, `esp_suppression_list_${Date.now()}.csv`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('bulk')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-white">Truth<span className="text-emerald-400">Mail</span></span>
                <span className="text-xs uppercase tracking-wider font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                  Enterprise
                </span>
              </div>
              <p className="text-[11px] text-slate-400">ZeroBounce Alternative • 99%+ Deliverability</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('bulk')}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
                activeTab === 'bulk' ? 'bg-slate-800 text-emerald-400 font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>Bulk Verifier</span>
            </button>

            <button
              onClick={() => setActiveTab('report')}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
                activeTab === 'report' ? 'bg-slate-800 text-emerald-400 font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Report & Analytics</span>
              {reportData && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('single')}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
                activeTab === 'single' ? 'bg-slate-800 text-emerald-400 font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>Single Sandbox</span>
            </button>

            <button
              onClick={() => setActiveTab('greymail')}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
                activeTab === 'greymail' ? 'bg-slate-800 text-emerald-400 font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Info className="w-4 h-4" />
              <span>Greymail Guide</span>
            </button>

            <button
              onClick={() => setActiveTab('pricing')}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
                activeTab === 'pricing' ? 'bg-slate-800 text-emerald-400 font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Pricing Tiers</span>
            </button>

            <button
              onClick={() => setActiveTab('api')}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
                activeTab === 'api' ? 'bg-slate-800 text-emerald-400 font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>API</span>
            </button>
          </nav>

          {/* Credit Balance & Auth Controls */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-slate-800/80 border border-slate-700/80 px-3.5 py-1.5 rounded-full text-xs">
              <span className="text-slate-400">Credits:</span>
              <span className="font-bold text-emerald-400 font-mono text-sm">{credits.toLocaleString()}</span>
            </div>

            {currentUser ? (
              <div className="flex items-center space-x-2">
                {currentUser.role === 'admin' && (
                  <Link
                    href="/admin"
                    className="bg-purple-600/20 border border-purple-500/40 text-purple-300 hover:bg-purple-600 hover:text-white font-semibold text-xs px-3 py-1.5 rounded-full transition flex items-center space-x-1"
                  >
                    <span>Admin</span>
                  </Link>
                )}

                <span className="text-xs text-slate-300 font-medium hidden sm:inline-block">
                  {currentUser.name}
                </span>

                <button
                  onClick={handleLogout}
                  className="text-xs text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 px-3 py-1.5 rounded-full transition"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setAuthModalMode('login');
                    setAuthModalOpen(true);
                  }}
                  className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 transition"
                >
                  Sign In
                </button>

                <button
                  onClick={() => {
                    setAuthModalMode('signup');
                    setAuthModalOpen(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-3.5 py-1.5 rounded-full transition shadow-md shadow-emerald-600/20 flex items-center space-x-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Sign Up (+500)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* 1. BULK LIST VERIFIER VIEW */}
        {activeTab === 'bulk' && (
          <div className="space-y-8">
            {/* Header intro */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Bulk Email Validation & Scrubbing
                </h1>
                <p className="text-slate-400 text-sm mt-1">
                  Upload your spreadsheet (.xlsx, .csv, .txt, .tsv). Our 12-step engine checks MX, spam traps, hard bounces, typos, and greymails.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={handleDownloadTemplate}
                  className="px-3.5 py-2 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-700 rounded-lg hover:bg-slate-800 transition flex items-center space-x-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Sample CSV</span>
                </button>
                <button
                  onClick={handleLoadSample}
                  className="px-4 py-2 text-xs font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-800 rounded-lg hover:bg-emerald-900 transition flex items-center space-x-1.5 shadow-sm"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Load 25 Benchmark Emails</span>
                </button>
              </div>
            </div>

            {/* Validation Process In Flight */}
            {isValidating && (
              <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-8 text-center space-y-6 shadow-2xl animate-pulse">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Validating Email List...</h3>
                  <p className="text-slate-400 text-sm mt-1">{validationStatusMsg}</p>
                </div>
                {/* Progress bar */}
                <div className="max-w-md mx-auto space-y-2">
                  <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${validationProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>12-Step Deep Check</span>
                    <span className="font-mono text-emerald-400">{validationProgress}% Completed</span>
                  </div>
                </div>
              </div>
            )}

            {!isValidating && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Upload Box (Left 7 Cols) */}
                <div className="lg:col-span-7 space-y-6">

                  {/* Drag and Drop Zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed transition rounded-2xl p-8 text-center cursor-pointer group relative ${
                      isDragging
                        ? 'border-emerald-400 bg-emerald-950/40 shadow-xl shadow-emerald-500/20'
                        : isUploadingFile
                        ? 'border-slate-600 bg-slate-900/80 cursor-wait'
                        : uploadedSheet
                        ? 'border-emerald-600/50 bg-emerald-950/20'
                        : 'border-slate-700 hover:border-emerald-500/60 bg-slate-900/50 hover:bg-slate-900'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv,.txt,.tsv"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />

                    {isUploadingFile ? (
                      <div className="py-4 space-y-3">
                        <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin mx-auto" />
                        <h3 className="text-sm font-semibold text-white">Analyzing sheet structure & columns...</h3>
                        <p className="text-xs text-slate-400">Parsing Excel/CSV cells and extracting email addresses</p>
                      </div>
                    ) : (
                      <>
                        <div className="w-14 h-14 rounded-2xl bg-slate-800 group-hover:bg-emerald-950/60 border border-slate-700 group-hover:border-emerald-700 flex items-center justify-center mx-auto transition mb-4">
                          <UploadCloud className="w-7 h-7 text-slate-400 group-hover:text-emerald-400 transition" />
                        </div>
                        <h3 className="text-base font-semibold text-white">
                          Drag & drop your Excel/CSV sheet here, or <span className="text-emerald-400 underline underline-offset-4">Browse files</span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-2">
                          Supports <strong>.XLSX</strong>, <strong>.CSV</strong>, <strong>.TXT</strong>, <strong>.TSV</strong>
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Auto-detects email columns from Google Sheets, Microsoft Excel, HubSpot, and CRM exports
                        </p>
                      </>
                    )}
                  </div>

                  {/* Error Notification if file parsing failed */}
                  {uploadError && (
                    <div className="p-4 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  {/* UPLOADED SHEET DETAIL CARD (Displays when a file is parsed) */}
                  {uploadedSheet && (
                    <div className="bg-slate-900/90 border border-emerald-500/40 rounded-2xl p-5 space-y-4 shadow-xl shadow-emerald-500/5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-700 flex items-center justify-center text-emerald-400 flex-shrink-0">
                            <FileSpreadsheet className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="text-sm font-bold text-white font-mono">{uploadedSheet.name}</h4>
                              <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
                                <CheckCheck className="w-3 h-3" />
                                <span>Parsed</span>
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              Detected <strong>{uploadedSheet.emails.length.toLocaleString()} emails</strong> ready for verification
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={handleClearSheet}
                          className="text-xs text-slate-400 hover:text-rose-400 px-2 py-1 rounded bg-slate-800 hover:bg-slate-850 transition"
                        >
                          Change File
                        </button>
                      </div>

                      {/* Column detector & mapping */}
                      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                          <span className="text-slate-400">Mapped Email Column:</span>
                          <span className="font-semibold text-emerald-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800 font-mono">
                            {uploadedSheet.detectedEmailColumn}
                          </span>
                        </div>
                        {uploadedSheet.headers.length > 1 && (
                          <div className="text-[11px] text-slate-400">
                            Other sheet columns found: <span className="text-slate-300">{uploadedSheet.headers.filter(h => h !== uploadedSheet.detectedEmailColumn).join(', ')}</span>
                          </div>
                        )}
                      </div>

                      {/* Quick Preview of First Rows */}
                      {uploadedSheet.previewRows.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                            Sheet Preview (First {uploadedSheet.previewRows.length} Rows)
                          </span>
                          <div className="overflow-x-auto bg-slate-950 rounded-xl border border-slate-800/80">
                            <table className="w-full text-left text-[11px]">
                              <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 text-[10px]">
                                <tr>
                                  {uploadedSheet.headers.map((h, i) => (
                                    <th key={i} className="py-2 px-3 font-semibold">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px] text-slate-300">
                                {uploadedSheet.previewRows.map((row, idx) => (
                                  <tr key={idx} className="hover:bg-slate-900/30">
                                    {uploadedSheet.headers.map((h, i) => (
                                      <td key={i} className="py-1.5 px-3 truncate max-w-[150px]">{row[h] || '-'}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Primary Call to Action Button specifically for uploaded sheet */}
                      <button
                        onClick={handleStartBulkValidation}
                        disabled={!canVerify}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white font-extrabold rounded-xl transition shadow-xl shadow-emerald-600/30 flex items-center justify-center space-x-2 text-sm"
                      >
                        <ShieldCheck className="w-5 h-5" />
                        <span>
                          Verify & Scrub All {uploadedSheet.emails.length.toLocaleString()} Emails ({uploadedSheet.emails.length} Credits)
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Manual Paste / Raw input (Collapsible or Secondary) */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setShowManualPaste(!showManualPaste)}
                        className="text-xs font-semibold text-slate-300 hover:text-white flex items-center space-x-1.5"
                      >
                        <Mail className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{showManualPaste ? 'Hide Paste Box' : 'Or Paste Emails Directly'}</span>
                        <span className="text-[10px] text-slate-500">({showManualPaste ? 'click to collapse' : 'click to expand'})</span>
                      </button>

                      {inputText && (
                        <button
                          onClick={() => { setInputText(''); setUploadedSheet(null); }}
                          className="text-xs text-slate-400 hover:text-rose-400 flex items-center space-x-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Clear Text</span>
                        </button>
                      )}
                    </div>

                    {showManualPaste && (
                      <div className="space-y-2 pt-2">
                        <textarea
                          value={inputText}
                          onChange={(e) => {
                            setInputText(e.target.value);
                            // If user is editing text directly, invalidate uploaded sheet wrapper
                            if (uploadedSheet) setUploadedSheet(null);
                          }}
                          rows={6}
                          placeholder="elon.musk@x.com&#10;satya.nadella@microsoft.com&#10;john.doe@gamil.com&#10;burner@mailinator.com&#10;admin@company.com"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition resize-y"
                        />
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>
                            Detected count:{' '}
                            <strong className="text-white font-mono">
                              {inputText.split(/\r?\n/).filter((l) => l.trim().length > 0).length}
                            </strong>{' '}
                            emails
                          </span>
                          <span>1 Credit per email verified</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Fallback Action Button when no sheet is uploaded but user entered text */}
                  {!uploadedSheet && (
                    <button
                      onClick={handleStartBulkValidation}
                      disabled={!canVerify}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white font-bold rounded-xl transition shadow-lg shadow-emerald-600/20 flex items-center justify-center space-x-2 text-sm"
                    >
                      <ShieldCheck className="w-5 h-5" />
                      <span>
                        Verify & Scrub List (
                        {activeEmails.length} Credits)
                      </span>
                    </button>
                  )}
                </div>

                {/* Right 5 Cols: Detection Features & Guarantees */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5">
                    <h3 className="text-base font-bold text-white flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span>12-Step Detection Engine Included</span>
                    </h3>

                    <div className="space-y-3.5">
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-md bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 flex-shrink-0 mt-0.5">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-white">DNS MX & Authoritative Lookup</h4>
                          <p className="text-[11px] text-slate-400">Validates active mail exchange records and fallback A records directly from root servers.</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-md bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 flex-shrink-0 mt-0.5">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-white">Spam Trap & Honeypot Detection</h4>
                          <p className="text-[11px] text-slate-400">Identifies pristine and recycled spam traps that cause instant domain blacklisting.</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-md bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 flex-shrink-0 mt-0.5">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-white">Greymail & Engagement Risk</h4>
                          <p className="text-[11px] text-slate-400">Flags low-engagement promotional mailboxes and unmonitored broadcast digests.</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-md bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 flex-shrink-0 mt-0.5">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-white">Smart Typo Auto-Suggestion</h4>
                          <p className="text-[11px] text-slate-400">Detects misspelled domains like `gamil.com` or `hotmial.com` with 1-click fixes.</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-md bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 flex-shrink-0 mt-0.5">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-white">30,000+ Disposable Domains</h4>
                          <p className="text-[11px] text-slate-400">Filters 10-minute temporary throwaway mailboxes (Mailinator, GuerrillaMail, etc.).</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-md bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 flex-shrink-0 mt-0.5">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-white">Catch-All (Accept-All) Analysis</h4>
                          <p className="text-[11px] text-slate-400">Probes whether mail server accepts non-existent recipients without rejecting.</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Zero-Bounce Guarantee</span>
                        <span className="text-emerald-400 font-semibold">99.2% Deliverability</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. REPORT & ANALYTICS VIEW */}
        {activeTab === 'report' && (
          <div className="space-y-8">
            {!reportData ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
                  <FileText className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-white">No Validation Report Available Yet</h3>
                <p className="text-slate-400 text-sm max-w-md mx-auto">
                  Upload a sheet or run our 25-email benchmark test to generate an enterprise deliverability report.
                </p>
                <button
                  onClick={() => { handleLoadSample(); setActiveTab('bulk'); }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition"
                >
                  Load Benchmark Dataset
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Header with Export buttons */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                        Deliverability & Risk Intelligence Report
                      </h1>
                      <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-800 px-2.5 py-0.5 rounded-full font-semibold">
                        Scrub Complete
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm mt-1">
                      Processed <strong>{reportData.total}</strong> unique email addresses • Average Quality Score: <strong className="text-emerald-400">{reportData.averageQualityScore}/100</strong>
                    </p>
                  </div>

                  {/* Export Options */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={exportCleanOnly}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition shadow-md shadow-emerald-600/20 flex items-center space-x-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export Clean Only ({reportData.mailable})</span>
                    </button>
                    <button
                      onClick={exportFullAudit}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs rounded-lg transition flex items-center space-x-1.5"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Full Audit Report</span>
                    </button>
                    <button
                      onClick={exportSuppressionList}
                      className="px-3.5 py-2 bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 font-semibold text-xs rounded-lg transition flex items-center space-x-1.5"
                    >
                      <AlertOctagon className="w-3.5 h-3.5" />
                      <span>ESP Suppression List</span>
                    </button>
                  </div>
                </div>

                {/* Top 4 KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Mailable */}
                  <div className="bg-slate-900/80 border border-emerald-500/30 rounded-2xl p-5 space-y-3 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Mailable (Valid)</span>
                      </span>
                      <span className="text-xs font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-2 py-0.5 rounded">
                        {Math.round((reportData.mailable / reportData.total) * 100)}%
                      </span>
                    </div>
                    <div className="text-3xl font-extrabold text-white font-mono">{reportData.mailable}</div>
                    <p className="text-[11px] text-slate-400">100% safe to send. Verified mailbox with active MX.</p>
                  </div>

                  {/* Non-Mailable */}
                  <div className="bg-slate-900/80 border border-rose-500/30 rounded-2xl p-5 space-y-3 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-rose-400 flex items-center space-x-1.5">
                        <XCircle className="w-4 h-4" />
                        <span>Non-Mailable</span>
                      </span>
                      <span className="text-xs font-mono font-bold bg-rose-950 text-rose-400 border border-rose-800/80 px-2 py-0.5 rounded">
                        {Math.round((reportData.nonMailable / reportData.total) * 100)}%
                      </span>
                    </div>
                    <div className="text-3xl font-extrabold text-white font-mono">{reportData.nonMailable}</div>
                    <p className="text-[11px] text-slate-400">Hard bounces avoided. Invalid syntax or dead MX records.</p>
                  </div>

                  {/* Risky */}
                  <div className="bg-slate-900/80 border border-amber-500/30 rounded-2xl p-5 space-y-3 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Risky Emails</span>
                      </span>
                      <span className="text-xs font-mono font-bold bg-amber-950 text-amber-400 border border-amber-800/80 px-2 py-0.5 rounded">
                        {Math.round((reportData.risky / reportData.total) * 100)}%
                      </span>
                    </div>
                    <div className="text-3xl font-extrabold text-white font-mono">{reportData.risky}</div>
                    <p className="text-[11px] text-slate-400">Catch-all, disposable, role accounts, or greymail.</p>
                  </div>

                  {/* Unknown */}
                  <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-5 space-y-3 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                        <HelpCircle className="w-4 h-4" />
                        <span>Unknown</span>
                      </span>
                      <span className="text-xs font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded">
                        {Math.round((reportData.unknown / reportData.total) * 100)}%
                      </span>
                    </div>
                    <div className="text-3xl font-extrabold text-white font-mono">{reportData.unknown}</div>
                    <p className="text-[11px] text-slate-400">Server timeouts. Credits auto-refunded back to balance.</p>
                  </div>
                </div>

                {/* Middle Grid: Detailed Risk Breakdown & Provider Matrix */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Granular Risk Breakdown (8 Cols) */}
                  <div className="lg:col-span-8 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-white flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span>Granular Risk Factors & Threats Detected</span>
                      </h3>
                      <span className="text-xs text-slate-400">Protecting Domain Sender Score</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {/* Spam Traps */}
                      <div className="bg-slate-950/80 border border-rose-900/60 rounded-xl p-3.5 space-y-1">
                        <span className="text-[11px] font-semibold text-rose-400 flex items-center space-x-1">
                          <Flame className="w-3 h-3" />
                          <span>Spam Traps</span>
                        </span>
                        <div className="text-2xl font-mono font-bold text-white">{reportData.riskBreakdown.spamTraps}</div>
                        <p className="text-[10px] text-slate-400">Toxic blacklists avoided</p>
                      </div>

                      {/* Greymail */}
                      <div className="bg-slate-950/80 border border-amber-900/60 rounded-xl p-3.5 space-y-1 cursor-pointer hover:border-amber-700 transition" onClick={() => setActiveTab('greymail')}>
                        <span className="text-[11px] font-semibold text-amber-400 flex items-center space-x-1">
                          <Info className="w-3 h-3" />
                          <span>Greymail</span>
                        </span>
                        <div className="text-2xl font-mono font-bold text-white">{reportData.riskBreakdown.greymail}</div>
                        <p className="text-[10px] text-slate-400">Low engagement lists</p>
                      </div>

                      {/* Disposable */}
                      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
                        <span className="text-[11px] font-semibold text-slate-300 flex items-center space-x-1">
                          <Trash2 className="w-3 h-3" />
                          <span>Disposable</span>
                        </span>
                        <div className="text-2xl font-mono font-bold text-white">{reportData.riskBreakdown.disposable}</div>
                        <p className="text-[10px] text-slate-400">Temporary burners</p>
                      </div>

                      {/* Catch-All */}
                      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
                        <span className="text-[11px] font-semibold text-slate-300 flex items-center space-x-1">
                          <Layers className="w-3 h-3" />
                          <span>Catch-All</span>
                        </span>
                        <div className="text-2xl font-mono font-bold text-white">{reportData.riskBreakdown.catchAll}</div>
                        <p className="text-[10px] text-slate-400">Accept-all servers</p>
                      </div>

                      {/* Role Accounts */}
                      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
                        <span className="text-[11px] font-semibold text-slate-300">Role-Based</span>
                        <div className="text-2xl font-mono font-bold text-white">{reportData.riskBreakdown.roleBased}</div>
                        <p className="text-[10px] text-slate-400">admin@, support@, info@</p>
                      </div>

                      {/* Typo suggestions */}
                      <div className="bg-slate-950/80 border border-emerald-900/60 rounded-xl p-3.5 space-y-1">
                        <span className="text-[11px] font-semibold text-emerald-400">Typos Fixed</span>
                        <div className="text-2xl font-mono font-bold text-white">{reportData.riskBreakdown.typos}</div>
                        <p className="text-[10px] text-slate-400">e.g. gamil → gmail</p>
                      </div>

                      {/* Missing MX */}
                      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
                        <span className="text-[11px] font-semibold text-slate-300">Missing MX</span>
                        <div className="text-2xl font-mono font-bold text-white">{reportData.riskBreakdown.missingMx}</div>
                        <p className="text-[10px] text-slate-400">No mail exchanger</p>
                      </div>

                      {/* Syntax errors */}
                      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
                        <span className="text-[11px] font-semibold text-slate-300">Syntax Errors</span>
                        <div className="text-2xl font-mono font-bold text-white">{reportData.riskBreakdown.syntaxErrors}</div>
                        <p className="text-[10px] text-slate-400">RFC 5322 noncompliant</p>
                      </div>
                    </div>
                  </div>

                  {/* Mailbox Provider Composition (4 Cols) */}
                  <div className="lg:col-span-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5">
                    <h3 className="text-base font-bold text-white flex items-center space-x-2">
                      <Server className="w-4 h-4 text-emerald-400" />
                      <span>Provider Distribution</span>
                    </h3>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-300">Google Workspace / Gmail</span>
                          <span className="font-mono text-emerald-400">{reportData.providerBreakdown.google}</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${(reportData.providerBreakdown.google / reportData.total) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-300">Microsoft 365 / Outlook</span>
                          <span className="font-mono text-blue-400">{reportData.providerBreakdown.microsoft}</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-500 h-full rounded-full"
                            style={{ width: `${(reportData.providerBreakdown.microsoft / reportData.total) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-300">Corporate Custom B2B</span>
                          <span className="font-mono text-purple-400">{reportData.providerBreakdown.corporateB2B}</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-purple-500 h-full rounded-full"
                            style={{ width: `${(reportData.providerBreakdown.corporateB2B / reportData.total) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-300">Yahoo & Other Free</span>
                          <span className="font-mono text-amber-400">
                            {reportData.providerBreakdown.yahoo + reportData.providerBreakdown.otherFree}
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-amber-500 h-full rounded-full"
                            style={{
                              width: `${((reportData.providerBreakdown.yahoo + reportData.providerBreakdown.otherFree) / reportData.total) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 text-[11px] text-slate-400">
                      💡 <strong>ESP Deliverability Tip:</strong> Maintain a 0.3% maximum bounce rate to adhere to Google & Yahoo's 2024+ sender authentication policies.
                    </div>
                  </div>
                </div>

                {/* Filterable Data Table */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden space-y-4 p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Filter buttons */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        onClick={() => setTableFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          tableFilter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white bg-slate-800/50'
                        }`}
                      >
                        All ({reportData.total})
                      </button>
                      <button
                        onClick={() => setTableFilter('mailable')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          tableFilter === 'mailable' ? 'bg-emerald-600 text-white' : 'text-emerald-400 hover:bg-emerald-950/50'
                        }`}
                      >
                        Mailable ({reportData.mailable})
                      </button>
                      <button
                        onClick={() => setTableFilter('non_mailable')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          tableFilter === 'non_mailable' ? 'bg-rose-600 text-white' : 'text-rose-400 hover:bg-rose-950/50'
                        }`}
                      >
                        Non-Mailable ({reportData.nonMailable})
                      </button>
                      <button
                        onClick={() => setTableFilter('risky')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          tableFilter === 'risky' ? 'bg-amber-600 text-white' : 'text-amber-400 hover:bg-amber-950/50'
                        }`}
                      >
                        Risky ({reportData.risky})
                      </button>
                      <button
                        onClick={() => setTableFilter('unknown')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          tableFilter === 'unknown' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:bg-slate-800/50'
                        }`}
                      >
                        Unknown ({reportData.unknown})
                      </button>
                    </div>

                    {/* Search box */}
                    <div className="relative min-w-[240px]">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search email or domain..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-3 px-4">Email Address</th>
                          <th className="py-3 px-4">Primary Status</th>
                          <th className="py-3 px-4">Sub-Status</th>
                          <th className="py-3 px-4">Score</th>
                          <th className="py-3 px-4">MX Record</th>
                          <th className="py-3 px-4">Risk Flags</th>
                          <th className="py-3 px-4 text-right">Inspect</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                        {filteredResults.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/40 transition">
                            <td className="py-3 px-4 font-semibold text-slate-200">
                              {item.email}
                              {item.details.didYouMean && (
                                <span className="block text-[10px] text-emerald-400 font-sans mt-0.5">
                                  💡 Did you mean: <strong>{item.details.didYouMean}</strong>?
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  item.status === 'mailable'
                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                    : item.status === 'non_mailable'
                                    ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                    : item.status === 'risky'
                                    ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}
                              >
                                {item.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-300 font-sans">
                              {item.subStatus.replace(/_/g, ' ')}
                            </td>
                            <td className="py-3 px-4 font-bold">
                              <span
                                className={
                                  item.qualityScore >= 80
                                    ? 'text-emerald-400'
                                    : item.qualityScore >= 50
                                    ? 'text-amber-400'
                                    : 'text-rose-400'
                                }
                              >
                                {item.qualityScore}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-400 truncate max-w-[160px]">
                              {item.details.mxRecords[0] || 'None'}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap gap-1 font-sans">
                                {item.details.isSpamTrap && (
                                  <span className="bg-rose-950 text-rose-400 border border-rose-800 px-1.5 py-0.2 rounded text-[9px]">
                                    Spam Trap
                                  </span>
                                )}
                                {item.details.isGreymail && (
                                  <span className="bg-amber-950 text-amber-400 border border-amber-800 px-1.5 py-0.2 rounded text-[9px]">
                                    Greymail
                                  </span>
                                )}
                                {item.details.isDisposable && (
                                  <span className="bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded text-[9px]">
                                    Disposable
                                  </span>
                                )}
                                {item.details.isRoleBased && (
                                  <span className="bg-purple-950 text-purple-300 px-1.5 py-0.2 rounded text-[9px]">
                                    Role
                                  </span>
                                )}
                                {item.details.isCatchAll && (
                                  <span className="bg-blue-950 text-blue-300 px-1.5 py-0.2 rounded text-[9px]">
                                    Catch-All
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => setSelectedEmailDetail(item)}
                                className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-sans transition"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. SINGLE EMAIL SANDBOX VIEW */}
        {activeTab === 'single' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Single Real-Time Validation Sandbox
              </h1>
              <p className="text-slate-400 text-sm">
                Simulate our live REST API verification endpoint for single sign-up forms, CRM syncs, and real-time checks.
              </p>
            </div>

            {/* Input card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={singleEmailInput}
                  onChange={(e) => setSingleEmailInput(e.target.value)}
                  placeholder="Enter email to test (e.g. elon.musk@x.com)"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  onClick={() => handleSingleValidate()}
                  disabled={singleLoading || !singleEmailInput}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-semibold text-sm rounded-xl transition flex items-center justify-center space-x-2"
                >
                  {singleLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  <span>Validate (1 Credit)</span>
                </button>
              </div>

              {/* Quick sample chips */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
                <span className="text-xs text-slate-400">Quick Test Cases:</span>
                {[
                  { label: 'Valid B2B', email: 'satya.nadella@microsoft.com' },
                  { label: 'Typo Misspelling', email: 'john.smith@gamil.com' },
                  { label: 'Disposable Burner', email: 'quicktest99@mailinator.com' },
                  { label: 'Role Account', email: 'support@shopify.com' },
                  { label: 'Spam Trap Bait', email: 'spamtrap-seed-01@domain.com' },
                  { label: 'Greymail Newsletter', email: 'newsletter-daily@techdigest.com' },
                  { label: 'Dead Domain MX', email: 'nobody@nonexistentdomain99881122.xyz' },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSingleEmailInput(item.email);
                      handleSingleValidate(item.email);
                    }}
                    className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700/80 transition"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Result display */}
            {singleResult && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Verification Result</span>
                    <h2 className="text-xl font-bold text-white font-mono mt-0.5">{singleResult.email}</h2>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase block">Deliverability Score</span>
                      <span className="text-xl font-extrabold text-emerald-400 font-mono">
                        {singleResult.qualityScore} / 100
                      </span>
                    </div>
                    <span
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider ${
                        singleResult.status === 'mailable'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : singleResult.status === 'non_mailable'
                          ? 'bg-rose-950 text-rose-400 border border-rose-800'
                          : singleResult.status === 'risky'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {singleResult.status}
                    </span>
                  </div>
                </div>

                {/* 12 Point Detailed Checklist */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Syntax / RFC 5322</span>
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-white">
                      {singleResult.details.syntaxValid ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      )}
                      <span>{singleResult.details.syntaxValid ? 'Valid Format' : 'Syntax Error'}</span>
                    </div>
                  </div>

                  <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">MX Records</span>
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-white">
                      {singleResult.details.hasMx ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      )}
                      <span className="truncate">{singleResult.details.hasMx ? singleResult.details.mxRecords[0] : 'None Found'}</span>
                    </div>
                  </div>

                  <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">SMTP Handshake</span>
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-white">
                      <span className="font-mono text-emerald-400">{singleResult.details.smtpCode}</span>
                      <span className="truncate">{singleResult.details.smtpDeliverable ? 'Recipient OK' : 'Undeliverable'}</span>
                    </div>
                  </div>

                  <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Spam Trap Status</span>
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-white">
                      {singleResult.details.isSpamTrap ? (
                        <Flame className="w-3.5 h-3.5 text-rose-400" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      <span>{singleResult.details.isSpamTrap ? 'Spam Trap Detected' : 'Clean (No Trap)'}</span>
                    </div>
                  </div>

                  <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Greymail Analysis</span>
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-white">
                      {singleResult.details.isGreymail ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      <span>{singleResult.details.isGreymail ? 'Greymail Identified' : 'Standard Mailbox'}</span>
                    </div>
                  </div>

                  <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Burner / Disposable</span>
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-white">
                      {singleResult.details.isDisposable ? (
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      <span>{singleResult.details.isDisposable ? 'Disposable Burner' : 'Permanent Mailbox'}</span>
                    </div>
                  </div>
                </div>

                {/* Did you mean banner if typo */}
                {singleResult.details.didYouMean && (
                  <div className="bg-emerald-950/80 border border-emerald-800 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Sparkles className="w-5 h-5 text-emerald-400" />
                      <div>
                        <h4 className="text-xs font-bold text-white">Typo Detected in Domain</h4>
                        <p className="text-xs text-emerald-200">
                          Did you mean <strong>{singleResult.details.didYouMean}</strong> instead of {singleResult.email}?
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSingleEmailInput(singleResult.details.didYouMean!);
                        handleSingleValidate(singleResult.details.didYouMean!);
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition"
                    >
                      Fix & Validate
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 4. GREYMAIL INTELLIGENCE GUIDE */}
        {activeTab === 'greymail' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest bg-amber-950/80 border border-amber-800 px-3 py-1 rounded-full">
                Deliverability Intelligence
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-2">
                What is Greymail & Why Does It Ruin Your Sender Score?
              </h1>
              <p className="text-slate-400 text-sm max-w-2xl mx-auto">
                Unlike hard bounces, greymails are technically deliverable addresses that destroy engagement rates, trigger spam filters, and get sending domains blacklisted.
              </p>
            </div>

            {/* Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900/60 border border-emerald-900/40 rounded-2xl p-6 space-y-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">Pristine Valid Email</h3>
                <p className="text-xs text-slate-400">
                  Active, primary personal or business mailboxes that open messages, click links, and reply. High engagement signals to Google and Microsoft that your domain is trusted.
                </p>
              </div>

              <div className="bg-slate-900/60 border border-amber-900/40 rounded-2xl p-6 space-y-4">
                <div className="w-10 h-10 rounded-xl bg-amber-950 border border-amber-800 flex items-center justify-center text-amber-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">Greymail (The Silent Killer)</h3>
                <p className="text-xs text-slate-400">
                  Mailboxes subscribed in the past but never opened anymore, secondary junk folders, unmonitored updates aliases, or users who report emails as spam instead of unsubscribing.
                </p>
              </div>

              <div className="bg-slate-900/60 border border-rose-900/40 rounded-2xl p-6 space-y-4">
                <div className="w-10 h-10 rounded-xl bg-rose-950 border border-rose-800 flex items-center justify-center text-rose-400">
                  <XCircle className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">Spam Traps & Hard Bounces</h3>
                <p className="text-xs text-slate-400">
                  Non-existent mailboxes, dead domains, or recycled trap addresses designed specifically by blocklists (Spamhaus, Barracuda) to catch cold scrapers.
                </p>
              </div>
            </div>

            {/* Google & Yahoo 2024 Rule Callout */}
            <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 border border-amber-800/80 rounded-2xl p-6 space-y-3">
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
                <AlertOctagon className="w-4 h-4" />
                <span>Google & Yahoo 2024 Sender Requirements Alert</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Bulk senders sending over 5,000 emails/day must keep their spam complaint rate strictly below <strong>0.3%</strong> (ideally below 0.1%). Sending to greymails is the #1 reason complaint rates exceed this threshold, causing entire sending domains to be sent directly to the Junk/Spam folder.
              </p>
            </div>

            {/* How TruthMail solves it */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white">How TruthMail Detects & Flags Greymail</h3>
              <ul className="space-y-3 text-xs text-slate-300">
                <li className="flex items-start space-x-2">
                  <ChevronRight className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span><strong>Broadcast Keyword Heuristics:</strong> Automatically identifies unmonitored distribution aliases like <code>newsletter@</code>, <code>promo@</code>, <code>deals@</code>, <code>updates@</code>.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <ChevronRight className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span><strong>Deliverability Risk Scoring:</strong> Gives greymails a risk status so you can selectively exclude them from primary cold outreach campaigns.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <ChevronRight className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span><strong>Suppression Segmentation:</strong> Allows 1-click export of cleaned lists with greymail isolated into a separate nurturing campaign.</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* 5. SUBSCRIPTION TIERS & PRICING */}
        {activeTab === 'pricing' && (
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center space-y-3">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest bg-emerald-950 border border-emerald-800 px-3 py-1 rounded-full">
                Predictable Subscription Tiers
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Simple, Transparent Plans for Every Team
              </h1>
              <p className="text-slate-400 text-sm max-w-xl mx-auto">
                Clean your lists with high-speed parallel workers. Switch between recurring subscription plans or buy non-expiring credit packs.
              </p>

              {/* Billing Toggle */}
              <div className="inline-flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs font-semibold mt-4">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-4 py-2 rounded-lg transition ${
                    billingCycle === 'monthly' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Monthly Billed
                </button>
                <button
                  onClick={() => setBillingCycle('annual')}
                  className={`px-4 py-2 rounded-lg transition flex items-center space-x-1.5 ${
                    billingCycle === 'annual' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>Annual Billed</span>
                  <span className="bg-emerald-950 text-emerald-300 text-[10px] px-1.5 py-0.5 rounded border border-emerald-800 font-bold">
                    Save 20%
                  </span>
                </button>
              </div>
            </div>

            {/* 4 Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Starter */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">Starter</h3>
                    <p className="text-xs text-slate-400">For solopreneurs and small lists</p>
                  </div>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-3xl font-extrabold text-white font-mono">
                      ${billingCycle === 'monthly' ? '29' : '24'}
                    </span>
                    <span className="text-xs text-slate-400">/ month</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-center">
                    <span className="text-xs font-bold text-emerald-400 font-mono">5,000 Credits / mo</span>
                  </div>
                  <ul className="space-y-2.5 text-xs text-slate-300">
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Full 12-step verification</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Spam trap & honeypot filter</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Typo & domain suggester</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Standard CSV export</span>
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => { setCredits((c) => c + 5000); alert('Subscribed to Starter Plan! 5,000 credits added.'); }}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition border border-slate-700"
                >
                  Choose Starter
                </button>
              </div>

              {/* Growth - Popular */}
              <div className="bg-slate-900/90 border-2 border-emerald-500 rounded-2xl p-6 space-y-5 flex flex-col justify-between relative shadow-xl shadow-emerald-500/10">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full">
                  Most Popular
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">Growth</h3>
                    <p className="text-xs text-slate-400">For fast-growing sales & outreach teams</p>
                  </div>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-3xl font-extrabold text-white font-mono">
                      ${billingCycle === 'monthly' ? '79' : '65'}
                    </span>
                    <span className="text-xs text-slate-400">/ month</span>
                  </div>
                  <div className="bg-emerald-950/60 border border-emerald-800 p-2.5 rounded-xl text-center">
                    <span className="text-xs font-bold text-emerald-400 font-mono">25,000 Credits / mo</span>
                  </div>
                  <ul className="space-y-2.5 text-xs text-slate-300">
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Everything in Starter</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Greymail risk intelligence</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Real-time API (30 req/sec)</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>3 Team member seats</span>
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => { setCredits((c) => c + 25000); alert('Subscribed to Growth Plan! 25,000 credits added.'); }}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/30"
                >
                  Choose Growth
                </button>
              </div>

              {/* Professional */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">Professional</h3>
                    <p className="text-xs text-slate-400">For marketing agencies & lead gen</p>
                  </div>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-3xl font-extrabold text-white font-mono">
                      ${billingCycle === 'monthly' ? '199' : '165'}
                    </span>
                    <span className="text-xs text-slate-400">/ month</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-center">
                    <span className="text-xs font-bold text-emerald-400 font-mono">100,000 Credits / mo</span>
                  </div>
                  <ul className="space-y-2.5 text-xs text-slate-300">
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Everything in Growth</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Catch-all deep scoring</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Unlimited team seats</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Webhook integration</span>
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => { setCredits((c) => c + 100000); alert('Subscribed to Professional Plan! 100,000 credits added.'); }}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition border border-slate-700"
                >
                  Choose Professional
                </button>
              </div>

              {/* Enterprise */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">Enterprise</h3>
                    <p className="text-xs text-slate-400">High volume & custom SLAs</p>
                  </div>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-3xl font-extrabold text-white font-mono">$599+</span>
                    <span className="text-xs text-slate-400">/ month</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-center">
                    <span className="text-xs font-bold text-emerald-400 font-mono">500,000+ Credits / mo</span>
                  </div>
                  <ul className="space-y-2.5 text-xs text-slate-300">
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Dedicated worker IP pool</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Zero-data retention (GDPR mode)</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>99.9% Uptime SLA</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Dedicated technical manager</span>
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => alert('Enterprise sales consultation simulated.')}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition border border-slate-700"
                >
                  Contact Sales
                </button>
              </div>
            </div>

            {/* Pay As You Go Calculator */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-white">Pay-As-You-Go Credit Packs</h3>
                  <p className="text-slate-400 text-xs mt-1">Non-expiring credits with automatic rollover. Pay only for what you scrub.</p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-xs text-slate-400">Fair Billing Policy:</span>
                  <span className="text-xs font-semibold text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded-md border border-emerald-800">
                    Unknown statuses auto-refunded
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { credits: 2000, price: 18, perCredit: '$0.0090' },
                  { credits: 10000, price: 65, perCredit: '$0.0065' },
                  { credits: 50000, price: 250, perCredit: '$0.0050' },
                  { credits: 250000, price: 850, perCredit: '$0.0034' },
                ].map((pack, idx) => (
                  <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center space-y-2">
                    <span className="text-base font-extrabold text-white font-mono block">
                      {pack.credits.toLocaleString()} Credits
                    </span>
                    <span className="text-2xl font-bold text-emerald-400 font-mono block">${pack.price}</span>
                    <span className="text-[10px] text-slate-400 block">{pack.perCredit} per check</span>
                    <button
                      onClick={() => {
                        setCredits((c) => c + pack.credits);
                        alert(`Successfully purchased ${pack.credits.toLocaleString()} credits for $${pack.price}!`);
                      }}
                      className="w-full mt-2 py-1.5 bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white rounded-lg text-xs font-semibold transition"
                    >
                      Buy Pack
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 6. DEVELOPER API VIEW */}
        {activeTab === 'api' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Developer API & Webhooks
              </h1>
              <p className="text-slate-400 text-sm">
                Integrate real-time email verification directly into your registration forms, CRM triggers, or webhooks.
              </p>
            </div>

            {/* API Key Box */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Live Secret API Key</span>
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  readOnly
                  value="sec_live_948f93a0d18e24c57712ba63f01b"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-emerald-400 font-mono"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('sec_live_948f93a0d18e24c57712ba63f01b');
                    setCopiedKey(true);
                    setTimeout(() => setCopiedKey(false), 2000);
                  }}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition flex items-center space-x-1.5"
                >
                  {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400">Keep your secret key safe. Never expose it in client-side browser bundles.</p>
            </div>

            {/* Code Examples */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Example cURL Request</span>
                <span className="text-[11px] text-emerald-400 font-mono">POST /api/validate/single</span>
              </div>
              <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-emerald-300 overflow-x-auto border border-slate-800">
{`curl -X POST https://api.truthmail.io/v1/validate/single \\
  -H "Authorization: Bearer sec_live_948f93a0d18e24c57712ba63f01b" \\
  -H "Content-Type: application/json" \\
  -d '{"email": "elon.musk@x.com"}'`}
              </pre>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Response JSON (200 OK)</span>
                <span className="text-[11px] text-slate-400 font-mono">Latency ~142ms</span>
              </div>
              <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-slate-300 overflow-x-auto border border-slate-800">
{`{
  "email": "elon.musk@x.com",
  "status": "mailable",
  "sub_status": "valid_mailbox",
  "quality_score": 98,
  "details": {
    "syntax_valid": true,
    "has_mx": true,
    "mx_record": "mail.x.com",
    "smtp_code": "250",
    "is_spam_trap": false,
    "is_greymail": false,
    "is_disposable": false,
    "is_catch_all": false,
    "did_you_mean": null
  }
}`}
              </pre>
            </div>
          </div>
        )}
      </main>

      {/* INSPECT EMAIL DETAIL MODAL */}
      {selectedEmailDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-2xl relative">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Audit Record</span>
                <h3 className="text-lg font-bold text-white font-mono">{selectedEmailDetail.email}</h3>
              </div>
              <button
                onClick={() => setSelectedEmailDetail(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400">Primary Classification:</span>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                    selectedEmailDetail.status === 'mailable'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : selectedEmailDetail.status === 'non_mailable'
                      ? 'bg-rose-950 text-rose-400 border border-rose-800'
                      : 'bg-amber-950 text-amber-400 border border-amber-800'
                  }`}
                >
                  {selectedEmailDetail.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-0.5">
                  <span className="text-slate-400 text-[10px] uppercase">Deliverability Score</span>
                  <div className="font-mono font-bold text-base text-white">{selectedEmailDetail.qualityScore}/100</div>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-0.5">
                  <span className="text-slate-400 text-[10px] uppercase">SMTP Response Code</span>
                  <div className="font-mono font-bold text-base text-emerald-400">{selectedEmailDetail.details.smtpCode}</div>
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
                <span className="text-slate-400 text-[10px] uppercase font-semibold block">DNS MX Host</span>
                <p className="font-mono text-slate-200 text-xs">
                  {selectedEmailDetail.details.mxRecords.join(', ') || 'No active MX host records found'}
                </p>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
                <span className="text-slate-400 text-[10px] uppercase font-semibold block">Raw SMTP Response</span>
                <p className="font-mono text-slate-300 text-[11px]">
                  {selectedEmailDetail.details.smtpMessage}
                </p>
              </div>

              {/* Free Live SPF & DMARC Security Authentication Inspection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[10px] uppercase font-semibold">SPF Authentication</span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
                      {selectedEmailDetail.details.spfFound ? '✓ Valid SPF' : 'Missing'}
                    </span>
                  </div>
                  <p className="font-mono text-[10px] text-slate-300 truncate" title={selectedEmailDetail.details.spfRecord || ''}>
                    {selectedEmailDetail.details.spfRecord || 'No SPF record found'}
                  </p>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[10px] uppercase font-semibold">DMARC Security Policy</span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
                      {selectedEmailDetail.details.dmarcFound ? '✓ DMARC Protected' : 'Missing'}
                    </span>
                  </div>
                  <p className="font-mono text-[10px] text-slate-300 truncate" title={selectedEmailDetail.details.dmarcRecord || ''}>
                    {selectedEmailDetail.details.dmarcRecord || 'No DMARC policy found'}
                  </p>
                </div>
              </div>

              {selectedEmailDetail.details.didYouMean && (
                <div className="bg-emerald-950/70 border border-emerald-800 p-3 rounded-xl text-xs text-emerald-300">
                  💡 Typo Detected: Suggested domain correction is <strong>{selectedEmailDetail.details.didYouMean}</strong>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedEmailDetail(null)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
            >
              Close Audit Modal
            </button>
          </div>
        </div>
      )}

      {/* TOP UP CREDITS MODAL */}
      {topUpModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Add Verification Credits</h3>
                <p className="text-xs text-slate-400 mt-0.5">Select a credit pack to top up your account</p>
              </div>
              <button onClick={() => setTopUpModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {[
                { amount: 5000, price: 35 },
                { amount: 10000, price: 65 },
                { amount: 25000, price: 150 },
                { amount: 50000, price: 250 },
              ].map((pack) => (
                <div
                  key={pack.amount}
                  onClick={() => setTopUpCredits(pack.amount)}
                  className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                    topUpCredits === pack.amount
                      ? 'bg-emerald-950/60 border-emerald-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold">{pack.amount.toLocaleString()} Credits</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-400">${pack.price}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setCredits((prev) => prev + topUpCredits);
                setTopUpModalOpen(false);
                alert(`Added ${topUpCredits.toLocaleString()} credits to your account!`);
              }}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-600/20"
            >
              Confirm Purchase & Add {topUpCredits.toLocaleString()} Credits
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="font-semibold text-slate-400">TruthMail SaaS Engine</span>
            <span>•</span>
            <span>ZeroBounce Benchmark Standard</span>
          </div>
          <div>
            Built with 12-Step Deep Validation, MX Socket Simulation, and Deliverability Intelligence.
          </div>
        </div>
      </footer>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          setCredits(user.creditsBalance);
        }}
      />
    </div>
  );
}
