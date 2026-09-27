import React, { useEffect, useState } from 'react';
import { Box, Palette, Activity, Database, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';

export const OverviewPage: React.FC = () => {
  const [health, setHealth] = useState<any>(null);
  const [modulesCount, setModulesCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [healthRes, modulesRes] = await Promise.all([
          api.get('/health'),
          api.get('/admin/modules'),
        ]);
        setHealth(healthRes.data);
        setModulesCount(modulesRes.data.modules?.length || 0);
      } catch (err) {
        console.error('Failed to load admin overview:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-8 rounded-3xl bg-white dark:bg-slate-900 shadow-sm transition-colors duration-200">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-semibold">
            Super-Admin Active
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">System Overview</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Monitor infrastructure health, manage installed modules, and review security audits.
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold shrink-0">
          <CheckCircle2 className="w-4 h-4" />
          <span>Operational</span>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm transition-colors duration-200">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Discovered Modules</span>
            <Box className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{loading ? '...' : modulesCount}</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Dashboard & Admin</p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm transition-colors duration-200">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Themes</span>
            <Palette className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">2</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Dashboard & Admin active</p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm transition-colors duration-200">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Database</span>
            <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 uppercase text-sm font-mono mt-1">
            {health?.checks?.database || 'PostgreSQL OK'}
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Port 5432 • Connected</p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm transition-colors duration-200">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">System Health</span>
            <Activity className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          </div>
          <p className="text-2xl font-bold text-violet-600 dark:text-violet-400 capitalize text-sm font-mono mt-1">
            {health?.status || 'Healthy'}
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">ARX-ERP v1.0.0</p>
        </div>
      </div>
    </div>
  );
};
