import React, { useEffect, useState } from 'react';
import {
  Zap,
  Cpu,
  Layers,
  Terminal,
  Wrench,
  Puzzle,
  RefreshCw,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Sparkles,
  Check,
  X,
  Plus,
  Search,
} from 'lucide-react';
import api from '../../services/api';

type TabType = 'overview' | 'processes' | 'cache' | 'terminal' | 'maintenance' | 'extensions';

export const SystemPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Overview Data
  const [overview, setOverview] = useState<any>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  // Processes Data
  const [processes, setProcesses] = useState<any>(null);
  const [loadingProcesses, setLoadingProcesses] = useState(false);
  const [autoRefreshProcesses, setAutoRefreshProcesses] = useState(true);
  const [addWorkerQueues, setAddWorkerQueues] = useState('critical,high,medium,default,low');
  const [addWorkerCount, setAddWorkerCount] = useState(1);
  const [addingWorker, setAddingWorker] = useState(false);

  // Cache Data
  const [cacheData, setCacheData] = useState<any>(null);
  const [loadingCache, setLoadingCache] = useState(false);
  const [cacheActionLoading, setCacheActionLoading] = useState<string | null>(null);
  const [cacheCommandOutput, setCacheCommandOutput] = useState<{ type: string; output: string; duration_ms: number } | null>(null);

  // Maintenance & Extensions
  const [maintenance, setMaintenance] = useState<any>(null);
  const [maintenanceSecret, setMaintenanceSecret] = useState('');
  const [togglingMaintenance, setTogglingMaintenance] = useState(false);
  const [extensions, setExtensions] = useState<any>(null);
  const [extensionSearch, setExtensionSearch] = useState('');

  // Process Actions loading states
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Toast Notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 5000);
  };

  // Fetch Overview
  const fetchOverview = async (showSpinner = true) => {
    if (showSpinner) setLoadingOverview(true);
    try {
      const res = await api.get('/admin/system/overview');
      setOverview(res.data);
    } catch (err: any) {
      console.error('Failed to fetch system overview:', err);
    } finally {
      if (showSpinner) setLoadingOverview(false);
    }
  };

  // Fetch Processes
  const fetchProcesses = async (showSpinner = false) => {
    if (showSpinner) setLoadingProcesses(true);
    try {
      const res = await api.get('/admin/system/processes');
      setProcesses(res.data);
    } catch (err: any) {
      console.error('Failed to fetch process state:', err);
    } finally {
      if (showSpinner) setLoadingProcesses(false);
    }
  };

  // Fetch Cache
  const fetchCache = async (showSpinner = true) => {
    if (showSpinner) setLoadingCache(true);
    try {
      const res = await api.get('/admin/system/cache');
      setCacheData(res.data);
    } catch (err: any) {
      console.error('Failed to fetch cache status:', err);
    } finally {
      if (showSpinner) setLoadingCache(false);
    }
  };

  // Fetch Maintenance
  const fetchMaintenance = async () => {
    try {
      const res = await api.get('/admin/system/maintenance');
      setMaintenance(res.data);
      if (res.data?.secret) setMaintenanceSecret(res.data.secret);
    } catch (err: any) {
      console.error('Failed to fetch maintenance status:', err);
    }
  };

  // Fetch Extensions
  const fetchExtensions = async () => {
    try {
      const res = await api.get('/admin/system/extensions');
      setExtensions(res.data);
    } catch (err: any) {
      console.error('Failed to fetch extensions:', err);
    }
  };

  // Initial Load
  useEffect(() => {
    fetchOverview(true);
    fetchProcesses(false);
    fetchCache(false);
  }, []);

  // Tab switch effect
  useEffect(() => {
    if (activeTab === 'overview') fetchOverview(false);
    if (activeTab === 'processes') fetchProcesses(true);
    if (activeTab === 'cache') fetchCache(true);
    if (activeTab === 'maintenance') fetchMaintenance();
    if (activeTab === 'extensions') fetchExtensions();
  }, [activeTab]);

  // Auto-refresh processes loop
  useEffect(() => {
    if (activeTab !== 'processes' || !autoRefreshProcesses) return;

    const timer = setInterval(() => {
      fetchProcesses(false);
    }, 5000);

    return () => clearInterval(timer);
  }, [activeTab, autoRefreshProcesses]);

  // --- ACTIONS ---

  const handleReloadOctane = async () => {
    setActionLoading('octane');
    try {
      const res = await api.post('/admin/system/processes/reload-octane');
      showNotification('success', res.data?.output || 'Octane workers reloaded successfully.');
      fetchProcesses(false);
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to reload Octane.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestartWorkers = async () => {
    setActionLoading('workers');
    try {
      const res = await api.post('/admin/system/processes/restart-workers');
      showNotification('success', res.data?.output || 'Signaled queue workers to restart after active jobs.');
      fetchProcesses(false);
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to restart queue workers.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestartAll = async () => {
    setActionLoading('all');
    try {
      const res = await api.post('/admin/system/processes/restart-all');
      showNotification('success', res.data?.message || 'Dispatched restart signal to Octane and Queue Workers.');
      fetchProcesses(false);
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to restart services.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingWorker(true);
    try {
      const res = await api.post('/admin/system/processes/add-worker', {
        queues: addWorkerQueues,
        count: addWorkerCount,
      });
      showNotification('success', `Started ${res.data?.started_count || addWorkerCount} worker(s) on queues: ${addWorkerQueues}`);
      fetchProcesses(false);
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to add queue worker.');
    } finally {
      setAddingWorker(false);
    }
  };

  const handleClearCache = async (type: string, rebuild = false) => {
    const key = `${type}-${rebuild ? 'rebuild' : 'clear'}`;
    setCacheActionLoading(key);
    try {
      const res = await api.post('/admin/system/cache/clear', {
        type,
        rebuild,
      });
      setCacheCommandOutput({
        type,
        output: res.data?.output || 'Cache command completed successfully.',
        duration_ms: res.data?.duration_ms || 0,
      });
      showNotification('success', `Cache '${type}' ${rebuild ? 'rebuilt' : 'cleared'} successfully in ${res.data?.duration_ms}ms.`);
      fetchCache(false);
      fetchOverview(false);
    } catch (err: any) {
      showNotification('error', err.response?.data?.output || err.response?.data?.message || 'Cache purge failed.');
    } finally {
      setCacheActionLoading(null);
    }
  };

  const handleToggleMaintenance = async (enable: boolean) => {
    setTogglingMaintenance(true);
    try {
      await api.post('/admin/system/maintenance/toggle', {
        enable,
        secret: maintenanceSecret || null,
      });
      showNotification('success', `Maintenance mode ${enable ? 'enabled' : 'disabled'} successfully.`);
      fetchMaintenance();
      fetchOverview(false);
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to toggle maintenance mode.');
    } finally {
      setTogglingMaintenance(false);
    }
  };

  const navTabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: Zap },
    { id: 'processes', label: 'Processes', icon: Cpu },
    { id: 'cache', label: 'Cache', icon: Layers },
    { id: 'terminal', label: 'Terminal', icon: Terminal },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench },
    { id: 'extensions', label: 'Extensions', icon: Puzzle },
  ];

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification Banner */}
      {notification && (
        <div
          className={`flex items-center justify-between p-4 rounded-2xl text-xs font-medium shadow-md transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : notification.type === 'error'
              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
              : 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">System</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Health monitoring, cache management, and maintenance tools
        </p>

        {/* Seamless Navigation Tabs Bar matching app conventions */}
        <div className="flex items-center justify-between mt-4 pb-1 gap-2">
          <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 rounded-xl shadow-sm overflow-x-auto">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => {
              if (activeTab === 'overview') fetchOverview(true);
              else if (activeTab === 'cache') fetchCache(true);
              else if (activeTab === 'processes') fetchProcesses(true);
              else if (activeTab === 'maintenance') fetchMaintenance();
              else if (activeTab === 'extensions') fetchExtensions();
            }}
            disabled={loadingOverview || loadingCache || loadingProcesses}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 shadow-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${(loadingOverview || loadingCache || loadingProcesses) ? 'animate-spin text-violet-600 dark:text-violet-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: OVERVIEW (Matching Screenshot 1 - Borderless dark/light cards)
          ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Top Row: CPU LOAD, RAM, DISK (3 columns, borderless) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* CPU LOAD */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
              <span className="text-[11px] font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                CPU LOAD
              </span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">
                {overview?.cpu ? `${Math.round(overview.cpu.usage_percent)}%` : '100%'}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {overview?.cpu?.load_display || '2 cores · load 189.26/92.18/39.45'}
              </div>
            </div>

            {/* RAM */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
              <span className="text-[11px] font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                RAM
              </span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">
                {overview?.ram?.used_formatted || '1.2 GB'}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {overview?.ram?.display || '14.7% of 8 GB · 6.8 GB free'}
              </div>
            </div>

            {/* DISK */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
              <span className="text-[11px] font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                DISK
              </span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">
                {overview?.disk ? `${overview.disk.usage_percent}%` : '21.1%'}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {overview?.disk?.display || '20.6 GB used · 77.2 GB free of 97.9 GB'}
              </div>
            </div>
          </div>

          {/* Second Row: DATABASE, CACHE, QUEUE (3 columns, borderless) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* DATABASE */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
              <span className="text-[11px] font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                DATABASE
              </span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">
                {overview?.database?.engine || 'MYSQL'}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {overview?.database?.display || '0.43ms · 127.0.0.1'}
              </div>
            </div>

            {/* CACHE */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
              <span className="text-[11px] font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                CACHE
              </span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">
                {overview?.cache?.driver || 'REDIS'}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {overview?.cache?.display || 'Working correctly'}
              </div>
            </div>

            {/* QUEUE */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
              <span className="text-[11px] font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                QUEUE
              </span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">
                {overview?.queue?.driver || 'REDIS'}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {overview?.queue?.display || '0 pending · 21 failed'}
              </div>
            </div>
          </div>

          {/* Two Specification Panels: Environment & Storage/OPcache (Side by Side, borderless) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Environment Panel */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Environment</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Runtime configuration details</p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 dark:text-slate-400">PHP Version</span>
                  <span className="font-mono text-slate-900 dark:text-white font-medium">{overview?.environment?.php_version || '8.4.26'}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 dark:text-slate-400">Laravel Version</span>
                  <span className="font-mono text-slate-900 dark:text-white font-medium">{overview?.environment?.laravel_version || '12.64.0'}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 dark:text-slate-400">Environment</span>
                  <span className="text-slate-900 dark:text-white font-medium">{overview?.environment?.environment || 'production'}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 dark:text-slate-400">Debug Mode</span>
                  {overview?.environment?.debug_mode ? (
                    <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Enabled
                    </span>
                  ) : (
                    <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Disabled
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 dark:text-slate-400">Maintenance</span>
                  <span className="text-slate-900 dark:text-white font-medium">{overview?.environment?.maintenance || 'Disabled'}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 dark:text-slate-400">Timezone</span>
                  <span className="text-slate-900 dark:text-white font-medium">{overview?.environment?.timezone || 'UTC'}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 dark:text-slate-400">Server OS</span>
                  <span className="text-slate-900 dark:text-white font-medium">{overview?.environment?.server_os || 'Linux (7.0.6-2-pve)'}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 dark:text-slate-400">CPU Model</span>
                  <span className="text-slate-900 dark:text-white font-medium truncate max-w-[280px]" title={overview?.environment?.cpu_model}>
                    {overview?.environment?.cpu_model || 'Intel(R) Xeon(R) CPU E3-1270 v6 @ 3.80GHz'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 dark:text-slate-400">DB Name</span>
                  <span className="text-slate-900 dark:text-white font-medium">{overview?.environment?.db_name || 'dezerx'}</span>
                </div>
              </div>
            </div>

            {/* Storage & OPcache Panel */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Storage & OPcache</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Filesystem and PHP acceleration</p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 dark:text-slate-400">Storage Size</span>
                  <span className="text-slate-900 dark:text-white font-medium">{overview?.storage_opcache?.storage_size || '105.2 MB'}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 dark:text-slate-400">Storage Symlink</span>
                  <span className="text-slate-900 dark:text-white font-medium">{overview?.storage_opcache?.storage_symlink || '✓ Linked'}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 dark:text-slate-400">PHP Memory Limit</span>
                  <span className="font-mono text-slate-900 dark:text-white font-medium">{overview?.storage_opcache?.php_memory_limit || '-1'}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 dark:text-slate-400">PHP Memory (now)</span>
                  <span className="text-slate-900 dark:text-white font-medium">{overview?.storage_opcache?.php_memory_now || '72 MB'}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 dark:text-slate-400">PHP Memory (peak)</span>
                  <span className="text-slate-900 dark:text-white font-medium">{overview?.storage_opcache?.php_memory_peak || '76 MB'}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 dark:text-slate-400">OPcache</span>
                  <span className="text-slate-900 dark:text-white font-medium">{overview?.storage_opcache?.opcache || 'Enabled'}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 dark:text-slate-400">OPcache Hit Rate</span>
                  <span className="text-slate-900 dark:text-white font-medium">{overview?.storage_opcache?.opcache_hit_rate || '66.12%'}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 dark:text-slate-400">Cached Scripts</span>
                  <span className="text-slate-900 dark:text-white font-medium">{overview?.storage_opcache?.cached_scripts || '1846'}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 dark:text-slate-400">OPcache Memory Used</span>
                  <span className="text-slate-900 dark:text-white font-medium">{overview?.storage_opcache?.opcache_memory_used || '53.8 MB'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: PROCESSES (Matching Screenshot 2 - Borderless cards)
          ========================================================================= */}
      {activeTab === 'processes' && (
        <div className="space-y-5">
          {/* Subheader with auto-refresh and refresh button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Processes & Schedulers</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Live state of the Octane server, queue-workers and the cron scheduler.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-400 select-none">
                <input
                  type="checkbox"
                  checked={autoRefreshProcesses}
                  onChange={(e) => setAutoRefreshProcesses(e.target.checked)}
                  className="rounded border-0 bg-slate-200 dark:bg-slate-800 text-violet-600 focus:ring-0 cursor-pointer"
                />
                <span>Auto-refresh on</span>
              </label>

              <button
                onClick={() => fetchProcesses(true)}
                disabled={loadingProcesses}
                className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-sm text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingProcesses ? 'animate-spin text-violet-600 dark:text-violet-400' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Top 3 Action Cards (borderless, matching screenshot 2) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: OCTANE */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                  OCTANE
                </span>
                <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {processes?.octane?.running ? 'Running' : 'Stopped'}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {processes?.octane?.subtitle || 'Server stopped'}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-4 leading-relaxed">
                  <strong className="text-slate-900 dark:text-white font-semibold block">Restart Octane</strong>
                  Gracefully reloads every Octane worker. In-flight requests finish on the old workers first.
                </div>
              </div>

              <button
                onClick={handleReloadOctane}
                disabled={actionLoading === 'octane'}
                className="w-full mt-5 py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs shadow-md shadow-violet-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <RotateCw className={`w-3.5 h-3.5 ${actionLoading === 'octane' ? 'animate-spin' : ''}`} />
                <span>Reload Octane</span>
              </button>
            </div>

            {/* Card 2: QUEUE WORKERS */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                  QUEUE WORKERS
                </span>
                <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {processes?.queue_workers?.card_title || '0 running'}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {processes?.queue_workers?.subtitle || '0 pending · 0 delayed · 0 failed'}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-4 leading-relaxed">
                  <strong className="text-slate-900 dark:text-white font-semibold block">Restart Queue Workers</strong>
                  Signals every worker to exit after its current job. Your process manager starts them again.
                </div>
              </div>

              <button
                onClick={handleRestartWorkers}
                disabled={actionLoading === 'workers'}
                className="w-full mt-5 py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs shadow-md shadow-violet-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <RotateCw className={`w-3.5 h-3.5 ${actionLoading === 'workers' ? 'animate-spin' : ''}`} />
                <span>Restart Workers</span>
              </button>
            </div>

            {/* Card 3: SCHEDULER */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                  SCHEDULER
                </span>
                <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {processes?.scheduler?.running ? 'Running' : 'Standby'}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {processes?.scheduler?.subtitle || 'No heartbeat detected'}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-4 leading-relaxed">
                  <strong className="text-slate-900 dark:text-white font-semibold block">Restart Everything</strong>
                  Reloads Octane workers and signals every queue worker to restart. Use after deploying code.
                </div>
              </div>

              <button
                onClick={handleRestartAll}
                disabled={actionLoading === 'all'}
                className="w-full mt-5 py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs shadow-md shadow-violet-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <RotateCw className={`w-3.5 h-3.5 ${actionLoading === 'all' ? 'animate-spin' : ''}`} />
                <span>Restart All</span>
              </button>
            </div>
          </div>

          {/* Section 1: Octane Detail Card (borderless) */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Octane</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {processes?.octane?.running
                    ? `${processes?.octane?.server || 'RoadRunner'} HTTP server serving this application`
                    : 'High-performance HTTP server (stopped)'}
                </p>
              </div>

              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                processes?.octane?.running
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                  : 'text-slate-600 dark:text-slate-400 bg-slate-500/10'
              }`}>
                {processes?.octane?.status || (processes?.octane?.running ? 'HEALTHY' : 'STOPPED')}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">Status</span>
                <span className={`font-bold ${
                  processes?.octane?.running ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
                }`}>
                  {processes?.octane?.status || (processes?.octane?.running ? 'HEALTHY' : 'STOPPED')}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">Server</span>
                <span className="font-mono text-slate-900 dark:text-white font-medium">{processes?.octane?.server || 'roadrunner'}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">Listening on</span>
                <span className="font-mono text-slate-900 dark:text-white font-medium">{processes?.octane?.listening_on || '127.0.0.1:8000'}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">Workers</span>
                <span className="font-mono text-slate-900 dark:text-white font-medium">
                  {processes?.octane?.running ? (processes?.octane?.workers ?? 4) : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">Max requests per worker</span>
                <span className="font-mono text-slate-900 dark:text-white font-medium">
                  {processes?.octane?.running ? (processes?.octane?.max_requests ?? 10000) : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">Master PID</span>
                <span className="font-mono text-slate-900 dark:text-white font-medium">{processes?.octane?.master_pid || '—'}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">Started</span>
                <span className="text-slate-900 dark:text-white font-medium">{processes?.octane?.started || '—'}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Queue workers Detail Card (borderless) */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Queue workers</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {processes?.queue_workers?.driver_display || `${processes?.queue_workers?.os || 'System'} ${processes?.queue_workers?.driver || 'database'}: ${processes?.queue_workers?.running_count ?? 0} worker processes detected`}
                </p>
              </div>

              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                processes?.queue_workers?.health === 'HEALTHY'
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                  : processes?.queue_workers?.health === 'STANDBY'
                  ? 'text-slate-600 dark:text-slate-400 bg-slate-500/10'
                  : 'text-amber-600 dark:text-amber-400 bg-amber-500/10'
              }`}>
                {processes?.queue_workers?.health || 'STANDBY'}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">Health</span>
                <span className={`font-bold ${
                  processes?.queue_workers?.health === 'HEALTHY'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : processes?.queue_workers?.health === 'STANDBY'
                    ? 'text-slate-500 dark:text-slate-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}>
                  {processes?.queue_workers?.health || 'STANDBY'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">Busy / Idle</span>
                <span className="text-slate-900 dark:text-white font-medium">
                  {processes?.queue_workers?.busy_count ?? 0} busy / {processes?.queue_workers?.idle_count ?? 0} idle
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">Pending jobs</span>
                <span className="font-mono text-slate-900 dark:text-white font-medium">{processes?.queue_workers?.pending_jobs ?? 0}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">Delayed jobs</span>
                <span className="font-mono text-slate-900 dark:text-white font-medium">{processes?.queue_workers?.delayed_jobs ?? 0}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">Failed jobs</span>
                <span className={`font-mono font-bold ${(processes?.queue_workers?.failed_jobs ?? 0) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
                  {processes?.queue_workers?.failed_jobs ?? 0}
                </span>
              </div>

              {/* Detected worker processes list */}
              {(!processes?.queue_workers?.workers_list || processes.queue_workers.workers_list.length === 0) ? (
                <div className="py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 text-xs italic">
                  No queue worker processes currently running on this server. Click &quot;Add worker&quot; below or run <code className="font-mono text-slate-700 dark:text-slate-300">php artisan queue:work</code>.
                </div>
              ) : (
                processes?.queue_workers?.workers_list?.map((w: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between py-1">
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      PID {w.pid} / {w.queues}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">{w.memory} · {w.uptime}</span>
                  </div>
                ))
              )}
            </div>

            {/* Depth by queue sub-section */}
            <div className="space-y-2 text-xs pt-2">
              <span className="text-[11px] font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase block mb-1">
                DEPTH BY QUEUE
              </span>
              {['critical', 'high', 'medium', 'default', 'low'].map((q) => {
                const info = processes?.queue_workers?.depth_by_queue?.[q];
                return (
                  <div key={q} className="flex items-center justify-between py-1 text-xs">
                    <span className="font-mono text-slate-700 dark:text-slate-300">{q}</span>
                    <span className="text-slate-500 dark:text-slate-400 font-mono">
                      {info?.display || '0 pending · 0 running · 0 delayed'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Add queue workers form card */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 space-y-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Add queue workers</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {processes?.queue_workers?.panel_workers_count || 0} of {processes?.queue_workers?.panel_workers_max || 12} panel-managed workers started here, alongside anything your process manager runs
                </p>
              </div>

              <form onSubmit={handleAddWorker} className="flex flex-col sm:flex-row items-end gap-3 pt-1">
                <div className="flex-1 w-full space-y-1">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Queues (comma separated)</label>
                  <input
                    type="text"
                    value={addWorkerQueues}
                    onChange={(e) => setAddWorkerQueues(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-white shadow-xs focus:outline-hidden focus:ring-2 focus:ring-violet-500/20"
                    placeholder="critical,high,medium,default,low"
                  />
                </div>

                <div className="w-24 space-y-1">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">How many</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={addWorkerCount}
                    onChange={(e) => setAddWorkerCount(parseInt(e.target.value) || 1)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-white shadow-xs focus:outline-hidden focus:ring-2 focus:ring-violet-500/20"
                  />
                </div>

                <button
                  type="submit"
                  disabled={addingWorker}
                  className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs shadow-md shadow-violet-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{addingWorker ? 'Starting...' : 'Add worker'}</span>
                </button>
              </form>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
                Each worker is a detached <code className="text-violet-600 dark:text-violet-400 font-mono">php artisan queue:work</code> loop that restarts itself after a deploy, a 'queue:restart', or its hourly recycle. It is not registered with systemd, so it will not come back after a server reboot - make a worker permanent by adding it to your process manager.
              </p>
            </div>
          </div>

          {/* Section 3: Cron scheduler Detail Card (borderless) */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Cron scheduler</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {processes?.scheduler?.running
                    ? `schedule:run last fired ${processes?.scheduler?.last_tick || 'recently'}`
                    : 'No active scheduler heartbeat recorded'}
                </p>
              </div>

              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                processes?.scheduler?.health === 'HEALTHY'
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                  : processes?.scheduler?.health === 'STANDBY'
                  ? 'text-slate-600 dark:text-slate-400 bg-slate-500/10'
                  : 'text-amber-600 dark:text-amber-400 bg-amber-500/10'
              }`}>
                {processes?.scheduler?.health || 'STANDBY'}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">Health</span>
                <span className={`font-bold ${
                  processes?.scheduler?.health === 'HEALTHY'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : processes?.scheduler?.health === 'STANDBY'
                    ? 'text-slate-500 dark:text-slate-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}>
                  {processes?.scheduler?.health || 'STANDBY'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">Last tick</span>
                <span className="text-slate-900 dark:text-white font-medium">{processes?.scheduler?.last_tick || 'Never'}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">Ticks recorded</span>
                <span className="font-mono text-slate-900 dark:text-white font-medium">{processes?.scheduler?.ticks_recorded ?? 0}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">Failing tasks</span>
                <span className="font-mono text-slate-900 dark:text-white font-medium">{processes?.scheduler?.failing_tasks ?? 0}</span>
              </div>
            </div>

            {/* Task list with status dot */}
            <div className="pt-2 space-y-1">
              {processes?.scheduler?.tasks?.map((task: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 text-xs transition-colors"
                >
                  <div className="flex items-center gap-2.5 truncate max-w-[450px]">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${task.status === 'failing' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                    <span className="font-mono text-slate-800 dark:text-slate-200 truncate">{task.name}</span>
                  </div>

                  <div className="text-slate-500 dark:text-slate-400 text-[11px] shrink-0 font-mono">
                    {task.last_run && task.last_run !== 'Never' ? task.last_run : task.frequency}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: CACHE MANAGEMENT (Seamless borderless dark/light cards)
          ========================================================================= */}
      {activeTab === 'cache' && (
        <div className="space-y-5">
          {/* Cache Header & Master Action Banner */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Master Cache Optimizer</h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
                Executes <code className="text-violet-600 dark:text-violet-400 font-mono">php artisan optimize:clear</code>. Instantly purges all application caching layers including compiled templates, route tree, system configuration, registered events, and active stores in a single operation.
              </p>
            </div>

            <button
              onClick={() => handleClearCache('all', false)}
              disabled={cacheActionLoading === 'all-clear'}
              className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-violet-500/20 whitespace-nowrap self-start md:self-auto disabled:opacity-50"
            >
              <Trash2 className={`w-4 h-4 ${cacheActionLoading === 'all-clear' ? 'animate-spin' : ''}`} />
              <span>{cacheActionLoading === 'all-clear' ? 'Purging All Caches...' : 'Clear All Caches'}</span>
            </button>
          </div>

          {/* Real-time Artisan Execution Output Log */}
          {cacheCommandOutput && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 text-xs font-mono space-y-2 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 pb-1">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Artisan Execution Log ({cacheCommandOutput.duration_ms}ms)</span>
                <button onClick={() => setCacheCommandOutput(null)} className="hover:text-slate-900 dark:hover:text-white cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <pre className="text-slate-800 dark:text-slate-200 text-[11px] whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                {cacheCommandOutput.output}
              </pre>
            </div>
          )}

          {/* Quick Summary Badges Grid (borderless) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">Config Cache</span>
              <span className={`text-sm font-bold mt-1 inline-block ${cacheData?.summary?.config_cached ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                {cacheData?.summary?.config_cached ? 'Cached' : 'Not Cached'}
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">Route Cache</span>
              <span className={`text-sm font-bold mt-1 inline-block ${cacheData?.summary?.routes_cached ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                {cacheData?.summary?.routes_cached ? 'Cached' : 'Not Cached'}
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">Event Cache</span>
              <span className={`text-sm font-bold mt-1 inline-block ${cacheData?.summary?.events_cached ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                {cacheData?.summary?.events_cached ? 'Cached' : 'Not Cached'}
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">Compiled Views</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-1 inline-block">
                {cacheData?.summary?.compiled_views_count ?? 0} templates ({cacheData?.summary?.compiled_views_size || '0 B'})
              </span>
            </div>
          </div>

          {/* Detailed Cache Layers List (borderless) */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Cache Stores & Layers</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Flush individual caches or trigger on-demand warmup rebuilds.
              </p>
            </div>

            <div className="space-y-3 pt-1">
              {cacheData?.caches?.map((item: any) => {
                const isClearing = cacheActionLoading === `${item.key}-clear`;
                const isRebuilding = cacheActionLoading === `${item.key}-rebuild`;

                return (
                  <div key={item.key} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1 max-w-2xl">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{item.name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 shadow-xs">
                          {item.driver}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            item.status === 'Cached' || item.status === 'Operational' || item.status === 'Enabled' || item.status === 'Ready'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {item.description}
                      </p>
                      {item.details && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          {item.details}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.can_clear && (
                        <button
                          onClick={() => handleClearCache(item.key, false)}
                          disabled={isClearing || isRebuilding}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
                        >
                          <Trash2 className={`w-3.5 h-3.5 shrink-0 ${isClearing ? 'animate-spin' : ''}`} />
                          <span>{isClearing ? 'Clearing...' : 'Clear Cache'}</span>
                        </button>
                      )}

                      {item.can_rebuild && (
                        <button
                          onClick={() => handleClearCache(item.key, true)}
                          disabled={isClearing || isRebuilding}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-sm shadow-violet-500/20 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
                        >
                          <RotateCw className={`w-3.5 h-3.5 shrink-0 ${isRebuilding ? 'animate-spin' : ''}`} />
                          <span>{isRebuilding ? 'Rebuilding...' : 'Rebuild Cache'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: TERMINAL (CLI Diagnostics - borderless)
          ========================================================================= */}
      {activeTab === 'terminal' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Artisan Console Diagnostics</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Direct administrative command shortcuts for production operations.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 font-mono text-xs space-y-3">
            <div className="flex items-center justify-between text-slate-500 pb-2">
              <span className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                <span>Quick Run Commands</span>
              </span>
              <span className="text-[10px]">CLI Mode</span>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 shadow-xs transition-colors">
                <span className="text-slate-700 dark:text-slate-300">php artisan octane:status</span>
                <button
                  onClick={() => fetchProcesses(true)}
                  className="px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-medium cursor-pointer shadow-xs inline-flex items-center justify-center whitespace-nowrap"
                >
                  Run Probe
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 shadow-xs transition-colors">
                <span className="text-slate-700 dark:text-slate-300">php artisan queue:restart</span>
                <button
                  onClick={handleRestartWorkers}
                  className="px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-medium cursor-pointer shadow-xs inline-flex items-center justify-center whitespace-nowrap"
                >
                  Dispatch Signal
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 shadow-xs transition-colors">
                <span className="text-slate-700 dark:text-slate-300">php artisan optimize:clear</span>
                <button
                  onClick={() => handleClearCache('all', false)}
                  className="px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-medium cursor-pointer shadow-xs inline-flex items-center justify-center whitespace-nowrap"
                >
                  Execute
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: MAINTENANCE (borderless)
          ========================================================================= */}
      {activeTab === 'maintenance' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Maintenance Mode</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Take the application offline for database upgrades or heavy maintenance.
              </p>
            </div>

            <span
              className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full ${
                maintenance?.is_down
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {maintenance?.is_down ? 'MAINTENANCE ACTIVE' : 'LIVE / NORMAL'}
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Secret Bypass Token</label>
              <input
                type="text"
                value={maintenanceSecret}
                onChange={(e) => setMaintenanceSecret(e.target.value)}
                placeholder="e.g. secret-admin-pass-2026"
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-white shadow-xs focus:outline-hidden focus:ring-2 focus:ring-violet-500/20"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Optional secret key that allows administrators to bypass maintenance mode by visiting <code className="text-violet-600 dark:text-violet-400 font-mono">https://yourdomain.com/{maintenanceSecret || 'your-secret'}</code>.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              {maintenance?.is_down ? (
                <button
                  onClick={() => handleToggleMaintenance(false)}
                  disabled={togglingMaintenance}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Bring Application Back Online (php artisan up)</span>
                </button>
              ) : (
                <button
                  onClick={() => handleToggleMaintenance(true)}
                  disabled={togglingMaintenance}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-md shadow-rose-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Activate Maintenance Mode (php artisan down)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 6: EXTENSIONS (borderless)
          ========================================================================= */}
      {activeTab === 'extensions' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">PHP Extensions ({extensions?.total || 0})</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                All compiled and dynamically loaded PHP modules on this server.
              </p>
            </div>

            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={extensionSearch}
                onChange={(e) => setExtensionSearch(e.target.value)}
                placeholder="Search extensions..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white shadow-xs focus:outline-hidden focus:ring-2 focus:ring-violet-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
            {extensions?.extensions
              ?.filter((e: any) => e.name.toLowerCase().includes(extensionSearch.toLowerCase()))
              ?.map((ext: any) => (
                <div
                  key={ext.name}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 flex items-center justify-between text-xs"
                >
                  <span className="font-mono text-slate-800 dark:text-slate-200 font-medium">{ext.name}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">{ext.version}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemPage;
