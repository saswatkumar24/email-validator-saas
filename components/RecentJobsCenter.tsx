'use client';

import React from 'react';
import {
  FileSpreadsheet,
  Download,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Trash2,
  Sparkles
} from 'lucide-react';

export interface RecentJobItem {
  id: string;
  filename: string;
  totalEmails: number;
  mailable: number;
  nonMailable: number;
  risky: number;
  unknown: number;
  avgScore: number;
  timestamp: string;
}

interface RecentJobsCenterProps {
  jobs: RecentJobItem[];
  onSelectJob?: (job: RecentJobItem) => void;
  onClearJobs?: () => void;
  onDownloadJob?: (job: RecentJobItem, type: 'clean' | 'audit') => void;
  onQuickUpload?: () => void;
}

export default function RecentJobsCenter({
  jobs,
  onSelectJob,
  onClearJobs,
  onDownloadJob,
  onQuickUpload,
}: RecentJobsCenterProps) {
  if (jobs.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
          <Clock className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-900">No Recent Verification Jobs</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            You haven't run any bulk verification files in this session yet. Upload a CSV/XLSX or load the benchmark dataset to see recent history.
          </p>
        </div>
        {onQuickUpload && (
          <button
            onClick={onQuickUpload}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition shadow-sm inline-flex items-center space-x-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Upload First List</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center space-x-2.5">
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900">Recent Verification Jobs & History</h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            {jobs.length} Job{jobs.length > 1 ? 's' : ''}
          </span>
        </div>

        {onClearJobs && (
          <button
            onClick={onClearJobs}
            className="text-[11px] text-slate-400 hover:text-rose-600 transition flex items-center space-x-1"
            title="Clear history"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear History</span>
          </button>
        )}
      </div>

      {/* Jobs List */}
      <div className="divide-y divide-slate-100">
        {jobs.map((job) => {
          const mailablePct = job.totalEmails > 0 ? Math.round((job.mailable / job.totalEmails) * 100) : 0;
          return (
            <div
              key={job.id}
              className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition"
            >
              {/* Job Info */}
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-sm font-bold text-slate-900 truncate max-w-[280px] sm:max-w-[380px]">
                    {job.filename}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                    {job.totalEmails.toLocaleString()} leads
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-[11px] text-slate-500 flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{new Date(job.timestamp).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </span>

                  <span className="text-slate-300">•</span>

                  <span className="text-emerald-700 font-semibold flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>{job.mailable.toLocaleString()} Mailable ({mailablePct}%)</span>
                  </span>

                  {job.nonMailable > 0 && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="text-rose-700 font-semibold flex items-center space-x-1">
                        <XCircle className="w-3 h-3 text-rose-600" />
                        <span>{job.nonMailable.toLocaleString()} Invalid</span>
                      </span>
                    </>
                  )}

                  {job.risky > 0 && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="text-amber-700 font-semibold flex items-center space-x-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        <span>{job.risky.toLocaleString()} Risky</span>
                      </span>
                    </>
                  )}

                  {job.unknown > 0 && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-600 font-semibold flex items-center space-x-1">
                        <HelpCircle className="w-3 h-3 text-slate-400" />
                        <span>{job.unknown.toLocaleString()} Unknown</span>
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 self-start md:self-auto shrink-0">
                {onSelectJob && (
                  <button
                    onClick={() => onSelectJob(job)}
                    className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition flex items-center space-x-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Report</span>
                  </button>
                )}

                {onDownloadJob && (
                  <button
                    onClick={() => onDownloadJob(job, 'clean')}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition flex items-center space-x-1"
                    title="Download Clean CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Clean ({job.mailable})</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
