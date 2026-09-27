import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, Layers, ShieldCheck, Zap } from 'lucide-react';

export const DashboardOverview: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-white via-slate-50 to-violet-50/50 dark:from-slate-900 dark:via-slate-900/90 dark:to-violet-950/40 p-8 shadow-sm transition-colors duration-200">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> Core Platform Ready
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400">{user?.name}</span>
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
            This is your clean baseline overview. As you install modules (CRM, Economy, Inventory, POS), their custom widgets and dashboards will automatically populate here.
          </p>
        </div>

        {/* Subtle decorative glowing orb */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-violet-500/10 dark:bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400 mb-4">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-sm text-slate-900 dark:text-white mb-1">API-First Modular Engine</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            All features run as isolated modules. Core code remains immutable and safe during platform updates.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400 mb-4">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-sm text-slate-900 dark:text-white mb-1">Granular RBAC Security</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Every module registers its own scoped permissions. Users only see and access authorized resources.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400 mb-4">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-sm text-slate-900 dark:text-white mb-1">Themeable Architecture</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Swap and customize frontend themes independently for the Dashboard and Admin surfaces.
          </p>
        </div>
      </div>
    </div>
  );
};
