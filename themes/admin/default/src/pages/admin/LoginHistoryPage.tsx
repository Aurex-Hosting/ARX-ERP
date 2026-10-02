import React, { useEffect, useState, useCallback } from 'react';
import {
  History,
  ShieldCheck,
  AlertTriangle,
  Laptop,
  Smartphone,
  Tablet,
  Globe,
  Trash2,
  PowerOff,
  Search,
  RefreshCw,
  Copy,
  Check,
  Eye,
  X,
  Clock,
  KeyRound,
  AlertCircle,
} from 'lucide-react';
import api from '../../services/api';
import { LoginHistoryItem, LoginHistoryStats } from '../../types';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

export const LoginHistoryPage: React.FC = () => {
  const [items, setItems] = useState<LoginHistoryItem[]>([]);
  const [stats, setStats] = useState<LoginHistoryStats>({
    total_count: 0,
    active_count: 0,
    failed_count: 0,
    revoked_count: 0,
    older_than_14_days_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals and dialog states
  const [selectedItemForDetails, setSelectedItemForDetails] = useState<LoginHistoryItem | null>(null);
  const [revokeConfirmItem, setRevokeConfirmItem] = useState<LoginHistoryItem | null>(null);
  const [showRevokeAllModal, setShowRevokeAllModal] = useState(false);
  const [revokeAllIncludeSelf, setRevokeAllIncludeSelf] = useState(false);
  const [showClearOlderModal, setShowClearOlderModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedFingerprintId, setCopiedFingerprintId] = useState<number | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/login-history', {
        params: {
          page,
          status: statusFilter,
          search: searchQuery.trim() || undefined,
        },
      });

      setItems(response.data.data || []);
      setStats(response.data.stats || {
        total_count: 0,
        active_count: 0,
        failed_count: 0,
        revoked_count: 0,
        older_than_14_days_count: 0,
      });
      setTotalPages(response.data.meta?.last_page || 1);
      setTotalRecords(response.data.meta?.total || 0);
    } catch (err: any) {
      console.error('Failed to load login history:', err);
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to fetch login history activities.',
      });
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, searchQuery]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleCopyFingerprint = (id: number, fingerprint: string) => {
    navigator.clipboard.writeText(fingerprint);
    setCopiedFingerprintId(id);
    setTimeout(() => setCopiedFingerprintId(null), 2000);
  };

  // Revoke single session
  const handleRevokeSingle = async () => {
    if (!revokeConfirmItem) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/admin/login-history/${revokeConfirmItem.id}/revoke`);
      setStatusMessage({ type: 'success', text: res.data.message });
      setRevokeConfirmItem(null);
      await fetchHistory();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to revoke session.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Revoke all sessions
  const handleRevokeAll = async () => {
    setActionLoading(true);
    try {
      const res = await api.post('/admin/login-history/revoke-all', {
        include_self: revokeAllIncludeSelf,
      });

      setStatusMessage({ type: 'success', text: res.data.message });
      setShowRevokeAllModal(false);

      if (revokeAllIncludeSelf) {
        // Logged out self as well
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
      } else {
        await fetchHistory();
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to revoke all sessions.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Clear history older than 14 days
  const handleClearOlderThan14Days = async () => {
    setActionLoading(true);
    try {
      const res = await api.post('/admin/login-history/clear-older');
      setStatusMessage({ type: 'success', text: res.data.message });
      setShowClearOlderModal(false);
      setPage(1);
      await fetchHistory();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to clear login history.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Helper for Device Icon
  const getDeviceIcon = (deviceType: string, platform?: string | null) => {
    const p = (platform || '').toLowerCase();
    if (deviceType === 'mobile' || p.includes('iphone') || p.includes('android')) {
      return <Smartphone className="w-4 h-4 text-emerald-500" />;
    }
    if (deviceType === 'tablet' || p.includes('ipad')) {
      return <Tablet className="w-4 h-4 text-indigo-500" />;
    }
    return <Laptop className="w-4 h-4 text-violet-500" />;
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <History className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            <span>Login History & Sessions</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Display all login activities, active/expired sessions, device fingerprints, and retention policies
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Clear older than 14 days button */}
          <button
            onClick={() => setShowClearOlderModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer border border-slate-200/50 dark:border-slate-700/50"
            title="Clean up login logs older than 14 days"
          >
            <Trash2 className="w-4 h-4 text-amber-500" />
            <span>Clear History (&gt;14 Days)</span>
            {stats.older_than_14_days_count > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-md">
                {stats.older_than_14_days_count}
              </span>
            )}
          </button>

          {/* Revoke All Sessions button */}
          <button
            onClick={() => setShowRevokeAllModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-500/20 transition-all cursor-pointer"
          >
            <PowerOff className="w-4 h-4" />
            <span>Revoke All Sessions</span>
          </button>
        </div>
      </div>

      {/* Alert Status Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-medium animate-in fade-in duration-200 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/50'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/50'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button
            onClick={() => setStatusMessage(null)}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-medium">Total Logins</span>
            <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <History className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total_count}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Recorded attempts</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-medium">Active Sessions</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.active_count}</p>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Valid token sessions</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-medium">Failed Attempts</span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{stats.failed_count}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Invalid credentials/status</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-medium">Revoked Sessions</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
              <PowerOff className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.revoked_count}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Terminated manually</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-medium">Over 14 Days</span>
            <div className="p-1.5 rounded-lg bg-slate-500/10 text-slate-500">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">{stats.older_than_14_days_count}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Eligible for purge</span>
        </div>
      </div>

      {/* Filters & Search Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-100 dark:border-slate-800/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-950/70 rounded-2xl w-full md:w-auto overflow-x-auto custom-scrollbar">
            {[
              { id: 'all', label: 'All Activities' },
              { id: 'active', label: 'Active Sessions' },
              { id: 'expired', label: 'Expired Sessions' },
              { id: 'revoked', label: 'Revoked' },
              { id: 'failed', label: 'Failed Attempts' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setStatusFilter(tab.id);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box & Refresh */}
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search email, IP, browser, fingerprint..."
                className="w-full pl-9.5 pr-4 py-2 bg-slate-100 dark:bg-slate-950/60 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={() => fetchHistory()}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Refresh logs"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-violet-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto custom-scrollbar -mx-4 sm:mx-0">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800/80 text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
                <th className="py-3 px-4">User / Email</th>
                <th className="py-3 px-4">Status & Session</th>
                <th className="py-3 px-4">Device & OS</th>
                <th className="py-3 px-4">IP & Location</th>
                <th className="py-3 px-4">Device Fingerprint</th>
                <th className="py-3 px-4">Login Time</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                      <span>Loading login activities...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <History className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2 opacity-50" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">No login activities found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Try adjusting your filters or search keywords</p>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* User Column */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold flex items-center justify-center text-xs shrink-0">
                            {item.user?.name ? item.user.name.charAt(0).toUpperCase() : item.email.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 dark:text-white block truncate">
                              {item.user?.name || item.email.split('@')[0]}
                            </span>
                            <span className="text-[11px] text-slate-400 block truncate">{item.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Status & Session Column */}
                      <td className="py-3.5 px-4">
                        {item.status === 'failed' ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Failed Login</span>
                            </span>
                            {item.failure_reason && (
                              <span className="text-[10px] text-slate-400 block truncate max-w-[150px]" title={item.failure_reason}>
                                {item.failure_reason}
                              </span>
                            )}
                          </div>
                        ) : item.is_active_session ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>Active Session</span>
                            </span>
                            {item.last_active_at && (
                              <span className="text-[10px] text-slate-400 block">
                                Active {new Date(item.last_active_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        ) : item.is_revoked ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                              <PowerOff className="w-3 h-3" />
                              <span>Revoked</span>
                            </span>
                            {item.revoked_at && (
                              <span className="text-[10px] text-slate-400 block">
                                {new Date(item.revoked_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            <span>Expired Session</span>
                          </span>
                        )}
                      </td>

                      {/* Device & OS Column */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          {getDeviceIcon(item.device_type, item.platform)}
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                              {item.platform || 'Unknown OS'}
                            </span>
                            <span className="text-[11px] text-slate-400 block">
                              {item.browser ? `${item.browser} ${item.browser_version || ''}`.trim() : 'Unknown Browser'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* IP & Location Column */}
                      <td className="py-3.5 px-4">
                        <div>
                          <span className="font-mono text-xs text-slate-900 dark:text-slate-100 block">
                            {item.ip_address || '—'}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                            <Globe className="w-3 h-3 text-slate-400" />
                            <span>{item.location || 'Localhost'}</span>
                          </span>
                        </div>
                      </td>

                      {/* Device Fingerprint Column */}
                      <td className="py-3.5 px-4">
                        {item.device_fingerprint ? (
                          <div className="flex items-center gap-1.5">
                            <code
                              className="font-mono text-[11px] bg-slate-100 dark:bg-slate-950/80 px-2 py-1 rounded-md text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-800/50"
                              title={item.device_fingerprint}
                            >
                              {item.device_fingerprint.substring(0, 10)}...
                            </code>
                            <button
                              onClick={() => handleCopyFingerprint(item.id, item.device_fingerprint!)}
                              className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                              title="Copy full fingerprint"
                            >
                              {copiedFingerprintId === item.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Login Time Column */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-slate-700 dark:text-slate-300 block font-medium">
                          {new Date(item.login_at).toLocaleDateString()}
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          {new Date(item.login_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      {/* Actions Column */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View details drawer */}
                          <button
                            onClick={() => setSelectedItemForDetails(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="View diagnostics"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Revoke single session if active */}
                          {item.is_active_session && (
                            <button
                              onClick={() => setRevokeConfirmItem(item)}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                              title="Revoke this active session"
                            >
                              <PowerOff className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400">
            <span>
              Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, totalRecords)} of {totalRecords} records
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-2 font-semibold text-slate-900 dark:text-white">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Activity Diagnostic Details */}
      {selectedItemForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Session & Device Diagnostics</h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Detailed telemetry for login event #{selectedItemForDetails.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedItemForDetails(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/60">
                  <span className="text-[11px] text-slate-400 block mb-1">Target Account</span>
                  <span className="font-bold text-slate-900 dark:text-white block truncate">{selectedItemForDetails.email}</span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/60">
                  <span className="text-[11px] text-slate-400 block mb-1">Session Status</span>
                  <span className="font-bold text-slate-900 dark:text-white block">
                    {selectedItemForDetails.is_active_session
                      ? '🟢 Active Session'
                      : selectedItemForDetails.status === 'failed'
                      ? '🔴 Failed Attempt'
                      : selectedItemForDetails.is_revoked
                      ? '⛔ Revoked'
                      : '⚪ Expired'}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/60 space-y-2.5">
                <span className="font-semibold text-slate-900 dark:text-white block">Device Fingerprint & Client</span>
                
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Full Device Fingerprint Hash:</span>
                  <div className="flex items-center gap-2">
                    <code className="bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-xl text-slate-800 dark:text-slate-200 font-mono text-[11px] flex-1 break-all select-all border border-slate-200/60 dark:border-slate-800">
                      {selectedItemForDetails.device_fingerprint || 'Not synthesized'}
                    </code>
                    {selectedItemForDetails.device_fingerprint && (
                      <button
                        onClick={() => handleCopyFingerprint(selectedItemForDetails.id, selectedItemForDetails.device_fingerprint!)}
                        className="p-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                        title="Copy fingerprint"
                      >
                        {copiedFingerprintId === selectedItemForDetails.id ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/50">
                  <div>
                    <span className="text-[11px] text-slate-400">Operating System:</span>
                    <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">{selectedItemForDetails.platform || 'Unknown'}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400">Browser & Version:</span>
                    <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">{selectedItemForDetails.browser} {selectedItemForDetails.browser_version}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400">IP Address:</span>
                    <p className="font-medium font-mono text-slate-800 dark:text-slate-200 mt-0.5">{selectedItemForDetails.ip_address}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400">Resolved Location:</span>
                    <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">{selectedItemForDetails.location || 'Local'}</p>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block mb-1">Raw User-Agent Header:</span>
                <div className="bg-slate-900 text-slate-200 p-3 rounded-2xl font-mono text-[11px] leading-relaxed break-all max-h-32 overflow-y-auto custom-scrollbar">
                  {selectedItemForDetails.user_agent || 'N/A'}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end">
              <button
                onClick={() => setSelectedItemForDetails(null)}
                className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold cursor-pointer shadow-md shadow-violet-500/20"
              >
                Close Diagnostics
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog: Revoke Specific Session */}
      <ConfirmDialog
        isOpen={Boolean(revokeConfirmItem)}
        title="Revoke Active Login Session?"
        message={`Are you sure you want to terminate the session for '${revokeConfirmItem?.email}' on ${revokeConfirmItem?.platform} (${revokeConfirmItem?.ip_address})? The associated Sanctum API token will be invalidated immediately.`}
        confirmText="Revoke Session"
        cancelText="Cancel"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleRevokeSingle}
        onCancel={() => setRevokeConfirmItem(null)}
      />

      {/* Modal: Revoke All Sessions */}
      {showRevokeAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <PowerOff className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Revoke All Active Sessions</h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Emergency session termination across system tokens
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRevokeAllModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                This action will instantly invalidate active authentication tokens and terminate active sessions across all users.
              </p>

              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 space-y-2">
                <label className="flex items-center gap-2.5 text-xs font-semibold text-amber-900 dark:text-amber-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={revokeAllIncludeSelf}
                    onChange={(e) => setRevokeAllIncludeSelf(e.target.checked)}
                    className="accent-rose-600 rounded-md w-4 h-4 cursor-pointer"
                  />
                  <span>Include my current session (requires re-login)</span>
                </label>
                <p className="text-[11px] text-amber-800 dark:text-amber-300/90 pl-6">
                  {revokeAllIncludeSelf
                    ? '⚠️ Your current Super-Admin token will be destroyed and you will be redirected to the login page.'
                    : 'Your current active administrator session will be kept safe while all other tokens are revoked.'}
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowRevokeAllModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleRevokeAll}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <span>Revoke All Sessions</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Clear History Older than 14 Days */}
      {showClearOlderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Clear Login History (&gt;14 Days)</h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Purge obsolete historical logs according to retention rules
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowClearOlderModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Records eligible for purge:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
                    {stats.older_than_14_days_count} records
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-slate-800/50">
                  <span className="text-slate-500 dark:text-slate-400">Retention Policy:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">14 Days Strict Minimum</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-amber-900 dark:text-amber-200">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Strict Data Retention Safeguard</span>
                </div>
                <p>
                  Only activities recorded more than 14 days ago will be cleared. All recent activities from the last 14 days will be preserved.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowClearOlderModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading || stats.older_than_14_days_count === 0}
                onClick={handleClearOlderThan14Days}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <span>Clear {stats.older_than_14_days_count} Old Logs</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
