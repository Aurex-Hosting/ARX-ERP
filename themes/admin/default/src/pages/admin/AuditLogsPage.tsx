import React, { useEffect, useState } from 'react';
import {
  Bot,
  User,
  Clock,
  Download,
  Trash2,
  AlertTriangle,
  X,
  FileArchive,
  RefreshCw,
  CheckCircle2,
  Search,
  Eye,
  Shield,
  Activity,
  CheckSquare,
  Square,
} from 'lucide-react';
import api from '../../services/api';
import { AuditLogItem } from '../../types';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [userTypeFilter, setUserTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Selection state for batch deletion
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);

  // Modals state
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [activeDetailLog, setActiveDetailLog] = useState<AuditLogItem | null>(null);
  const [deletingSingleId, setDeletingSingleId] = useState<number | null>(null);
  const [singleDeleting, setSingleDeleting] = useState(false);

  // Export form state
  const [exportMode, setExportMode] = useState<'all' | 'range'>('all');
  const [exportFromDate, setExportFromDate] = useState<string>('');
  const [exportToDate, setExportToDate] = useState<string>('');
  const [exporting, setExporting] = useState(false);

  // Purge form state
  const [purgeMode, setPurgeMode] = useState<'all' | 'range'>('range');
  const [purgeFromDate, setPurgeFromDate] = useState<string>('');
  const [purgeToDate, setPurgeToDate] = useState<string>('');
  const [purging, setPurging] = useState(false);
  const [confirmPurgeAll, setConfirmPurgeAll] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (userTypeFilter !== 'all') {
        params.user_type = userTypeFilter;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      const response = await api.get('/admin/audit-logs', { params });
      setLogs(response.data.data || []);
      setSelectedIds([]);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [userTypeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  const handleSelectAll = () => {
    if (selectedIds.length === logs.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(logs.map((log) => log.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSingleDelete = async () => {
    if (!deletingSingleId) return;

    setSingleDeleting(true);
    setStatusMessage(null);
    try {
      const response = await api.delete(`/admin/audit-logs/${deletingSingleId}`);
      setStatusMessage({
        type: 'success',
        text: response.data.message || `Audit log #${deletingSingleId} deleted successfully.`,
      });
      setDeletingSingleId(null);
      if (activeDetailLog?.id === deletingSingleId) {
        setActiveDetailLog(null);
      }
      await fetchLogs();
    } catch (err: any) {
      console.error('Failed to delete audit log:', err);
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to delete audit log entry.',
      });
    } finally {
      setSingleDeleting(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;

    setBatchDeleting(true);
    setStatusMessage(null);
    try {
      const response = await api.post('/admin/audit-logs/batch-delete', {
        ids: selectedIds,
      });
      setStatusMessage({
        type: 'success',
        text: response.data.message || `Successfully deleted ${selectedIds.length} audit log record(s).`,
      });
      setSelectedIds([]);
      setShowBatchDeleteModal(false);
      await fetchLogs();
    } catch (err: any) {
      console.error('Batch delete error:', err);
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to delete selected audit logs.',
      });
    } finally {
      setBatchDeleting(false);
    }
  };

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (exportMode === 'range' && (!exportFromDate || !exportToDate)) {
      setStatusMessage({ type: 'error', text: 'Please specify both start and end dates for the export range.' });
      return;
    }

    setExporting(true);
    setStatusMessage(null);

    try {
      const payload: any = {
        all: exportMode === 'all',
      };
      if (exportMode === 'range') {
        payload.from_date = exportFromDate;
        payload.to_date = exportToDate;
      }

      const response = await api.post('/admin/audit-logs/export', payload, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      link.setAttribute('download', `audit_logs_${exportMode === 'all' ? 'all' : `${exportFromDate}_to_${exportToDate}`}_${timestamp}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setStatusMessage({ type: 'success', text: 'Audit logs exported successfully as ZIP archive.' });
      setShowExportModal(false);
    } catch (err: any) {
      console.error('Export error:', err);
      setStatusMessage({ type: 'error', text: 'Failed to export audit logs. Please try again.' });
    } finally {
      setExporting(false);
    }
  };

  const handlePurge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (purgeMode === 'range' && (!purgeFromDate || !purgeToDate)) {
      setStatusMessage({ type: 'error', text: 'Please specify both start and end dates to purge.' });
      return;
    }

    if (purgeMode === 'all' && !confirmPurgeAll) {
      setStatusMessage({ type: 'error', text: 'Please confirm that you want to delete ALL audit records.' });
      return;
    }

    setPurging(true);
    setStatusMessage(null);

    try {
      const payload: any = {
        all: purgeMode === 'all',
      };
      if (purgeMode === 'range') {
        payload.from_date = purgeFromDate;
        payload.to_date = purgeToDate;
      }

      const response = await api.delete('/admin/audit-logs', { data: payload });
      setStatusMessage({
        type: 'success',
        text: response.data.message || 'Audit logs purged successfully.',
      });
      setShowPurgeModal(false);
      setConfirmPurgeAll(false);
      await fetchLogs();
    } catch (err: any) {
      console.error('Purge error:', err);
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to purge audit logs.',
      });
    } finally {
      setPurging(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header & Main Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Audit Trail</h1>
            <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
              Immutable Trail
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Complete audit record of mutations, configuration updates, logins, notifications, and AI Agent actions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={() => setShowBatchDeleteModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-500/20 transition-all cursor-pointer animate-in fade-in"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>
          )}

          {/* Export Action */}
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 shadow-sm transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            <span>Export (ZIP)</span>
          </button>

          {/* Purge Action */}
          <button
            onClick={() => setShowPurgeModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200/60 dark:border-rose-900/40 shadow-sm transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span>Purge Logs</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={fetchLogs}
            title="Refresh logs"
            className="p-2 rounded-xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 shadow-sm transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Status Feedback Message */}
      {statusMessage && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-xl text-xs font-medium animate-in fade-in duration-150 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-x-auto">
          {[
            { id: 'all', label: 'All Actors' },
            { id: 'user', label: 'Human Users' },
            { id: 'ai_agent', label: 'AI Agents' },
            { id: 'system', label: 'System Service' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setUserTypeFilter(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                userTypeFilter === item.id
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:max-w-xs">
          <input
            type="text"
            placeholder="Search descriptions, actions, IPs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setTimeout(() => fetchLogs(), 0);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>
      </div>

      {/* Logs Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-sm">Loading audit records...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-sm">
            No audit records match the current filter or search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 uppercase font-semibold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="pl-4 pr-2 py-3.5 w-8">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-slate-400 hover:text-violet-600 transition-colors cursor-pointer"
                    >
                      {selectedIds.length > 0 && selectedIds.length === logs.length ? (
                        <CheckSquare className="w-4 h-4 text-violet-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Actor</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Action</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Description</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Target Entity</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">IP / Agent</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Timestamp</th>
                  <th className="px-4 py-3.5 whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {logs.map((log) => {
                  const isSelected = selectedIds.includes(log.id);
                  return (
                    <tr
                      key={log.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${
                        isSelected ? 'bg-violet-50/40 dark:bg-violet-950/20' : ''
                      }`}
                    >
                      <td className="pl-4 pr-2 py-3.5">
                        <button
                          type="button"
                          onClick={() => toggleSelect(log.id)}
                          className="text-slate-400 hover:text-violet-600 transition-colors cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-violet-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              log.user_type === 'ai_agent'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                : log.user_type === 'system'
                                ? 'bg-slate-500/10 text-slate-600 dark:text-slate-400'
                                : 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                            }`}
                          >
                            {log.user_type === 'ai_agent' ? (
                              <Bot className="w-3.5 h-3.5" />
                            ) : log.user_type === 'system' ? (
                              <Activity className="w-3.5 h-3.5" />
                            ) : (
                              <User className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {log.user?.name || (log.user_identifier ? `#${log.user_identifier}` : `User #${log.user_id || 'System'}`)}
                            </p>
                            <p className="text-[10px] text-slate-400">{log.user_type}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-violet-700 dark:text-violet-300 font-medium">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 max-w-xs truncate text-slate-700 dark:text-slate-300" title={log.description || ''}>
                        {log.description || '-'}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {log.model_type ? (
                          <span title={log.model_type}>
                            {log.model_type.split('\\').pop()}
                            {log.model_id ? ` #${log.model_id}` : ''}
                          </span>
                        ) : (
                          'Direct System'
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">
                        {log.ip_address || '127.0.0.1'}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 opacity-60 shrink-0" />
                          <span>{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setActiveDetailLog(log)}
                            title="Inspect Details"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingSingleId(log.id)}
                            title="Delete this log"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Inspection Modal */}
      {activeDetailLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Audit Log Entry #{activeDetailLog.id}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(activeDetailLog.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveDetailLog(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Description Card */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Description</span>
              <p className="text-xs font-medium text-slate-900 dark:text-white">
                {activeDetailLog.description || 'No description recorded.'}
              </p>
            </div>

            {/* Core Meta Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <span className="text-[10px] uppercase font-bold text-slate-400">Action</span>
                <p className="text-xs font-mono font-semibold text-violet-600 dark:text-violet-400 mt-0.5">
                  {activeDetailLog.action}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <span className="text-[10px] uppercase font-bold text-slate-400">Actor</span>
                <p className="text-xs font-semibold text-slate-900 dark:text-white mt-0.5">
                  {activeDetailLog.user?.name || activeDetailLog.user_type}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <span className="text-[10px] uppercase font-bold text-slate-400">IP Address</span>
                <p className="text-xs font-mono text-slate-700 dark:text-slate-300 mt-0.5">
                  {activeDetailLog.ip_address || '127.0.0.1'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <span className="text-[10px] uppercase font-bold text-slate-400">Target Model</span>
                <p className="text-xs font-mono text-slate-700 dark:text-slate-300 mt-0.5 truncate">
                  {activeDetailLog.model_type ? activeDetailLog.model_type.split('\\').pop() : 'Direct'}
                </p>
              </div>
            </div>

            {/* Mutation Diffs: Old vs New Values */}
            {(activeDetailLog.old_values || activeDetailLog.new_values) && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  State Mutation Diff
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeDetailLog.old_values && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                        Previous State (Old)
                      </span>
                      <pre className="p-3 rounded-xl bg-slate-900 text-rose-300 text-[11px] font-mono overflow-x-auto max-h-48">
                        {JSON.stringify(activeDetailLog.old_values, null, 2)}
                      </pre>
                    </div>
                  )}
                  {activeDetailLog.new_values && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        New State (Applied)
                      </span>
                      <pre className="p-3 rounded-xl bg-slate-900 text-emerald-300 text-[11px] font-mono overflow-x-auto max-h-48">
                        {JSON.stringify(activeDetailLog.new_values, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Metadata Section */}
            {activeDetailLog.metadata && Object.keys(activeDetailLog.metadata).length > 0 && (
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Request & Context Metadata
                </span>
                <pre className="p-3 rounded-xl bg-slate-900 text-violet-300 text-[11px] font-mono overflow-x-auto max-h-36">
                  {JSON.stringify(activeDetailLog.metadata, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setDeletingSingleId(activeDetailLog.id);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Log Entry</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveDetailLog(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Delete Confirmation Modal */}
      {deletingSingleId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Audit Entry</h3>
                <p className="text-xs text-rose-600 dark:text-rose-400">Entry #{deletingSingleId}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Are you sure you want to permanently delete this audit trail record? This action is irreversible.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingSingleId(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSingleDelete}
                disabled={singleDeleting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {singleDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Record</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Delete Confirmation Modal */}
      {showBatchDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Batch Delete Audits</h3>
                <p className="text-xs text-rose-600 dark:text-rose-400">{selectedIds.length} items selected</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Are you sure you want to permanently delete the {selectedIds.length} selected audit log records?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowBatchDeleteModal(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBatchDelete}
                disabled={batchDeleting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {batchDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete ({selectedIds.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <FileArchive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Export Audit Logs</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Download formatted JSON and CSV inside a ZIP</p>
                </div>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExport} className="space-y-4">
              {/* Scope Selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Export Scope</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExportMode('all')}
                    className={`px-3 py-2.5 rounded-xl text-xs font-medium text-center transition-all cursor-pointer ${
                      exportMode === 'all'
                        ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20 font-semibold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    All Records
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportMode('range')}
                    className={`px-3 py-2.5 rounded-xl text-xs font-medium text-center transition-all cursor-pointer ${
                      exportMode === 'range'
                        ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20 font-semibold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    Date Range
                  </button>
                </div>
              </div>

              {/* Date pickers when Range is selected */}
              {exportMode === 'range' && (
                <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-100/60 dark:bg-slate-800/40 rounded-xl">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      From Date
                    </label>
                    <input
                      type="date"
                      required
                      value={exportFromDate}
                      onChange={(e) => setExportFromDate(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      To Date
                    </label>
                    <input
                      type="date"
                      required
                      value={exportToDate}
                      onChange={(e) => setExportToDate(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                    />
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={exporting}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {exporting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating ZIP...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Download ZIP Archive</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Purge Modal */}
      {showPurgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Purge Audit Records</h3>
                  <p className="text-xs text-rose-600 dark:text-rose-400">Irreversible deletion of log entries</p>
                </div>
              </div>
              <button
                onClick={() => setShowPurgeModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePurge} className="space-y-4">
              {/* Scope Selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Deletion Scope</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPurgeMode('range');
                      setConfirmPurgeAll(false);
                    }}
                    className={`px-3 py-2.5 rounded-xl text-xs font-medium text-center transition-all cursor-pointer ${
                      purgeMode === 'range'
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20 font-semibold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    Date Range
                  </button>
                  <button
                    type="button"
                    onClick={() => setPurgeMode('all')}
                    className={`px-3 py-2.5 rounded-xl text-xs font-medium text-center transition-all cursor-pointer ${
                      purgeMode === 'all'
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20 font-semibold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    Delete ALL Records
                  </button>
                </div>
              </div>

              {/* Date pickers when Range is selected */}
              {purgeMode === 'range' && (
                <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-100/60 dark:bg-slate-800/40 rounded-xl">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      From Date
                    </label>
                    <input
                      type="date"
                      required
                      value={purgeFromDate}
                      onChange={(e) => setPurgeFromDate(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      To Date
                    </label>
                    <input
                      type="date"
                      required
                      value={purgeToDate}
                      onChange={(e) => setPurgeToDate(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    />
                  </div>
                </div>
              )}

              {/* Extra Confirmation for Delete All */}
              {purgeMode === 'all' && (
                <div className="p-3.5 bg-rose-500/10 rounded-xl space-y-2 border border-rose-200 dark:border-rose-900/50">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-rose-700 dark:text-rose-300">
                      This will permanently delete the entire audit trail history across all users and AI agents.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmPurgeAll}
                      onChange={(e) => setConfirmPurgeAll(e.target.checked)}
                      className="rounded text-rose-600 focus:ring-rose-500/20"
                    />
                    <span className="text-[11px] font-semibold text-rose-800 dark:text-rose-200">
                      I understand and confirm full audit log purge
                    </span>
                  </label>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowPurgeModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={purging || (purgeMode === 'all' && !confirmPurgeAll)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {purging ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Purging...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Confirm Purge</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

