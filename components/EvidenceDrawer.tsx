'use client';

import React from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Server,
  Mail,
  Lock,
  ArrowRight,
  Flame,
  AlertOctagon,
  Copy,
  Check
} from 'lucide-react';
import { EmailValidationResult } from '@/lib/email-engine';

interface EvidenceDrawerProps {
  lead: EmailValidationResult | null;
  onClose: () => void;
}

export default function EvidenceDrawer({ lead, onClose }: EvidenceDrawerProps) {
  const [copied, setCopied] = React.useState(false);

  if (!lead) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(lead.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusConfig = {
    mailable: {
      label: 'Mailable (Valid)',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      textColor: 'text-emerald-700',
      badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      icon: CheckCircle2,
      desc: 'Safe to send. Active mail server and validated mailbox.',
    },
    non_mailable: {
      label: 'Non-Mailable (Invalid)',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200',
      textColor: 'text-rose-700',
      badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
      icon: XCircle,
      desc: 'Do not send. Hard bounce risk, dead domain, or mailbox does not exist.',
    },
    risky: {
      label: 'Risky / Low Engagement',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      textColor: 'text-amber-800',
      badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
      icon: AlertTriangle,
      desc: 'Caution recommended. Catch-all, disposable burner, or shared role mailbox.',
    },
    unknown: {
      label: 'Unknown / Timeout',
      bgColor: 'bg-slate-50',
      borderColor: 'border-slate-200',
      textColor: 'text-slate-700',
      badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: HelpCircle,
      desc: 'Connection timeout or mail server temporarily unreachable (credits refunded).',
    },
  }[lead.status] || {
    label: lead.status,
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    textColor: 'text-slate-700',
    badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: HelpCircle,
    desc: '',
  };

  const StatusIcon = statusConfig.icon;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-white border-l border-slate-200 h-full overflow-y-auto shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-start justify-between bg-white sticky top-0 z-10 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Technical Audit Evidence</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono font-medium border border-slate-200">
                12-Step Check
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-slate-900 font-mono break-all">{lead.email}</h2>
              <button
                onClick={handleCopy}
                className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded transition"
                title="Copy email"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1 text-sm bg-white">
          {/* Primary Status Banner */}
          <div className={`p-4 rounded-xl border ${statusConfig.bgColor} ${statusConfig.borderColor} space-y-2`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <StatusIcon className={`w-5 h-5 ${statusConfig.textColor}`} />
                <span className={`font-bold text-sm tracking-wide ${statusConfig.textColor}`}>
                  {statusConfig.label}
                </span>
              </div>
              <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-md border ${statusConfig.badgeBg}`}>
                Sub-Status: {lead.subStatus.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-600">{statusConfig.desc}</p>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Quality Score</span>
              <div className={`text-xl font-extrabold font-mono ${lead.qualityScore >= 80 ? 'text-emerald-600' : lead.qualityScore >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                {lead.qualityScore}/100
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">SMTP Code</span>
              <div className={`text-xl font-extrabold font-mono ${lead.details.smtpCode === '250' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {lead.details.smtpCode}
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Mailbox Exists</span>
              <div className={`text-xl font-extrabold font-mono ${lead.details.smtpDeliverable ? 'text-emerald-600' : 'text-slate-900'}`}>
                {lead.details.smtpDeliverable ? 'YES' : 'NO'}
              </div>
            </div>
          </div>

          {/* Typo Suggestion Box (If detected) */}
          {lead.details.didYouMean && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-2">
              <div className="flex items-center space-x-2 text-amber-800 font-semibold text-xs">
                <AlertOctagon className="w-4 h-4 text-amber-600" />
                <span>Typo Correction Suggested</span>
              </div>
              <div className="flex items-center space-x-2 font-mono text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-amber-200">
                <span className="text-rose-600 line-through">{lead.email}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-emerald-600 font-bold">{lead.details.didYouMean}</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Note: Suggested spelling correction does not invalidate active custom domains.
              </p>
            </div>
          )}

          {/* 1. DNS & Mail Routing Evidence */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center space-x-2 text-slate-900 font-semibold text-xs">
                <Server className="w-4 h-4 text-emerald-600" />
                <span>DNS & MX Routing Diagnostics</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${lead.details.hasMx ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-rose-100 text-rose-800 border-rose-200'}`}>
                {lead.details.hasMx ? 'MX Active' : 'No MX Record'}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-start justify-between">
                <span className="text-slate-500">Domain:</span>
                <span className="font-mono text-slate-900 font-semibold">{lead.details.domain}</span>
              </div>

              <div className="flex items-start justify-between">
                <span className="text-slate-500">Primary MX Host:</span>
                <span className="font-mono text-slate-800 text-right max-w-[260px] break-all">
                  {lead.details.mxRecords[0] || (lead.details.dnsReason ? `[${lead.details.dnsReason}]` : 'None published')}
                </span>
              </div>

              {lead.details.mxRecords.length > 1 && (
                <div className="pt-1">
                  <span className="text-slate-500 block mb-1">Backup MX Hosts ({lead.details.mxRecords.length}):</span>
                  <div className="space-y-1 pl-2 border-l-2 border-slate-200 font-mono text-[11px] text-slate-600">
                    {lead.details.mxRecords.slice(1).map((mx, idx) => (
                      <div key={idx} className="truncate">• {mx}</div>
                    ))}
                  </div>
                </div>
              )}

              {lead.details.dnsReason && (
                <div className="p-2 bg-white rounded-lg text-[11px] font-mono text-slate-700 border border-slate-200">
                  <span className="text-slate-500">Resolver Note:</span> {lead.details.dnsReason}
                </div>
              )}
            </div>
          </div>

          {/* 2. SMTP Handshake Simulation Evidence */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center space-x-2 text-slate-900 font-semibold text-xs">
                <Mail className="w-4 h-4 text-emerald-600" />
                <span>SMTP Handshake Simulation</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono border ${lead.details.smtpCode === '250' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-rose-100 text-rose-800 border-rose-200'}`}>
                Code {lead.details.smtpCode}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-start justify-between">
                <span className="text-slate-500">Mailbox Status:</span>
                <span className="font-semibold text-slate-900">
                  {lead.details.smtpDeliverable ? 'Confirmed Active Mailbox' : 'Unreachable / Rejected'}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block mb-1">Server Response:</span>
                <p className="font-mono text-[11px] p-2.5 rounded-lg bg-white text-slate-800 border border-slate-200 break-words">
                  {lead.details.smtpMessage}
                </p>
              </div>
            </div>
          </div>

          {/* 3. Security & Deliverability Authentication */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center space-x-2 text-slate-900 font-semibold text-xs">
                <Lock className="w-4 h-4 text-emerald-600" />
                <span>Security Authentication (SPF & DMARC)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-500">SPF Record</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${lead.details.spfFound ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    {lead.details.spfFound ? '✓ Valid' : 'Missing'}
                  </span>
                </div>
                <p className="font-mono text-[10px] text-slate-700 truncate" title={lead.details.spfRecord || ''}>
                  {lead.details.spfRecord || 'No SPF record detected'}
                </p>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-500">DMARC Policy</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${lead.details.dmarcFound ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    {lead.details.dmarcFound ? '✓ Protected' : 'Missing'}
                  </span>
                </div>
                <p className="font-mono text-[10px] text-slate-700 truncate" title={lead.details.dmarcRecord || ''}>
                  {lead.details.dmarcRecord || 'No DMARC policy published'}
                </p>
              </div>
            </div>
          </div>

          {/* 4. Threat Factor Evaluation Checklist */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center space-x-2 text-slate-900 font-semibold text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Threat & Risk Indicators</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {lead.details.isFreeProvider ? 'Consumer Free Mailbox' : 'Corporate B2B Mailbox'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                <span className="text-slate-500">Disposable Burner:</span>
                <span className={`font-bold font-mono ${lead.details.isDisposable ? 'text-rose-600' : 'text-slate-700'}`}>
                  {lead.details.isDisposable ? 'YES (Burner)' : 'NO'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                <span className="text-slate-500">Spam Trap / Toxic:</span>
                <span className={`font-bold font-mono ${lead.details.isSpamTrap ? 'text-rose-600' : 'text-slate-700'}`}>
                  {lead.details.isSpamTrap ? 'YES (Hazard)' : 'NO'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                <span className="text-slate-500">Role-Based Account:</span>
                <span className={`font-bold font-mono ${lead.details.isRoleBased ? 'text-amber-600' : 'text-slate-700'}`}>
                  {lead.details.isRoleBased ? 'YES (Role)' : 'NO'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                <span className="text-slate-500">Greymail Risk:</span>
                <span className={`font-bold font-mono ${lead.details.isGreymail ? 'text-amber-600' : 'text-slate-700'}`}>
                  {lead.details.isGreymail ? 'YES (Promo)' : 'NO'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Validation Execution: {lead.executionTimeMs}ms</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium rounded-lg transition"
          >
            Close Drawer
          </button>
        </div>
      </div>
    </div>
  );
}
