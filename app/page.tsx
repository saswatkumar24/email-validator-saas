'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import AuthModal from '@/components/AuthModal';
import EvidenceDrawer from '@/components/EvidenceDrawer';
import RecentJobsCenter, { RecentJobItem } from '@/components/RecentJobsCenter';
import {
  LayoutDashboard,
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
  FileSpreadsheet,
  BarChart3,
  SlidersHorizontal,
  Clock,
  Eye,
  X,
  BookOpen,
  MessageSquare,
  Send,
  Building2,
  Phone,
  Bookmark,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { SAMPLE_BENCHMARK_EMAILS, SAMPLE_CSV_CONTENT } from '@/lib/sample-data';
import { EmailValidationResult, BatchValidationSummary } from '@/lib/email-engine';
import { DELIVERABILITY_ARTICLES, DeliverabilityArticle } from '@/lib/deliverability-articles';

interface UploadedSheetInfo {
  name: string;
  size: number;
  totalRows: number;
  headers: string[];
  detectedEmailColumn: string;
  emails: string[];
  previewRows: Record<string, string>[];
}

export type TabType = 'verify' | 'deliverability' | 'billing' | 'contact' | 'dashboard' | 'reports' | 'api';

export default function TruthMailDashboard() {
  // Navigation tabs (ZeroBounce layout: Email Verification as default Home!)
  const [activeTab, setActiveTab] = useState<TabType>('verify');
  const [verifySubTab, setVerifySubTab] = useState<'bulk' | 'single'>('bulk');
  const [drilldownSubStatus, setDrilldownSubStatus] = useState<string | null>(null);

  // Deliverability sub-views: Intelligence or Knowledge Base / Blog
  const [deliverabilitySubTab, setDeliverabilitySubTab] = useState<'intelligence' | 'knowledge_base'>('intelligence');
  const [selectedArticle, setSelectedArticle] = useState<DeliverabilityArticle | null>(null);
  const [articleCategoryFilter, setArticleCategoryFilter] = useState<string>('All');
  const [articleSearchQuery, setArticleSearchQuery] = useState<string>('');

  // Contact form state
  const [contactSubmitted, setContactSubmitted] = useState<boolean>(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    company: '',
    category: 'Enterprise Volume (500k+ emails)',
    message: '',
  });

  // SaaS Credits State
  const [credits, setCredits] = useState<number>(100000);
  const [topUpModalOpen, setTopUpModalOpen] = useState(false);
  const [topUpCredits, setTopUpCredits] = useState<number>(10000);

  // Recent Jobs Center State
  const [recentJobs, setRecentJobs] = useState<RecentJobItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('truthmail_recent_jobs');
      if (stored) {
        setRecentJobs(JSON.parse(stored));
      }
    } catch {}
  }, []);

  const saveRecentJob = (newJob: RecentJobItem) => {
    setRecentJobs((prev) => {
      const updated = [newJob, ...prev.filter((j) => j.id !== newJob.id)].slice(0, 10);
      try {
        localStorage.setItem('truthmail_recent_jobs', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

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
      // Chunk into sub-batches of 250 emails so browser network stays ultra-responsive and never times out
      const BATCH_SIZE = 250;
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

      const cleanFileName = (uploadedSheet?.name || 'bulk_verification.csv')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/\.[^/.]+$/, '');
      const runTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const runId = `${runTimestamp}_${cleanFileName}`;

      for (let c = 0; c < chunks.length; c++) {
        const currentChunk = chunks[c];
        const processedSoFar = c * BATCH_SIZE;
        const progressPct = Math.round(5 + ((processedSoFar / emailList.length) * 90));
        setValidationProgress(progressPct);
        setValidationStatusMsg(
          `Scrubbing batch ${c + 1} of ${chunks.length} (${processedSoFar.toLocaleString()} / ${emailList.length.toLocaleString()} emails)...`
        );

        let chunkSummary: BatchValidationSummary | null = null;
        let lastErr: any = null;

        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const res = await fetch('/api/validate/batch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                emails: currentChunk,
                filename: uploadedSheet?.name || 'bulk_verification.csv',
                runId,
                batchIndex: c + 1,
                totalBatches: chunks.length,
              }),
            });

            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.error || `Server responded with status ${res.status}`);
            }

            chunkSummary = await res.json();
            break;
          } catch (err: any) {
            lastErr = err;
            if (attempt < 3) {
              setValidationStatusMsg(
                `Reconnecting batch ${c + 1} of ${chunks.length} (retry ${attempt}/2)...`
              );
              await new Promise((r) => setTimeout(r, attempt * 800));
            }
          }
        }

        if (!chunkSummary) {
          throw new Error(lastErr?.message || `Failed to validate batch chunk ${c + 1}`);
        }

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
        executionTimeMs: 0,
        riskBreakdown: aggregatedRisk,
        providerBreakdown: aggregatedProvider,
        results: aggregatedResults,
      };

      setTimeout(() => {
        setReportData(finalSummary);
        setCredits((prev) => Math.max(0, prev - finalSummary.total));
        setIsValidating(false);
        setActiveTab('reports');
        saveRecentJob({
          id: `job_${Date.now()}`,
          filename: uploadedSheet?.name || 'bulk_verification.csv',
          totalEmails: finalSummary.total,
          mailable: finalSummary.mailable,
          nonMailable: finalSummary.nonMailable,
          risky: finalSummary.risky,
          unknown: finalSummary.unknown,
          avgScore: finalSummary.averageQualityScore,
          timestamp: new Date().toISOString(),
        });
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

  // Filter Table Results with Interactive Metric & Risk Drill-down
  const filteredResults = (reportData?.results || []).filter((item) => {
    if (tableFilter !== 'all' && item.status !== tableFilter) return false;
    if (drilldownSubStatus) {
      if (drilldownSubStatus === 'spam_trap' && !item.details.isSpamTrap && item.subStatus !== 'spam_trap_detected') return false;
      else if (drilldownSubStatus === 'disposable' && !item.details.isDisposable && item.subStatus !== 'disposable_address') return false;
      else if (drilldownSubStatus === 'catch_all' && !item.details.isCatchAll && item.subStatus !== 'catch_all_domain') return false;
      else if (drilldownSubStatus === 'role_based' && !item.details.isRoleBased && item.subStatus !== 'role_based_account') return false;
      else if (drilldownSubStatus === 'greymail' && !item.details.isGreymail && item.subStatus !== 'greymail_identified') return false;
      else if (drilldownSubStatus === 'typo' && !item.details.didYouMean && item.subStatus !== 'typo_detected') return false;
      else if (drilldownSubStatus === 'no_mx' && (item.details.hasMx || item.subStatus !== 'no_mx_record')) return false;
      else if (drilldownSubStatus === 'invalid_syntax' && (item.details.syntaxValid || item.subStatus !== 'invalid_syntax')) return false;
      else if (!['spam_trap', 'disposable', 'catch_all', 'role_based', 'greymail', 'typo', 'no_mx', 'invalid_syntax'].includes(drilldownSubStatus) && item.subStatus !== drilldownSubStatus) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        item.email.toLowerCase().includes(q) ||
        item.details.domain.toLowerCase().includes(q) ||
        item.subStatus.toLowerCase().includes(q)
      );
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

  const exportFilteredResults = () => {
    if (!reportData || filteredResults.length === 0) return;
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
    filteredResults.forEach((r) => {
      rows.push([
        r.email,
        r.status,
        r.subStatus,
        r.qualityScore.toString(),
        r.details.domain,
        r.details.mxRecords[0] || (r.details.dnsReason ? `[${r.details.dnsReason}]` : 'None'),
        r.details.smtpCode,
        r.details.isDisposable ? 'YES' : 'NO',
        r.details.isSpamTrap ? 'YES' : 'NO',
        r.details.isGreymail ? 'YES' : 'NO',
        r.details.isRoleBased ? 'YES' : 'NO',
        r.details.didYouMean || 'None',
      ]);
    });
    downloadCSV(rows, `truthmail_filtered_leads_${Date.now()}.csv`);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand - Click lands on Email Verification Home */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => { setActiveTab('verify'); setVerifySubTab('bulk'); }}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center shadow-md shadow-emerald-600/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-slate-900">Truth<span className="text-emerald-600">Mail</span></span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">99%+ Accurate Email Validation & Deliverability</p>
            </div>
          </div>

          {/* Navigation Links - ZeroBounce Style */}
          <nav className="hidden lg:flex items-center space-x-1">
            <button
              onClick={() => {
                setActiveTab('verify');
                setVerifySubTab('bulk');
              }}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 ${
                activeTab === 'verify'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <UploadCloud className="w-4 h-4 text-emerald-600" />
              <span>Email Verification</span>
            </button>

            <button
              onClick={() => setActiveTab('deliverability')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 ${
                activeTab === 'deliverability'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>Deliverability & Knowledge Base</span>
            </button>

            <button
              onClick={() => setActiveTab('billing')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 ${
                activeTab === 'billing'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <CreditCard className="w-4 h-4 text-slate-500" />
              <span>Pricing</span>
            </button>

            <button
              onClick={() => setActiveTab('contact')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 ${
                activeTab === 'contact'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-slate-500" />
              <span>Contact</span>
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 ${
                activeTab === 'dashboard'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-slate-500" />
              <span>Dashboard</span>
            </button>

            {reportData && (
              <button
                onClick={() => {
                  setActiveTab('reports');
                  setTableFilter('all');
                  setDrilldownSubStatus(null);
                }}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 ${
                  activeTab === 'reports'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                <span>Audit Report</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('api')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 ${
                activeTab === 'api'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Code2 className="w-4 h-4 text-slate-500" />
              <span>API</span>
            </button>
          </nav>

          {/* Credit Balance & Auth Controls */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div
              onClick={() => setTopUpModalOpen(true)}
              className="flex items-center space-x-2 bg-slate-100 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 px-3 py-1.5 rounded-full text-xs cursor-pointer transition shadow-2xs group"
              title="Click to top up credits"
            >
              <span className="text-slate-500 font-medium hidden sm:inline">Credits:</span>
              <span className="font-bold text-emerald-700 font-mono text-xs sm:text-sm">{credits.toLocaleString()}</span>
              <span className="text-[10px] font-bold bg-emerald-600 text-white px-1.5 py-0.2 rounded-full group-hover:scale-105 transition">+ Add</span>
            </div>

            {currentUser ? (
              <div className="flex items-center space-x-2">
                {currentUser.role === 'admin' && (
                  <Link
                    href="/admin"
                    className="bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 font-semibold text-xs px-3 py-1.5 rounded-full transition flex items-center space-x-1"
                  >
                    <span>Admin</span>
                  </Link>
                )}

                <span className="text-xs text-slate-700 font-medium hidden sm:inline-block">
                  {currentUser.name}
                </span>

                <button
                  onClick={handleLogout}
                  className="text-xs text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-300 px-3 py-1.5 rounded-full transition"
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
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 transition"
                >
                  Sign In
                </button>

                <button
                  onClick={() => {
                    setAuthModalMode('signup');
                    setAuthModalOpen(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3.5 py-1.5 rounded-full transition shadow-sm flex items-center space-x-1"
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

        {/* 1. DASHBOARD OVERVIEW WORKSPACE */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Dashboard Welcome Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
              <div>
                <div className="flex items-center space-x-2.5">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Deliverability Intelligence Hub
                  </h1>
                  <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold">
                    Live System
                  </span>
                </div>
                <p className="text-slate-500 text-sm mt-1">
                  Enterprise email validation, bounce suppression, and domain reputation monitoring.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => {
                    setActiveTab('verify');
                    setVerifySubTab('bulk');
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition shadow-sm flex items-center space-x-2"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Verify Email List</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('verify');
                    setVerifySubTab('single');
                  }}
                  className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition shadow-xs flex items-center space-x-2"
                >
                  <Zap className="w-4 h-4 text-emerald-600" />
                  <span>Single Sandbox</span>
                </button>

                <button
                  onClick={handleLoadSample}
                  className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium text-xs rounded-xl transition shadow-xs flex items-center space-x-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Load Benchmark (4,678 Leads)</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                  <CheckCheck className="w-4 h-4 text-emerald-600" />
                  <span>Total Verified</span>
                </span>
                <div className="text-3xl font-extrabold text-slate-900 font-mono">
                  {reportData ? reportData.total.toLocaleString() : (recentJobs[0]?.totalEmails || 0).toLocaleString()}
                </div>
                <p className="text-[11px] text-slate-500">Unique leads validated through 12-step pipeline</p>
              </div>

              <div className="bg-white border border-emerald-200 rounded-2xl p-5 space-y-2 shadow-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Clean Mailable Rate</span>
                </span>
                <div className="text-3xl font-extrabold text-emerald-600 font-mono">
                  {reportData ? `${Math.round((reportData.mailable / reportData.total) * 100)}%` : recentJobs[0] ? `${Math.round((recentJobs[0].mailable / recentJobs[0].totalEmails) * 100)}%` : '95%+'}
                </div>
                <p className="text-[11px] text-slate-500">Guaranteed inbox deliverability threshold</p>
              </div>

              <div className="bg-white border border-rose-200 rounded-2xl p-5 space-y-2 shadow-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-rose-700 flex items-center space-x-1.5">
                  <XCircle className="w-4 h-4" />
                  <span>Bounces Suppressed</span>
                </span>
                <div className="text-3xl font-extrabold text-rose-600 font-mono">
                  {reportData ? reportData.nonMailable.toLocaleString() : (recentJobs[0]?.nonMailable || 0).toLocaleString()}
                </div>
                <p className="text-[11px] text-slate-500">Hard bounces & toxic spam traps blocked</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>Credits Available</span>
                </span>
                <div className="text-3xl font-extrabold text-slate-900 font-mono">
                  {credits.toLocaleString()}
                </div>
                <p className="text-[11px] text-slate-500">Non-expiring verification balance</p>
              </div>
            </div>

            {/* Quick Action Navigation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div
                onClick={() => {
                  setActiveTab('verify');
                  setVerifySubTab('bulk');
                }}
                className="group bg-white hover:bg-slate-50/80 border border-slate-200 hover:border-emerald-300 p-6 rounded-2xl cursor-pointer transition shadow-sm space-y-3"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 flex items-center justify-between">
                  <span>Bulk List Verifier</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition" />
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Clean 5k, 10k, or 50k+ leads from CSV or XLSX. Automatically maps email columns and scrubs dead domains in seconds.
                </p>
              </div>

              <div
                onClick={() => {
                  setActiveTab('verify');
                  setVerifySubTab('single');
                }}
                className="group bg-white hover:bg-slate-50/80 border border-slate-200 hover:border-emerald-300 p-6 rounded-2xl cursor-pointer transition shadow-sm space-y-3"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 flex items-center justify-between">
                  <span>Single Sandbox</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition" />
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Instantly simulate live SMTP handshakes, test SPF/DMARC policies, and check typo suggestions for individual leads.
                </p>
              </div>

              <div
                onClick={() => {
                  setActiveTab('reports');
                  setTableFilter('all');
                  setDrilldownSubStatus(null);
                }}
                className="group bg-white hover:bg-slate-50/80 border border-slate-200 hover:border-emerald-300 p-6 rounded-2xl cursor-pointer transition shadow-sm space-y-3"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 flex items-center justify-between">
                  <span>Insights & Reports</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition" />
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Deep deliverability breakdowns, provider distribution, interactive risk filters, and 1-click clean list exports.
                </p>
              </div>
            </div>

            {/* Recent Jobs Center */}
            <div className="space-y-3">
              <RecentJobsCenter
                jobs={recentJobs}
                onSelectJob={() => {
                  setActiveTab('reports');
                }}
                onClearJobs={() => {
                  setRecentJobs([]);
                  try {
                    localStorage.removeItem('truthmail_recent_jobs');
                  } catch {}
                }}
                onDownloadJob={(job, type) => {
                  if (reportData) {
                    if (type === 'clean') exportCleanOnly();
                    else exportFullAudit();
                  } else {
                    setActiveTab('reports');
                  }
                }}
                onQuickUpload={() => {
                  setActiveTab('verify');
                  setVerifySubTab('bulk');
                }}
              />
            </div>
          </div>
        )}

        {/* 2. EMAIL VERIFICATION WORKSPACE (Unified Bulk & Single - ZeroBounce Standard) */}
        {activeTab === 'verify' && (
          <div className="space-y-6">
            {/* ZeroBounce-style Enterprise Hero Banner */}
            <div className="bg-gradient-to-b from-white to-slate-50 border border-slate-200/80 rounded-2xl p-6 sm:p-8 text-center space-y-3 shadow-xs">
              <div className="inline-flex items-center space-x-2 bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-3.5 py-1 rounded-full text-xs font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>99%+ Accurate Email Validation & Deliverability Platform</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Remove Invalid Emails & Land in the Inbox
              </h1>
              <p className="text-slate-600 text-xs sm:text-sm max-w-2xl mx-auto leading-relaxed">
                Protect your sender reputation, eliminate bounce rates, and stay strictly compliant with Google and Yahoo 2024 bulk sender rules. Test an individual address or upload entire lists with confidence.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-[11px] font-medium text-slate-500">
                <span className="flex items-center space-x-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Zero-Bounce Guarantee</span>
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center space-x-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Spam Trap & Greymail Suppression</span>
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center space-x-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Real-Time SMTP Handshake Simulation</span>
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center space-x-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>GDPR & SOC2 Ready</span>
                </span>
              </div>
            </div>

            {/* Sub-Switch Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setVerifySubTab('bulk')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center space-x-2 ${
                    verifySubTab === 'bulk'
                      ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Bulk Spreadsheets (.csv, .xlsx, .tsv)</span>
                </button>
                <button
                  onClick={() => setVerifySubTab('single')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center space-x-2 ${
                    verifySubTab === 'single'
                      ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  <span>Single Real-Time Sandbox</span>
                </button>
              </div>

              {verifySubTab === 'bulk' && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleDownloadTemplate}
                    className="px-3 py-1.5 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition flex items-center space-x-1 shadow-xs font-medium"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>CSV Template</span>
                  </button>
                  <button
                    onClick={handleLoadSample}
                    className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition flex items-center space-x-1 shadow-xs"
                    title="Load pre-built sample spreadsheet to test list cleaning instantly"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Test Sample List</span>
                  </button>
                </div>
              )}
            </div>

            {verifySubTab === 'bulk' && (
              <div className="space-y-8">
                {/* Header intro */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                      Bulk Email Validation & Scrubbing
                    </h2>
                    <p className="text-slate-500 text-xs sm:text-sm mt-1">
                      Upload your spreadsheet (.xlsx, .csv, .txt, .tsv). Our 12-step engine checks MX, spam traps, hard bounces, typos, and greymails.
                    </p>
                  </div>
                  <button
                    onClick={handleLoadSample}
                    className="px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition flex items-center space-x-1.5 shadow-xs"
                  >
                    <Zap className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Load 25 Benchmark Emails</span>
                  </button>
                </div>

            {/* Validation Process In Flight */}
            {isValidating && (
              <div className="bg-white border border-emerald-200 rounded-2xl p-8 text-center space-y-6 shadow-sm">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Validating Email List...</h3>
                  <p className="text-slate-500 text-sm mt-1">{validationStatusMsg}</p>
                </div>
                {/* Progress bar */}
                <div className="max-w-md mx-auto space-y-2">
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${validationProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>12-Step Deep Check</span>
                    <span className="font-mono text-emerald-700 font-semibold">{validationProgress}% Completed</span>
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
                        ? 'border-emerald-500 bg-emerald-50/60 shadow-lg'
                        : isUploadingFile
                        ? 'border-slate-300 bg-slate-50 cursor-wait'
                        : uploadedSheet
                        ? 'border-emerald-300 bg-emerald-50/20 shadow-xs'
                        : 'border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/20 bg-white shadow-xs'
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
                        <RefreshCw className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
                        <h3 className="text-sm font-semibold text-slate-900">Analyzing sheet structure & columns...</h3>
                        <p className="text-xs text-slate-500">Parsing Excel/CSV cells and extracting email addresses</p>
                      </div>
                    ) : (
                      <>
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 group-hover:bg-emerald-50 border border-slate-200 group-hover:border-emerald-200 flex items-center justify-center mx-auto transition mb-4">
                          <UploadCloud className="w-7 h-7 text-slate-500 group-hover:text-emerald-600 transition" />
                        </div>
                        <h3 className="text-base font-semibold text-slate-900">
                          Drag & drop your Excel/CSV sheet here, or <span className="text-emerald-600 underline underline-offset-4 font-bold">Browse files</span>
                        </h3>
                        <p className="text-xs text-slate-500 mt-2">
                          Supports <strong>.XLSX</strong>, <strong>.CSV</strong>, <strong>.TXT</strong>, <strong>.TSV</strong>
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Auto-detects email columns from Google Sheets, Microsoft Excel, HubSpot, and CRM exports
                        </p>
                      </>
                    )}
                  </div>

                  {/* Error Notification if file parsing failed */}
                  {uploadError && (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  {/* UPLOADED SHEET DETAIL CARD (Displays when a file is parsed) */}
                  {uploadedSheet && (
                    <div className="bg-white border border-emerald-300 rounded-2xl p-5 space-y-4 shadow-sm">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 flex-shrink-0">
                            <FileSpreadsheet className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="text-sm font-bold text-slate-900 font-mono">{uploadedSheet.name}</h4>
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
                                <CheckCheck className="w-3 h-3 text-emerald-600" />
                                <span>Parsed</span>
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Detected <strong>{uploadedSheet.emails.length.toLocaleString()} emails</strong> ready for verification
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={handleClearSheet}
                          className="text-xs text-slate-500 hover:text-rose-600 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 border border-slate-200 transition font-medium"
                        >
                          Change File
                        </button>
                      </div>

                      {/* Column detector & mapping */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                          <span className="text-slate-600 font-medium">Mapped Email Column:</span>
                          <span className="font-semibold text-emerald-700 bg-white px-2.5 py-1 rounded border border-slate-200 font-mono shadow-xs">
                            {uploadedSheet.detectedEmailColumn}
                          </span>
                        </div>
                        {uploadedSheet.headers.length > 1 && (
                          <div className="text-[11px] text-slate-500">
                            Other sheet columns found: <span className="text-slate-700">{uploadedSheet.headers.filter(h => h !== uploadedSheet.detectedEmailColumn).join(', ')}</span>
                          </div>
                        )}
                      </div>

                      {/* Quick Preview of First Rows */}
                      {uploadedSheet.previewRows.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                            Sheet Preview (First {uploadedSheet.previewRows.length} Rows)
                          </span>
                          <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
                            <table className="w-full text-left text-[11px]">
                              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[10px]">
                                <tr>
                                  {uploadedSheet.headers.map((h, i) => (
                                    <th key={i} className="py-2 px-3 font-semibold">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-700">
                                {uploadedSheet.previewRows.map((row, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/80">
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
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-extrabold rounded-xl transition shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-2 text-sm"
                      >
                        <ShieldCheck className="w-5 h-5" />
                        <span>
                          Verify & Scrub All {uploadedSheet.emails.length.toLocaleString()} Emails ({uploadedSheet.emails.length} Credits)
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Manual Paste / Raw input (Collapsible or Secondary) */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setShowManualPaste(!showManualPaste)}
                        className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center space-x-1.5"
                      >
                        <Mail className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{showManualPaste ? 'Hide Paste Box' : 'Or Paste Emails Directly'}</span>
                        <span className="text-[10px] text-slate-400">({showManualPaste ? 'click to collapse' : 'click to expand'})</span>
                      </button>

                      {inputText && (
                        <button
                          onClick={() => { setInputText(''); setUploadedSheet(null); }}
                          className="text-xs text-slate-500 hover:text-rose-600 flex items-center space-x-1 font-medium"
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
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition resize-y"
                        />
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>
                            Detected count:{' '}
                            <strong className="text-slate-900 font-mono">
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
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold rounded-xl transition shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-2 text-sm"
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
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-xs">
                    <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>12-Step Detection Engine Included</span>
                    </h3>

                    <div className="space-y-3.5">
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 flex-shrink-0 mt-0.5">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-slate-900">DNS MX & Authoritative Lookup</h4>
                          <p className="text-[11px] text-slate-500">Validates active mail exchange records and fallback A records directly from root servers.</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 flex-shrink-0 mt-0.5">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-slate-900">Spam Trap & Honeypot Detection</h4>
                          <p className="text-[11px] text-slate-500">Identifies pristine and recycled spam traps that cause instant domain blacklisting.</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 flex-shrink-0 mt-0.5">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-slate-900">Greymail & Engagement Risk</h4>
                          <p className="text-[11px] text-slate-500">Flags low-engagement promotional mailboxes and unmonitored broadcast digests.</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 flex-shrink-0 mt-0.5">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-slate-900">Smart Typo Auto-Suggestion</h4>
                          <p className="text-[11px] text-slate-500">Detects misspelled domains like `gamil.com` or `hotmial.com` with 1-click fixes.</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 flex-shrink-0 mt-0.5">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-slate-900">30,000+ Disposable Domains</h4>
                          <p className="text-[11px] text-slate-500">Filters 10-minute temporary throwaway mailboxes (Mailinator, GuerrillaMail, etc.).</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 flex-shrink-0 mt-0.5">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-slate-900">Catch-All (Accept-All) Analysis</h4>
                          <p className="text-[11px] text-slate-500">Probes whether mail server accepts non-existent recipients without rejecting.</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Zero-Bounce Guarantee</span>
                        <span className="text-emerald-700 font-semibold">99.2% Deliverability</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Unified Verification: Single Sandbox */}
        {verifySubTab === 'single' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Single Real-Time Validation Sandbox
              </h1>
              <p className="text-slate-500 text-sm">
                Simulate our live REST API verification endpoint for single sign-up forms, CRM syncs, and real-time checks.
              </p>
            </div>

            {/* Input card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-sm">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={singleEmailInput}
                  onChange={(e) => setSingleEmailInput(e.target.value)}
                  placeholder="Enter email to test (e.g. elon.musk@x.com)"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-mono placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
                <button
                  onClick={() => handleSingleValidate()}
                  disabled={singleLoading || !singleEmailInput}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-sm rounded-xl transition flex items-center justify-center space-x-2 shadow-xs"
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
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-500 font-medium">Quick Test Cases:</span>
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
                    className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200 transition font-medium"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Result display */}
            {singleResult && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Verification Result</span>
                    <h2 className="text-xl font-bold text-slate-900 font-mono mt-0.5">{singleResult.email}</h2>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase block font-medium">Deliverability Score</span>
                      <span className="text-xl font-extrabold text-emerald-700 font-mono">
                        {singleResult.qualityScore} / 100
                      </span>
                    </div>
                    <span
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider ${
                        singleResult.status === 'mailable'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : singleResult.status === 'non_mailable'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : singleResult.status === 'risky'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {singleResult.status}
                    </span>
                  </div>
                </div>

                {/* 12 Point Detailed Checklist */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Syntax / RFC 5322</span>
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900">
                      {singleResult.details.syntaxValid ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      )}
                      <span>{singleResult.details.syntaxValid ? 'Valid Format' : 'Syntax Error'}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">MX Records</span>
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900">
                      {singleResult.details.hasMx ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      )}
                      <span className="truncate">{singleResult.details.hasMx ? singleResult.details.mxRecords[0] : 'None Found'}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">SMTP Handshake</span>
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900">
                      <span className="font-mono text-emerald-700 font-semibold">{singleResult.details.smtpCode}</span>
                      <span className="truncate">{singleResult.details.smtpDeliverable ? 'Recipient OK' : 'Undeliverable'}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Spam Trap Status</span>
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900">
                      {singleResult.details.isSpamTrap ? (
                        <Flame className="w-3.5 h-3.5 text-rose-600" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                      <span>{singleResult.details.isSpamTrap ? 'Spam Trap Detected' : 'Clean (No Trap)'}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Greymail Analysis</span>
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900">
                      {singleResult.details.isGreymail ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                      <span>{singleResult.details.isGreymail ? 'Greymail Identified' : 'Standard Mailbox'}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Burner / Disposable</span>
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900">
                      {singleResult.details.isDisposable ? (
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                      <span>{singleResult.details.isDisposable ? 'Disposable Burner' : 'Permanent Mailbox'}</span>
                    </div>
                  </div>
                </div>

                {/* Did you mean banner if typo */}
                {singleResult.details.didYouMean && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Sparkles className="w-5 h-5 text-emerald-600" />
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Typo Detected in Domain</h4>
                        <p className="text-xs text-slate-600">
                          Did you mean <strong>{singleResult.details.didYouMean}</strong> instead of {singleResult.email}?
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSingleEmailInput(singleResult.details.didYouMean!);
                        handleSingleValidate(singleResult.details.didYouMean!);
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition shadow-xs"
                    >
                      Fix & Validate
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    )}

    {/* 4. INSIGHTS & REPORTS WORKSPACE */}
    {activeTab === 'reports' && (
          <div className="space-y-8">
            {!reportData ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-500">
                  <FileText className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">No Validation Report Available Yet</h3>
                <p className="text-slate-500 text-sm max-w-md mx-auto">
                  Upload a sheet or run our 25-email benchmark test to generate an enterprise deliverability report.
                </p>
                <button
                  onClick={() => {
                    handleLoadSample();
                    setActiveTab('verify');
                    setVerifySubTab('bulk');
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition shadow-xs"
                >
                  Load Benchmark Dataset
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Header with Export buttons */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                        Deliverability & Risk Intelligence Report
                      </h1>
                      <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold">
                        Scrub Complete
                      </span>
                    </div>
                    <p className="text-slate-500 text-sm mt-1">
                      Processed <strong>{reportData.total}</strong> unique email addresses • Average Quality Score: <strong className="text-emerald-700">{reportData.averageQualityScore}/100</strong>
                    </p>
                  </div>

                  {/* Export Options */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={exportCleanOnly}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition shadow-xs flex items-center space-x-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export Clean Only ({reportData.mailable})</span>
                    </button>
                    <button
                      onClick={exportFullAudit}
                      className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition flex items-center space-x-1.5 shadow-xs"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span>Full Audit Report</span>
                    </button>
                    <button
                      onClick={exportSuppressionList}
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-semibold text-xs rounded-lg transition flex items-center space-x-1.5 shadow-xs"
                    >
                      <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                      <span>ESP Suppression List</span>
                    </button>
                    {(tableFilter !== 'all' || drilldownSubStatus || searchQuery.trim()) && (
                      <button
                        onClick={exportFilteredResults}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg transition shadow-xs flex items-center space-x-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export Filtered ({filteredResults.length})</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Top 4 KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Mailable */}
                  <div
                    onClick={() => {
                      setTableFilter(tableFilter === 'mailable' && !drilldownSubStatus ? 'all' : 'mailable');
                      setDrilldownSubStatus(null);
                    }}
                    className={`bg-white border rounded-2xl p-5 space-y-3 relative overflow-hidden cursor-pointer transition hover:shadow-md ${
                      tableFilter === 'mailable' && !drilldownSubStatus
                        ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 flex items-center space-x-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Mailable (Valid)</span>
                      </span>
                      <span className="text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded">
                        {Math.round((reportData.mailable / reportData.total) * 100)}%
                      </span>
                    </div>
                    <div className="text-3xl font-extrabold text-slate-900 font-mono">{reportData.mailable}</div>
                    <p className="text-[11px] text-slate-500">100% safe to send. Verified mailbox with active MX.</p>
                  </div>

                  {/* Non-Mailable */}
                  <div
                    onClick={() => {
                      setTableFilter(tableFilter === 'non_mailable' && !drilldownSubStatus ? 'all' : 'non_mailable');
                      setDrilldownSubStatus(null);
                    }}
                    className={`bg-white border rounded-2xl p-5 space-y-3 relative overflow-hidden cursor-pointer transition hover:shadow-md ${
                      tableFilter === 'non_mailable' && !drilldownSubStatus
                        ? 'border-rose-500 ring-2 ring-rose-500/20'
                        : 'border-slate-200 hover:border-rose-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-rose-700 flex items-center space-x-1.5">
                        <XCircle className="w-4 h-4" />
                        <span>Non-Mailable</span>
                      </span>
                      <span className="text-xs font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded">
                        {Math.round((reportData.nonMailable / reportData.total) * 100)}%
                      </span>
                    </div>
                    <div className="text-3xl font-extrabold text-slate-900 font-mono">{reportData.nonMailable}</div>
                    <p className="text-[11px] text-slate-500">Hard bounces avoided. Invalid syntax or dead MX records.</p>
                  </div>

                  {/* Risky */}
                  <div
                    onClick={() => {
                      setTableFilter(tableFilter === 'risky' && !drilldownSubStatus ? 'all' : 'risky');
                      setDrilldownSubStatus(null);
                    }}
                    className={`bg-white border rounded-2xl p-5 space-y-3 relative overflow-hidden cursor-pointer transition hover:shadow-md ${
                      tableFilter === 'risky' && !drilldownSubStatus
                        ? 'border-amber-500 ring-2 ring-amber-500/20'
                        : 'border-slate-200 hover:border-amber-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-amber-800 flex items-center space-x-1.5">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Risky Emails</span>
                      </span>
                      <span className="text-xs font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded">
                        {Math.round((reportData.risky / reportData.total) * 100)}%
                      </span>
                    </div>
                    <div className="text-3xl font-extrabold text-slate-900 font-mono">{reportData.risky}</div>
                    <p className="text-[11px] text-slate-500">Catch-all, disposable, role accounts, or greymail.</p>
                  </div>

                  {/* Unknown */}
                  <div
                    onClick={() => {
                      setTableFilter(tableFilter === 'unknown' && !drilldownSubStatus ? 'all' : 'unknown');
                      setDrilldownSubStatus(null);
                    }}
                    className={`bg-white border rounded-2xl p-5 space-y-3 relative overflow-hidden cursor-pointer transition hover:shadow-md ${
                      tableFilter === 'unknown' && !drilldownSubStatus
                        ? 'border-slate-400 ring-2 ring-slate-400/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5">
                        <HelpCircle className="w-4 h-4" />
                        <span>Unknown</span>
                      </span>
                      <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded">
                        {Math.round((reportData.unknown / reportData.total) * 100)}%
                      </span>
                    </div>
                    <div className="text-3xl font-extrabold text-slate-900 font-mono">{reportData.unknown}</div>
                    <p className="text-[11px] text-slate-500">Server timeouts. Credits auto-refunded back to balance.</p>
                  </div>
                </div>

                {/* Middle Grid: Detailed Risk Breakdown & Provider Matrix */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Granular Risk Breakdown (8 Cols) */}
                  <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <span>Granular Risk Factors & Threats Detected</span>
                      </h3>
                      <span className="text-xs text-slate-500 font-medium">Protecting Domain Sender Score</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {/* Spam Traps */}
                      <div
                        onClick={() => {
                          setDrilldownSubStatus(drilldownSubStatus === 'spam_trap' ? null : 'spam_trap');
                          setTableFilter('all');
                        }}
                        className={`bg-slate-50 border rounded-xl p-3.5 space-y-1 cursor-pointer transition hover:bg-slate-100/80 ${
                          drilldownSubStatus === 'spam_trap'
                            ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50'
                            : 'border-slate-200 hover:border-rose-300'
                        }`}
                      >
                        <span className="text-[11px] font-semibold text-rose-700 flex items-center space-x-1">
                          <Flame className="w-3 h-3 text-rose-600" />
                          <span>Spam Traps</span>
                        </span>
                        <div className="text-2xl font-mono font-bold text-slate-900">{reportData.riskBreakdown.spamTraps}</div>
                        <p className="text-[10px] text-slate-500">Toxic blacklists avoided</p>
                      </div>

                      {/* Greymail */}
                      <div
                        onClick={() => {
                          setDrilldownSubStatus(drilldownSubStatus === 'greymail' ? null : 'greymail');
                          setTableFilter('all');
                        }}
                        className={`bg-slate-50 border rounded-xl p-3.5 space-y-1 cursor-pointer transition hover:bg-slate-100/80 ${
                          drilldownSubStatus === 'greymail'
                            ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50'
                            : 'border-slate-200 hover:border-amber-300'
                        }`}
                      >
                        <span className="text-[11px] font-semibold text-amber-800 flex items-center space-x-1">
                          <Info className="w-3 h-3 text-amber-600" />
                          <span>Greymail</span>
                        </span>
                        <div className="text-2xl font-mono font-bold text-slate-900">{reportData.riskBreakdown.greymail}</div>
                        <p className="text-[10px] text-slate-500">Low engagement lists</p>
                      </div>

                      {/* Disposable */}
                      <div
                        onClick={() => {
                          setDrilldownSubStatus(drilldownSubStatus === 'disposable' ? null : 'disposable');
                          setTableFilter('all');
                        }}
                        className={`bg-slate-50 border rounded-xl p-3.5 space-y-1 cursor-pointer transition hover:bg-slate-100/80 ${
                          drilldownSubStatus === 'disposable'
                            ? 'border-slate-500 ring-2 ring-slate-500/20 bg-slate-100'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <span className="text-[11px] font-semibold text-slate-700 flex items-center space-x-1">
                          <Trash2 className="w-3 h-3 text-slate-500" />
                          <span>Disposable</span>
                        </span>
                        <div className="text-2xl font-mono font-bold text-slate-900">{reportData.riskBreakdown.disposable}</div>
                        <p className="text-[10px] text-slate-500">Temporary burners</p>
                      </div>

                      {/* Catch-All */}
                      <div
                        onClick={() => {
                          setDrilldownSubStatus(drilldownSubStatus === 'catch_all' ? null : 'catch_all');
                          setTableFilter('all');
                        }}
                        className={`bg-slate-50 border rounded-xl p-3.5 space-y-1 cursor-pointer transition hover:bg-slate-100/80 ${
                          drilldownSubStatus === 'catch_all'
                            ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50'
                            : 'border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        <span className="text-[11px] font-semibold text-slate-700 flex items-center space-x-1">
                          <Layers className="w-3 h-3 text-blue-600" />
                          <span>Catch-All</span>
                        </span>
                        <div className="text-2xl font-mono font-bold text-slate-900">{reportData.riskBreakdown.catchAll}</div>
                        <p className="text-[10px] text-slate-500">Accept-all servers</p>
                      </div>

                      {/* Role Accounts */}
                      <div
                        onClick={() => {
                          setDrilldownSubStatus(drilldownSubStatus === 'role_based' ? null : 'role_based');
                          setTableFilter('all');
                        }}
                        className={`bg-slate-50 border rounded-xl p-3.5 space-y-1 cursor-pointer transition hover:bg-slate-100/80 ${
                          drilldownSubStatus === 'role_based'
                            ? 'border-purple-500 ring-2 ring-purple-500/20 bg-purple-50'
                            : 'border-slate-200 hover:border-purple-300'
                        }`}
                      >
                        <span className="text-[11px] font-semibold text-slate-700">Role-Based</span>
                        <div className="text-2xl font-mono font-bold text-slate-900">{reportData.riskBreakdown.roleBased}</div>
                        <p className="text-[10px] text-slate-500">admin@, support@, info@</p>
                      </div>

                      {/* Typo suggestions */}
                      <div
                        onClick={() => {
                          setDrilldownSubStatus(drilldownSubStatus === 'typo' ? null : 'typo');
                          setTableFilter('all');
                        }}
                        className={`bg-slate-50 border rounded-xl p-3.5 space-y-1 cursor-pointer transition hover:bg-slate-100/80 ${
                          drilldownSubStatus === 'typo'
                            ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50'
                            : 'border-slate-200 hover:border-emerald-300'
                        }`}
                      >
                        <span className="text-[11px] font-semibold text-emerald-700">Typos Fixed</span>
                        <div className="text-2xl font-mono font-bold text-slate-900">{reportData.riskBreakdown.typos}</div>
                        <p className="text-[10px] text-slate-500">e.g. gamil → gmail</p>
                      </div>

                      {/* Missing MX */}
                      <div
                        onClick={() => {
                          setDrilldownSubStatus(drilldownSubStatus === 'no_mx' ? null : 'no_mx');
                          setTableFilter('all');
                        }}
                        className={`bg-slate-50 border rounded-xl p-3.5 space-y-1 cursor-pointer transition hover:bg-slate-100/80 ${
                          drilldownSubStatus === 'no_mx'
                            ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50'
                            : 'border-slate-200 hover:border-rose-300'
                        }`}
                      >
                        <span className="text-[11px] font-semibold text-slate-700">Missing MX</span>
                        <div className="text-2xl font-mono font-bold text-slate-900">{reportData.riskBreakdown.missingMx}</div>
                        <p className="text-[10px] text-slate-500">No mail exchanger</p>
                      </div>

                      {/* Syntax errors */}
                      <div
                        onClick={() => {
                          setDrilldownSubStatus(drilldownSubStatus === 'invalid_syntax' ? null : 'invalid_syntax');
                          setTableFilter('all');
                        }}
                        className={`bg-slate-50 border rounded-xl p-3.5 space-y-1 cursor-pointer transition hover:bg-slate-100/80 ${
                          drilldownSubStatus === 'invalid_syntax'
                            ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50'
                            : 'border-slate-200 hover:border-rose-300'
                        }`}
                      >
                        <span className="text-[11px] font-semibold text-slate-700">Syntax Errors</span>
                        <div className="text-2xl font-mono font-bold text-slate-900">{reportData.riskBreakdown.syntaxErrors}</div>
                        <p className="text-[10px] text-slate-500">RFC 5322 noncompliant</p>
                      </div>
                    </div>
                  </div>

                  {/* Mailbox Provider Composition (4 Cols) */}
                  <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-xs">
                    <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                      <Server className="w-4 h-4 text-emerald-600" />
                      <span>Provider Distribution</span>
                    </h3>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-700 font-medium">Google Workspace / Gmail</span>
                          <span className="font-mono text-emerald-700 font-bold">{reportData.providerBreakdown.google}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${(reportData.providerBreakdown.google / reportData.total) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-700 font-medium">Microsoft 365 / Outlook</span>
                          <span className="font-mono text-blue-700 font-bold">{reportData.providerBreakdown.microsoft}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                          <div
                            className="bg-blue-500 h-full rounded-full"
                            style={{ width: `${(reportData.providerBreakdown.microsoft / reportData.total) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-700 font-medium">Corporate Custom B2B</span>
                          <span className="font-mono text-purple-700 font-bold">{reportData.providerBreakdown.corporateB2B}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                          <div
                            className="bg-purple-500 h-full rounded-full"
                            style={{ width: `${(reportData.providerBreakdown.corporateB2B / reportData.total) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-700 font-medium">Yahoo & Other Free</span>
                          <span className="font-mono text-amber-700 font-bold">
                            {reportData.providerBreakdown.yahoo + reportData.providerBreakdown.otherFree}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                          <div
                            className="bg-amber-500 h-full rounded-full"
                            style={{
                              width: `${((reportData.providerBreakdown.yahoo + reportData.providerBreakdown.otherFree) / reportData.total) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600">
                      💡 <strong>ESP Deliverability Tip:</strong> Maintain a 0.3% maximum bounce rate to adhere to Google & Yahoo's 2024+ sender authentication policies.
                    </div>
                  </div>
                </div>

                {/* Filterable Data Table */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden space-y-4 p-5 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Filter buttons */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        onClick={() => {
                          setTableFilter('all');
                          setDrilldownSubStatus(null);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          tableFilter === 'all' && !drilldownSubStatus
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
                        }`}
                      >
                        All ({reportData.total})
                      </button>
                      <button
                        onClick={() => {
                          setTableFilter('mailable');
                          setDrilldownSubStatus(null);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          tableFilter === 'mailable' && !drilldownSubStatus
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-emerald-700 hover:bg-emerald-50 bg-emerald-50/50 border border-emerald-200/60'
                        }`}
                      >
                        Mailable ({reportData.mailable})
                      </button>
                      <button
                        onClick={() => {
                          setTableFilter('non_mailable');
                          setDrilldownSubStatus(null);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          tableFilter === 'non_mailable' && !drilldownSubStatus
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'text-rose-700 hover:bg-rose-50 bg-rose-50/50 border border-rose-200/60'
                        }`}
                      >
                        Non-Mailable ({reportData.nonMailable})
                      </button>
                      <button
                        onClick={() => {
                          setTableFilter('risky');
                          setDrilldownSubStatus(null);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          tableFilter === 'risky' && !drilldownSubStatus
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-amber-800 hover:bg-amber-50 bg-amber-50/50 border border-amber-200/60'
                        }`}
                      >
                        Risky ({reportData.risky})
                      </button>
                      <button
                        onClick={() => {
                          setTableFilter('unknown');
                          setDrilldownSubStatus(null);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          tableFilter === 'unknown' && !drilldownSubStatus
                            ? 'bg-slate-600 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-100 bg-slate-100'
                        }`}
                      >
                        Unknown ({reportData.unknown})
                      </button>

                      {drilldownSubStatus && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <span>Risk Filter: <strong>{drilldownSubStatus.replace(/_/g, ' ')}</strong></span>
                          <button
                            onClick={() => setDrilldownSubStatus(null)}
                            className="text-emerald-700 hover:text-emerald-950 ml-1 font-bold"
                          >
                            ✕
                          </button>
                        </span>
                      )}

                      {(tableFilter !== 'all' || drilldownSubStatus || searchQuery.trim()) && (
                        <button
                          onClick={() => {
                            setTableFilter('all');
                            setDrilldownSubStatus(null);
                            setSearchQuery('');
                          }}
                          className="px-2.5 py-1 text-xs text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-lg transition bg-white"
                        >
                          Clear All Filters
                        </button>
                      )}
                    </div>

                    {/* Search box */}
                    <div className="relative min-w-[240px]">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search email or domain..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                      />
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider text-[10px]">
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
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                        {filteredResults.map((item, idx) => (
                          <tr
                            key={idx}
                            onClick={() => setSelectedEmailDetail(item)}
                            className="hover:bg-slate-50/80 transition cursor-pointer group"
                          >
                            <td className="py-3 px-4 font-semibold text-slate-900 group-hover:text-emerald-700">
                              {item.email}
                              {item.details.didYouMean && (
                                <span className="block text-[10px] text-emerald-700 font-sans mt-0.5">
                                  💡 Did you mean: <strong>{item.details.didYouMean}</strong>?
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  item.status === 'mailable'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : item.status === 'non_mailable'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : item.status === 'risky'
                                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}
                              >
                                {item.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-600 font-sans">
                              {item.subStatus.replace(/_/g, ' ')}
                            </td>
                            <td className="py-3 px-4 font-bold">
                              <span
                                className={
                                  item.qualityScore >= 80
                                    ? 'text-emerald-700'
                                    : item.qualityScore >= 50
                                    ? 'text-amber-700'
                                    : 'text-rose-700'
                                }
                              >
                                {item.qualityScore}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-500 truncate max-w-[160px]">
                              {item.details.mxRecords[0] || 'None'}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap gap-1 font-sans">
                                {item.details.isSpamTrap && (
                                  <span className="bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.2 rounded text-[9px] font-medium">
                                    Spam Trap
                                  </span>
                                )}
                                {item.details.isGreymail && (
                                  <span className="bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded text-[9px] font-medium">
                                    Greymail
                                  </span>
                                )}
                                {item.details.isDisposable && (
                                  <span className="bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.2 rounded text-[9px] font-medium">
                                    Disposable
                                  </span>
                                )}
                                {item.details.isRoleBased && (
                                  <span className="bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.2 rounded text-[9px] font-medium">
                                    Role
                                  </span>
                                )}
                                {item.details.isCatchAll && (
                                  <span className="bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded text-[9px] font-medium">
                                    Catch-All
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEmailDetail(item);
                                }}
                                className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 rounded font-sans transition border border-slate-200 shadow-xs"
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

        {/* 3. DELIVERABILITY INTELLIGENCE & KNOWLEDGE BASE */}
        {activeTab === 'deliverability' && (
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Sub-Switch Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Email Deliverability & Reputation Center
                </h1>
                <p className="text-slate-500 text-xs sm:text-sm mt-1">
                  Master modern ISP inbox algorithms, avoid Google/Yahoo 0.3% penalty traps, and explore technical guides.
                </p>
              </div>

              <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
                <button
                  onClick={() => setDeliverabilitySubTab('intelligence')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                    deliverabilitySubTab === 'intelligence'
                      ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Deliverability Intelligence</span>
                </button>
                <button
                  onClick={() => setDeliverabilitySubTab('knowledge_base')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                    deliverabilitySubTab === 'knowledge_base'
                      ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <BookOpen className="w-4 h-4 text-amber-600" />
                  <span>Knowledge Base & Guides</span>
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                    {DELIVERABILITY_ARTICLES.length}
                  </span>
                </button>
              </div>
            </div>

            {/* SUB-VIEW 1: DELIVERABILITY INTELLIGENCE */}
            {deliverabilitySubTab === 'intelligence' && (
              <div className="space-y-8">
                <div className="bg-gradient-to-r from-amber-50/80 via-white to-emerald-50/50 border border-amber-200/80 rounded-2xl p-6 sm:p-8 space-y-3">
                  <div className="flex items-center space-x-2 text-amber-800 font-bold text-xs uppercase tracking-wider">
                    <AlertOctagon className="w-4 h-4 text-amber-600" />
                    <span>2024 Google & Yahoo Bulk Sender Enforcement</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                    The 0.3% Spam Complaint Threshold Is Now A Hard Ceiling
                  </h2>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed max-w-3xl">
                    High-volume senders dispatching over 5,000 emails daily must keep complaints below <strong>0.1%</strong> (never exceeding 0.3%). Sending to stale lists, greymails, or unverified scrapings triggers automated domain throttling, routing all subsequent marketing and transactional emails directly to the junk folder.
                  </p>
                </div>

                {/* 3 Pillars Comparison Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white border border-emerald-200 rounded-2xl p-6 space-y-4 shadow-xs">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">Pristine Valid Mailbox</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Active, primary personal or business mailboxes that open messages, click links, and reply. High engagement signals to Google and Microsoft that your domain is trusted and deserves primary inbox placement.
                    </p>
                  </div>

                  <div className="bg-white border border-amber-200 rounded-2xl p-6 space-y-4 shadow-xs">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">Greymail (The Silent Killer)</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Mailboxes subscribed in the past but never opened anymore, secondary junk folders, unmonitored updates aliases, or recipients who report emails as spam instead of searching for an unsubscribe link.
                    </p>
                  </div>

                  <div className="bg-white border border-rose-200 rounded-2xl p-6 space-y-4 shadow-xs">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                      <XCircle className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">Spam Traps & Hard Bounces</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Non-existent mailboxes, dead domains, or recycled trap addresses operated specifically by blocklists (Spamhaus, Barracuda) to catch web scrapers and purchased lists.
                    </p>
                  </div>
                </div>

                {/* How TruthMail solves it */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-5 shadow-xs">
                  <h3 className="text-lg font-bold text-slate-900">How TruthMail Protects Your Sender Reputation</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="space-y-2 border-l-2 border-emerald-500 pl-4">
                      <h4 className="text-xs font-bold text-slate-900">1. Broadcast Keyword Heuristics</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Flags unmonitored aliases like <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono text-[11px]">newsletter@</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono text-[11px]">promo@</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono text-[11px]">deals@</code>, preventing wasted outbound credits.
                      </p>
                    </div>
                    <div className="space-y-2 border-l-2 border-emerald-500 pl-4">
                      <h4 className="text-xs font-bold text-slate-900">2. Real-Time MX Handshake Simulation</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Direct socket ping without actually dispatching a message, confirming mailbox existence without leaving footprints.
                      </p>
                    </div>
                    <div className="space-y-2 border-l-2 border-emerald-500 pl-4">
                      <h4 className="text-xs font-bold text-slate-900">3. 1-Click ESP Suppression List</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Instantly exports suppression files pre-formatted for HubSpot, Klaviyo, SendGrid, and Mailchimp.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-VIEW 2: KNOWLEDGE BASE & GUIDES (Deliverability Blog) */}
            {deliverabilitySubTab === 'knowledge_base' && (
              <div className="space-y-6">
                {/* Search & Category Filter Toolbar */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
                  <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                    <div className="relative w-full sm:w-96">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search guides (e.g., Google, DMARC, Warmup, Greymail)..."
                        value={articleSearchQuery}
                        onChange={(e) => setArticleSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                      />
                    </div>

                    <span className="text-xs text-slate-500 font-medium self-end sm:self-auto">
                      Showing{' '}
                      <strong className="text-slate-800">
                        {
                          DELIVERABILITY_ARTICLES.filter((a) => {
                            const matchCategory = articleCategoryFilter === 'All' || a.category === articleCategoryFilter;
                            const matchQuery =
                              !articleSearchQuery.trim() ||
                              a.title.toLowerCase().includes(articleSearchQuery.toLowerCase()) ||
                              a.summary.toLowerCase().includes(articleSearchQuery.toLowerCase()) ||
                              a.tags.some((t) => t.toLowerCase().includes(articleSearchQuery.toLowerCase()));
                            return matchCategory && matchQuery;
                          }).length
                        }
                      </strong>{' '}
                      of {DELIVERABILITY_ARTICLES.length} Guides
                    </span>
                  </div>

                  {/* Category Pills */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {['All', 'Compliance & Rules', 'Sender Reputation', 'Spam Protection', 'Deliverability Intelligence', 'Authentication', 'Cold Outreach'].map(
                      (cat) => (
                        <button
                          key={cat}
                          onClick={() => setArticleCategoryFilter(cat)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            articleCategoryFilter === cat
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {cat}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Articles Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {DELIVERABILITY_ARTICLES.filter((a) => {
                    const matchCategory = articleCategoryFilter === 'All' || a.category === articleCategoryFilter;
                    const matchQuery =
                      !articleSearchQuery.trim() ||
                      a.title.toLowerCase().includes(articleSearchQuery.toLowerCase()) ||
                      a.summary.toLowerCase().includes(articleSearchQuery.toLowerCase()) ||
                      a.tags.some((t) => t.toLowerCase().includes(articleSearchQuery.toLowerCase()));
                    return matchCategory && matchQuery;
                  }).map((article) => (
                    <div
                      key={article.id}
                      onClick={() => setSelectedArticle(article)}
                      className="bg-white border border-slate-200 hover:border-emerald-300 rounded-2xl p-6 space-y-4 flex flex-col justify-between shadow-xs hover:shadow-md transition cursor-pointer group"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold px-2.5 py-0.5 rounded-full text-[11px]">
                            {article.category}
                          </span>
                          <span className="text-slate-400 flex items-center space-x-1 text-[11px]">
                            <Clock className="w-3 h-3" />
                            <span>{article.readTime}</span>
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition leading-snug">
                          {article.title}
                        </h3>

                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                          {article.summary}
                        </p>

                        <div className="flex flex-wrap gap-1 pt-1">
                          {article.tags.map((t, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-slate-800 block text-[11px]">{article.author.name}</span>
                          <span className="text-[10px] text-slate-400">{article.date}</span>
                        </div>

                        <span className="text-emerald-600 font-bold flex items-center space-x-1 group-hover:translate-x-1 transition text-xs">
                          <span>Read Guide</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. CONTACT & ENTERPRISE CONSULTATION WORKSPACE */}
        {activeTab === 'contact' && (
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full shadow-xs">
                Direct Enterprise Support & Sales
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-1">
                Let's Talk Deliverability & Scale
              </h1>
              <p className="text-slate-500 text-sm max-w-2xl mx-auto">
                Need high-volume enterprise verification, custom API SLAs, or deliverability consulting? Speak directly with our engineering team.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Form */}
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
                {contactSubmitted ? (
                  <div className="py-12 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto">
                      <Check className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Inquiry Received!</h3>
                    <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto">
                      Thank you for contacting TruthMail. A Senior Deliverability Architect will respond to <strong>{contactForm.email || 'your email'}</strong> within 2 business hours.
                    </p>
                    <button
                      onClick={() => {
                        setContactSubmitted(false);
                        setContactForm({
                          name: '',
                          email: '',
                          company: '',
                          category: 'Enterprise Volume (500k+ emails)',
                          message: '',
                        });
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                    >
                      Send Another Inquiry
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setContactSubmitted(true);
                    }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Full Name *</label>
                        <input
                          type="text"
                          required
                          value={contactForm.name}
                          onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                          placeholder="Alex Mercer"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Work Email *</label>
                        <input
                          type="email"
                          required
                          value={contactForm.email}
                          onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                          placeholder="alex@company.com"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Company Name</label>
                        <input
                          type="text"
                          value={contactForm.company}
                          onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                          placeholder="Acme Growth Inc."
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Inquiry Topic</label>
                        <select
                          value={contactForm.category}
                          onChange={(e) => setContactForm({ ...contactForm, category: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                        >
                          <option>Enterprise Volume (500k+ emails)</option>
                          <option>High-Speed API Integration & Webhooks</option>
                          <option>Custom SLA & Dedicated IP Pool</option>
                          <option>Security & Compliance Audit (GDPR/SOC2)</option>
                          <option>General Support or Billing Help</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Message / Requirements *</label>
                      <textarea
                        required
                        rows={4}
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        placeholder="Tell us about your monthly sending volume, list cleaning needs, or custom integration requirements..."
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 transition resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>Submit Enterprise Consultation Request</span>
                    </button>
                  </form>
                )}
              </div>

              {/* Right Column: Highlights & Direct Channels */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
                  <h3 className="text-base font-bold text-slate-900">Enterprise SLA & Guarantees</h3>
                  <ul className="space-y-3 text-xs text-slate-600">
                    <li className="flex items-start space-x-2.5">
                      <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span><strong>99.9% Uptime Guarantee:</strong> Redundant multi-region validator workers with instant failover.</span>
                    </li>
                    <li className="flex items-start space-x-2.5">
                      <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span><strong>Zero-Data Retention Mode:</strong> Fully compliant with GDPR Article 28 and HIPAA compliance guidelines.</span>
                    </li>
                    <li className="flex items-start space-x-2.5">
                      <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span><strong>Sub-150ms Real-Time API:</strong> Millisecond latency designed for real-time signup forms and CRM webhooks.</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
                  <h3 className="text-sm font-bold text-slate-900">Direct Contact Channels</h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-emerald-600 flex-shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Enterprise Sales</span>
                        <a href="mailto:enterprise@truthmail.io" className="text-slate-800 font-semibold hover:text-emerald-700">
                          enterprise@truthmail.io
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-emerald-600 flex-shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Security & Compliance</span>
                        <a href="mailto:security@truthmail.io" className="text-slate-800 font-semibold hover:text-emerald-700">
                          security@truthmail.io
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. SETTINGS & BILLING WORKSPACE */}
        {activeTab === 'billing' && (
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center space-y-3">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full shadow-xs">
                Predictable Subscription Tiers
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Simple, Transparent Plans for Every Team
              </h1>
              <p className="text-slate-500 text-sm max-w-xl mx-auto">
                Clean your lists with high-speed parallel workers. Switch between recurring subscription plans or buy non-expiring credit packs.
              </p>

              {/* Billing Toggle */}
              <div className="inline-flex items-center bg-slate-100 border border-slate-200 p-1 rounded-xl text-xs font-semibold mt-4">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-4 py-2 rounded-lg transition ${
                    billingCycle === 'monthly' ? 'bg-white text-emerald-700 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Monthly Billed
                </button>
                <button
                  onClick={() => setBillingCycle('annual')}
                  className={`px-4 py-2 rounded-lg transition flex items-center space-x-1.5 ${
                    billingCycle === 'annual' ? 'bg-white text-emerald-700 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Annual Billed</span>
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] px-1.5 py-0.5 rounded border border-emerald-200 font-bold">
                    Save 20%
                  </span>
                </button>
              </div>
            </div>

            {/* 4 Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Starter */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 flex flex-col justify-between shadow-xs hover:shadow-sm transition">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Starter</h3>
                    <p className="text-xs text-slate-500">For solopreneurs and small lists</p>
                  </div>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-3xl font-extrabold text-slate-900 font-mono">
                      ${billingCycle === 'monthly' ? '29' : '24'}
                    </span>
                    <span className="text-xs text-slate-500">/ month</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-center">
                    <span className="text-xs font-bold text-emerald-700 font-mono">5,000 Credits / mo</span>
                  </div>
                  <ul className="space-y-2.5 text-xs text-slate-600">
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Full 12-step verification</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Spam trap & honeypot filter</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Typo & domain suggester</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Standard CSV export</span>
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => { setCredits((c) => c + 5000); alert('Subscribed to Starter Plan! 5,000 credits added.'); }}
                  className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-bold transition border border-slate-200 shadow-xs"
                >
                  Choose Starter
                </button>
              </div>

              {/* Growth - Popular */}
              <div className="bg-white border-2 border-emerald-500 rounded-2xl p-6 space-y-5 flex flex-col justify-between relative shadow-md">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-xs">
                  Most Popular
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Growth</h3>
                    <p className="text-xs text-slate-500">For fast-growing sales & outreach teams</p>
                  </div>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-3xl font-extrabold text-slate-900 font-mono">
                      ${billingCycle === 'monthly' ? '79' : '65'}
                    </span>
                    <span className="text-xs text-slate-500">/ month</span>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl text-center">
                    <span className="text-xs font-bold text-emerald-700 font-mono">25,000 Credits / mo</span>
                  </div>
                  <ul className="space-y-2.5 text-xs text-slate-600">
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Everything in Starter</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Greymail risk intelligence</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Real-time API (30 req/sec)</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>3 Team member seats</span>
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => { setCredits((c) => c + 25000); alert('Subscribed to Growth Plan! 25,000 credits added.'); }}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  Choose Growth
                </button>
              </div>

              {/* Professional */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 flex flex-col justify-between shadow-xs hover:shadow-sm transition">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Professional</h3>
                    <p className="text-xs text-slate-500">For marketing agencies & lead gen</p>
                  </div>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-3xl font-extrabold text-slate-900 font-mono">
                      ${billingCycle === 'monthly' ? '199' : '165'}
                    </span>
                    <span className="text-xs text-slate-500">/ month</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-center">
                    <span className="text-xs font-bold text-emerald-700 font-mono">100,000 Credits / mo</span>
                  </div>
                  <ul className="space-y-2.5 text-xs text-slate-600">
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Everything in Growth</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Catch-all deep scoring</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Unlimited team seats</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Webhook integration</span>
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => { setCredits((c) => c + 100000); alert('Subscribed to Professional Plan! 100,000 credits added.'); }}
                  className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-bold transition border border-slate-200 shadow-xs"
                >
                  Choose Professional
                </button>
              </div>

              {/* Enterprise */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 flex flex-col justify-between shadow-xs hover:shadow-sm transition">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Enterprise</h3>
                    <p className="text-xs text-slate-500">High volume & custom SLAs</p>
                  </div>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-3xl font-extrabold text-slate-900 font-mono">$599+</span>
                    <span className="text-xs text-slate-500">/ month</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-center">
                    <span className="text-xs font-bold text-emerald-700 font-mono">500,000+ Credits / mo</span>
                  </div>
                  <ul className="space-y-2.5 text-xs text-slate-600">
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Dedicated worker IP pool</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Zero-data retention (GDPR mode)</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>99.9% Uptime SLA</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Dedicated technical manager</span>
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => alert('Enterprise sales consultation simulated.')}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition border border-slate-900 shadow-xs"
                >
                  Contact Sales
                </button>
              </div>
            </div>

            {/* Pay As You Go Calculator */}
            <div className="bg-white border border-slate-200 rounded-2xl p-8 space-y-6 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Pay-As-You-Go Credit Packs</h3>
                  <p className="text-slate-500 text-xs mt-1">Non-expiring credits with automatic rollover. Pay only for what you scrub.</p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-xs text-slate-500">Fair Billing Policy:</span>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
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
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center space-y-2 hover:bg-white hover:shadow-xs transition">
                    <span className="text-base font-extrabold text-slate-900 font-mono block">
                      {pack.credits.toLocaleString()} Credits
                    </span>
                    <span className="text-2xl font-bold text-emerald-700 font-mono block">${pack.price}</span>
                    <span className="text-[10px] text-slate-500 block">{pack.perCredit} per check</span>
                    <button
                      onClick={() => {
                        setCredits((c) => c + pack.credits);
                        alert(`Successfully purchased ${pack.credits.toLocaleString()} credits for $${pack.price}!`);
                      }}
                      className="w-full mt-2 py-1.5 bg-white hover:bg-emerald-600 text-slate-700 hover:text-white rounded-lg text-xs font-semibold transition border border-slate-200 shadow-xs"
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
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Developer API & Webhooks
              </h1>
              <p className="text-slate-500 text-sm">
                Integrate real-time email verification directly into your registration forms, CRM triggers, or webhooks.
              </p>
            </div>

            {/* API Key Box */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">Live Secret API Key</span>
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  readOnly
                  value="sec_live_948f93a0d18e24c57712ba63f01b"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-mono select-all focus:bg-white focus:outline-none"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('sec_live_948f93a0d18e24c57712ba63f01b');
                    setCopiedKey(true);
                    setTimeout(() => setCopiedKey(false), 2000);
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 shadow-xs"
                >
                  {copiedKey ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
                  <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500">Keep your secret key safe. Never expose it in client-side browser bundles.</p>
            </div>

            {/* Code Examples */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Example cURL Request</span>
                <span className="text-[11px] text-emerald-700 font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">POST /api/validate/single</span>
              </div>
              <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-emerald-400 overflow-x-auto border border-slate-800 shadow-inner">
{`curl -X POST https://api.truthmail.io/v1/validate/single \\
  -H "Authorization: Bearer sec_live_948f93a0d18e24c57712ba63f01b" \\
  -H "Content-Type: application/json" \\
  -d '{"email": "elon.musk@x.com"}'`}
              </pre>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Response JSON (200 OK)</span>
                <span className="text-[11px] text-slate-500 font-mono">Latency ~142ms</span>
              </div>
              <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-slate-300 overflow-x-auto border border-slate-800 shadow-inner">
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

      {/* RICH TECHNICAL EVIDENCE SLIDE-OVER DRAWER */}
      <EvidenceDrawer
        lead={selectedEmailDetail}
        onClose={() => setSelectedEmailDetail(null)}
      />

      {/* DELIVERABILITY ARTICLE READER MODAL */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 flex items-start justify-between bg-slate-50/50">
              <div className="space-y-2 pr-6">
                <div className="flex items-center space-x-2">
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                    {selectedArticle.category}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{selectedArticle.readTime}</span>
                  </span>
                  <span className="text-xs text-slate-400">• {selectedArticle.date}</span>
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
                  {selectedArticle.title}
                </h2>
                <div className="text-xs text-slate-500">
                  By <strong className="text-slate-700">{selectedArticle.author.name}</strong> ({selectedArticle.author.role})
                </div>
              </div>
              <button
                onClick={() => setSelectedArticle(null)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-700 text-xs sm:text-sm leading-relaxed">
              {/* Introduction */}
              <div className="p-4 bg-emerald-50/50 border border-emerald-200/80 rounded-xl text-slate-800 font-medium">
                {selectedArticle.content.introduction}
              </div>

              {/* Sections */}
              {selectedArticle.content.sections.map((sec, idx) => (
                <div key={idx} className="space-y-2 pt-2">
                  <h3 className="text-base font-bold text-slate-900">{sec.heading}</h3>
                  <p className="text-slate-600 leading-relaxed">{sec.body}</p>
                  {sec.tip && (
                    <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start space-x-2">
                      <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong>Pro Tip:</strong> {sec.tip}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Checklist */}
              {selectedArticle.content.checklist && selectedArticle.content.checklist.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-1.5">
                    <CheckCheck className="w-4 h-4 text-emerald-600" />
                    <span>Actionable Implementation Checklist</span>
                  </h4>
                  <ul className="space-y-2 text-xs">
                    {selectedArticle.content.checklist.map((item, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Conclusion */}
              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-500 italic">
                  <strong>Key Takeaway:</strong> {selectedArticle.content.conclusion}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => setSelectedArticle(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                Close Guide
              </button>
              <button
                onClick={() => {
                  setSelectedArticle(null);
                  setActiveTab('verify');
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition shadow-xs flex items-center space-x-1.5"
              >
                <span>Verify Your List Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP UP CREDITS MODAL */}
      {topUpModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl relative text-slate-900">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Add Verification Credits</h3>
                <p className="text-xs text-slate-500 mt-0.5">Select a credit pack to top up your account</p>
              </div>
              <button onClick={() => setTopUpModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition">
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
                      ? 'bg-emerald-50 border-emerald-500 text-slate-900 ring-1 ring-emerald-500 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-slate-900">{pack.amount.toLocaleString()} Credits</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-700">${pack.price}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setCredits((prev) => prev + topUpCredits);
                setTopUpModalOpen(false);
                alert(`Added ${topUpCredits.toLocaleString()} credits to your account!`);
              }}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-xs"
            >
              Confirm Purchase & Add {topUpCredits.toLocaleString()} Credits
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-slate-700">TruthMail SaaS Engine</span>
            <span>•</span>
            <span>Enterprise Deliverability Platform</span>
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
