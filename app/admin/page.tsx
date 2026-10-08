'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Users,
  Database,
  AlertTriangle,
  ArrowLeft,
  Search,
  Plus,
  Trash2,
  Download,
  CreditCard,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'leads' | 'threats'>('users');

  // Stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalVerifiedLeads: 0,
    totalThreatDomains: 0,
    totalThreatEmails: 0,
    totalJobs: 0,
    totalCreditsSpent: 0,
  });

  // Users Tab
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [editingCreditUserId, setEditingCreditUserId] = useState<string | null>(null);
  const [creditAdjustment, setCreditAdjustment] = useState<number>(1000);

  // Leads Tab
  const [leads, setLeads] = useState<any[]>([]);
  const [leadSearch, setLeadSearch] = useState('');
  const [leadProvider, setLeadProvider] = useState('');

  // Threats Tab
  const [threatDomains, setThreatDomains] = useState<any[]>([]);
  const [newThreatDomain, setNewThreatDomain] = useState('');
  const [newThreatReason, setNewThreatReason] = useState('');

  // Check auth
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (!data.user || data.user.role !== 'admin') {
          // If not admin, prompt or show unauthorized
          setCurrentUser(data.user);
          setLoading(false);
        } else {
          setCurrentUser(data.user);
          loadAdminData();
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, leadsRes, threatsRes] = await Promise.all([
        fetch('/api/admin/stats').then((r) => r.json()),
        fetch('/api/admin/users').then((r) => r.json()),
        fetch('/api/admin/leads?limit=100').then((r) => r.json()),
        fetch('/api/admin/threats').then((r) => r.json()),
      ]);

      if (statsRes && !statsRes.error) setStats(statsRes);
      if (usersRes && usersRes.users) setUsers(usersRes.users);
      if (leadsRes && leadsRes.leads) setLeads(leadsRes.leads);
      if (threatsRes && threatsRes.threatDomains) setThreatDomains(threatsRes.threatDomains);
    } catch (e) {
      console.error('Error loading admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCredits = async (userId: string, currentBalance: number, amount: number) => {
    const newTotal = Math.max(0, currentBalance + amount);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, creditsBalance: newTotal }),
      });
      const data = await res.json();
      if (data.user) {
        setUsers(users.map((u) => (u.id === userId ? { ...u, credits_balance: newTotal } : u)));
        setEditingCreditUserId(null);
      }
    } catch (e) {
      alert('Failed to update credits');
    }
  };

  const handleAddThreatDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newThreatDomain.trim()) return;
    try {
      await fetch('/api/admin/threats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: newThreatDomain.trim(),
          classification: 'no_mx',
          reason: newThreatReason.trim() || 'Manually blacklisted by Admin',
        }),
      });
      setNewThreatDomain('');
      setNewThreatReason('');
      loadAdminData();
    } catch (e) {
      alert('Failed to add threat domain');
    }
  };

  const handleDeleteThreatDomain = async (domain: string) => {
    if (!confirm(`Remove ${domain} from threat list?`)) return;
    try {
      await fetch(`/api/admin/threats?domain=${encodeURIComponent(domain)}`, {
        method: 'DELETE',
      });
      setThreatDomains(threatDomains.filter((d) => d.domain !== domain));
    } catch (e) {
      alert('Failed to remove domain');
    }
  };

  const exportLeadsCsv = () => {
    if (leads.length === 0) return;
    const headers = ['Email', 'Domain', 'Provider', 'Quality Score', 'SPF', 'DMARC', 'Times Verified', 'Last Verified'];
    const rows = leads.map((l) => [
      l.raw_email,
      l.domain,
      l.provider_type,
      l.quality_score,
      l.has_spf ? 'Pass' : 'Fail',
      l.has_dmarc ? 'Pass' : 'Fail',
      l.times_seen,
      l.last_verified_at,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.map((c: any) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `truthmail_verified_leads_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md w-full text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
          <h1 className="text-xl font-bold">Admin Portal Restricted</h1>
          <p className="text-slate-400 text-sm">
            You must be logged in as an administrator to view this portal.
          </p>
          <div className="bg-slate-950 p-4 rounded-lg text-left text-xs font-mono space-y-1 text-slate-300">
            <div>Default Admin Login:</div>
            <div className="text-emerald-400">Email: admin@truthmail.com</div>
            <div className="text-emerald-400">Password: Admin@123456</div>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition"
          >
            <ArrowLeft className="w-4 h-4" /> Return to TruthMail App
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Admin Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <ShieldCheck className="w-5 h-5 text-slate-950 stroke-[2.5]" />
              </div>
              <div>
                <span className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                  TruthMail <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">ADMIN</span>
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={loadAdminData}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Data
            </button>
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg transition"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open App
            </Link>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 py-8 flex-1 w-full space-y-8">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>Total Users</span>
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-black text-white">{stats.totalUsers}</div>
            <div className="text-xs text-slate-500 mt-1">Active customer accounts</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>Verified Leads DB</span>
              <Database className="w-4 h-4 text-teal-400" />
            </div>
            <div className="text-3xl font-black text-emerald-400">{stats.totalVerifiedLeads.toLocaleString()}</div>
            <div className="text-xs text-slate-500 mt-1">100% deliverable unique contacts</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>Threat Domains</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-3xl font-black text-rose-400">{stats.totalThreatDomains}</div>
            <div className="text-xs text-slate-500 mt-1">Dead MX / honeypots cached</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>Total Jobs Processed</span>
              <CreditCard className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-3xl font-black text-blue-400">{stats.totalJobs}</div>
            <div className="text-xs text-slate-500 mt-1">{stats.totalCreditsSpent.toLocaleString()} credits spent</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition ${
              activeTab === 'users'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Users className="w-4 h-4" /> User & Token Manager ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('leads')}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition ${
              activeTab === 'leads'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Database className="w-4 h-4" /> Global Verified Leads ({stats.totalVerifiedLeads})
          </button>
          <button
            onClick={() => setActiveTab('threats')}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition ${
              activeTab === 'threats'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <AlertTriangle className="w-4 h-4" /> Threat Intelligence ({threatDomains.length})
          </button>
        </div>

        {/* TAB 1: USERS & TOKEN MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search user name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="text-xs text-slate-400">
                Tip: Click <strong>"Adjust Credits"</strong> to manually grant or deduct tokens without SQL.
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Verified</th>
                    <th className="py-3 px-4">Credit Balance</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {users
                    .filter((u) => u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()))
                    .map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{u.name}</div>
                          <div className="text-xs text-slate-400">{u.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              u.role === 'admin'
                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {u.email_verified ? (
                            <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-amber-400 font-medium">
                              <XCircle className="w-3.5 h-3.5" /> Pending OTP
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                          {u.credits_balance.toLocaleString()} credits
                        </td>
                        <td className="py-3 px-4 text-right">
                          {editingCreditUserId === u.id ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleUpdateCredits(u.id, u.credits_balance, 5000)}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded"
                              >
                                +5,000
                              </button>
                              <button
                                onClick={() => handleUpdateCredits(u.id, u.credits_balance, 50000)}
                                className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded"
                              >
                                +50,000
                              </button>
                              <button
                                onClick={() => handleUpdateCredits(u.id, u.credits_balance, -1000)}
                                className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded"
                              >
                                -1,000
                              </button>
                              <button
                                onClick={() => setEditingCreditUserId(null)}
                                className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded"
                              >
                                Close
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setEditingCreditUserId(u.id)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-emerald-400 rounded-lg transition"
                            >
                              Adjust Credits
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: VERIFIED LEADS DIRECTORY */}
        {activeTab === 'leads' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-4 p-5">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search by email or domain..."
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <select
                  value={leadProvider}
                  onChange={(e) => setLeadProvider(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">All Providers</option>
                  <option value="corporate_b2b">Corporate B2B</option>
                  <option value="google">Google Workspace</option>
                  <option value="yahoo">Yahoo</option>
                </select>
              </div>

              <button
                onClick={exportLeadsCsv}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition shadow-lg shadow-emerald-600/20"
              >
                <Download className="w-4 h-4" /> Export Verified Leads (.CSV)
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Email Address</th>
                    <th className="py-3 px-4">Domain</th>
                    <th className="py-3 px-4">Provider</th>
                    <th className="py-3 px-4">Score</th>
                    <th className="py-3 px-4">Times Verified</th>
                    <th className="py-3 px-4">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {leads
                    .filter(
                      (l) =>
                        (!leadSearch || l.raw_email.toLowerCase().includes(leadSearch.toLowerCase()) || l.domain.toLowerCase().includes(leadSearch.toLowerCase())) &&
                        (!leadProvider || l.provider_type === leadProvider)
                    )
                    .map((l) => (
                      <tr key={l.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4 font-mono font-medium text-emerald-400">{l.raw_email}</td>
                        <td className="py-3 px-4 text-slate-300 font-mono text-xs">{l.domain}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-300">
                            {l.provider_type}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-white">{l.quality_score}/100</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                            {l.times_seen}x uploaded
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-400">{new Date(l.last_verified_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: THREAT INTELLIGENCE MANAGER */}
        {activeTab === 'threats' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 bg-slate-900 border border-slate-800 p-5 rounded-2xl h-fit space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" /> Manually Add Dead / Threat Domain
              </h2>
              <p className="text-xs text-slate-400">
                Any domain added here will be immediately rejected with 0ms delay across all users.
              </p>
              <form onSubmit={handleAddThreatDomain} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Domain</label>
                  <input
                    type="text"
                    placeholder="e.g. fake-dead-domain.com"
                    value={newThreatDomain}
                    onChange={(e) => setNewThreatDomain(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Reason / Note</label>
                  <input
                    type="text"
                    placeholder="e.g. Inactive server / Honeypot"
                    value={newThreatReason}
                    onChange={(e) => setNewThreatReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm rounded-lg transition"
                >
                  Add to Threat Database
                </button>
              </form>
            </div>

            <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-5 space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" /> Cached Threat Domains ({threatDomains.length})
              </h2>
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Domain</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {threatDomains.map((t) => (
                      <tr key={t.domain} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4 font-mono font-medium text-rose-400">{t.domain}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            {t.classification}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-400">{t.reason}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteThreatDomain(t.domain)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                            title="Remove from threats"
                          >
                            <Trash2 className="w-4 h-4" />
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
      </main>
    </div>
  );
}
