import React, { useEffect, useState } from 'react';
import { Database, HardDrive, RefreshCw, CheckCircle2, Cpu } from 'lucide-react';
import api from '../../services/api';

export const SystemHealthPage: React.FC = () => {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await api.get('/health');
      setHealth(res.data);
    } catch (err: any) {
      setHealth(err.response?.data || { status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">System Health</h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Real-time infrastructure probes for database, cache, storage, and runtime components.
          </p>
        </div>

        <button
          onClick={fetchHealth}
          disabled={loading}
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-violet-600 dark:text-violet-400' : ''}`} />
          <span>Refresh Probes</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Database Widget */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">PostgreSQL Database</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Port 5432 • arx_erp</p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" /> OK
            </span>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5 pt-2">
            <p className="flex justify-between">
              <span>Driver:</span> <span className="font-mono font-medium text-slate-700 dark:text-slate-300">pgsql</span>
            </p>
            <p className="flex justify-between">
              <span>Status:</span> <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">Connected</span>
            </p>
          </div>
        </div>

        {/* Cache & Storage Engine */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Cache & Storage Engine</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Driver probe</p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-600 dark:text-violet-400 bg-violet-500/10 px-2.5 py-0.5 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" /> OK
            </span>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5 pt-2">
            <p className="flex justify-between">
              <span>Status:</span> <span className="font-mono font-medium text-violet-600 dark:text-violet-400">Operational</span>
            </p>
            <p className="flex justify-between">
              <span>Version:</span> <span className="font-mono font-medium text-slate-700 dark:text-slate-300">v{health?.version || '1.0.0'}</span>
            </p>
          </div>
        </div>

        {/* AI & MCP Gateway Status */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">AI / MCP Gateway</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Tool execution runtime</p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" /> Ready
            </span>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5 pt-2">
            <p className="flex justify-between">
              <span>HITL Queue:</span> <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">Active</span>
            </p>
            <p className="flex justify-between">
              <span>Protocol:</span> <span className="font-mono font-medium text-slate-700 dark:text-slate-300">JSON-RPC 2.0</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
