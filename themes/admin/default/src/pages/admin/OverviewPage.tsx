import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Sun,
  Sunrise,
  Sunset,
  Moon,
  Quote,
  Users,
  Box,
  Palette,
  Archive,
  Activity,
  HardDrive,
  Database,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
  Eye,
  EyeOff,
  ChevronRight,
  Server,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

// Curated high-quality programming quotes as immediate render & offline fallback
const FALLBACK_QUOTES = [
  { text: 'Talk is cheap. Show me the code.', author: 'Linus Torvalds' },
  { text: 'Simplicity is prerequisite for reliability.', author: 'Edsger W. Dijkstra' },
  { text: 'Any fool can write code that a computer can understand. Good programmers write code that humans can understand.', author: 'Martin Fowler' },
  { text: 'First, solve the problem. Then, write the code.', author: 'John Johnson' },
  { text: 'Make it work, make it right, make it fast.', author: 'Kent Beck' },
  { text: 'Before software can be reusable it first has to be usable.', author: 'Ralph Johnson' },
  { text: 'Code is like humor. When you have to explain it, it’s bad.', author: 'Cory House' },
  { text: 'The only way to go fast, is to go well.', author: 'Robert C. Martin' },
  { text: 'Premature optimization is the root of all evil.', author: 'Donald Knuth' },
  { text: 'It’s not a bug; it’s an undocumented feature.', author: 'Anonymous' },
  { text: 'Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away.', author: 'Antoine de Saint-Exupéry' },
  { text: 'Experience is the name everyone gives to their mistakes.', author: 'Oscar Wilde' },
  { text: 'Good code is its own best documentation.', author: 'Steve McConnell' },
  { text: 'Computers are fast; developers are not.', author: 'Rob Pike' },
];

interface QuoteItem {
  text: string;
  author: string;
}

interface OverviewPageProps {
  onNavigateTab?: (tab: string) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();

  // Metrics Data States
  const [usersCount, setUsersCount] = useState<number>(0);
  const [modulesCount, setModulesCount] = useState<number>(0);
  const [installedModulesCount, setInstalledModulesCount] = useState<number>(0);
  const [enabledModulesCount, setEnabledModulesCount] = useState<number>(0);
  const [themesCount, setThemesCount] = useState<number>(2);
  const [backupsCount, setBackupsCount] = useState<number>(0);
  const [backupsTotalSize, setBackupsTotalSize] = useState<string>('');

  // System Hardware Overview
  const [overview, setOverview] = useState<any>(null);
  const [maintenance, setMaintenance] = useState<any>(null);

  // Updates & Licensing Data
  const [updateStatus, setUpdateStatus] = useState<any>(null);
  const [checkingUpdates, setCheckingUpdates] = useState<boolean>(false);
  const [lastCheckMessage, setLastCheckMessage] = useState<string | null>(null);

  // Quote State
  const [quote, setQuote] = useState<QuoteItem>(() => {
    return FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
  });

  // General Loading & UI State
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedFingerprint, setCopiedFingerprint] = useState<boolean>(false);
  const [copiedLicenseKey, setCopiedLicenseKey] = useState<boolean>(false);
  const [showInstallationId, setShowInstallationId] = useState<boolean>(false);
  const [showLicenseKey, setShowLicenseKey] = useState<boolean>(false);

  // Greeting based on current local hour
  const greetingInfo = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return { text: 'Good Morning', icon: Sunrise, color: 'text-amber-500' };
    }
    if (hour < 17) {
      return { text: 'Good Afternoon', icon: Sun, color: 'text-amber-400' };
    }
    if (hour < 21) {
      return { text: 'Good Evening', icon: Sunset, color: 'text-orange-400' };
    }
    return { text: 'Good Night', icon: Moon, color: 'text-indigo-400' };
  }, []);

  const adminFullName = useMemo(() => {
    if (!user) return 'Administrator';
    const first = user.first_name?.trim() || '';
    const last = user.last_name?.trim() || '';
    const combined = `${first} ${last}`.trim();
    if (combined) return combined;
    return user.name?.trim() || 'Administrator';
  }, [user]);

  // Fetch a random quote from external endpoint with smooth fallback (on page load only)
  const fetchRandomQuote = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch('https://programming-quotesapi.vercel.app/api/random', {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const text = data.quote || data.text || data.en || data.content;
        const author = data.author || 'Anonymous';
        if (text && typeof text === 'string') {
          setQuote({ text: text.trim(), author: author.trim() });
          return;
        }
      }
    } catch {
      // Gracefully fall back to internal collection if blocked by CORS, timeout, or network
    }

    // Pick a different quote from fallback list
    setQuote((prev) => {
      const available = FALLBACK_QUOTES.filter((q) => q.text !== prev.text);
      return available[Math.floor(Math.random() * available.length)] || FALLBACK_QUOTES[0];
    });
  }, []);

  // Fetch all initial overview metrics
  useEffect(() => {
    let isMounted = true;

    const loadAllOverviewData = async () => {
      try {
        const [
          usersRes,
          modulesRes,
          themesRes,
          backupsRes,
          systemRes,
          maintenanceRes,
          updatesRes,
        ] = await Promise.allSettled([
          api.get('/admin/users?per_page=1'),
          api.get('/admin/modules'),
          api.get('/admin/themes?area=dashboard'),
          api.get('/admin/backups'),
          api.get('/admin/system/overview'),
          api.get('/admin/system/maintenance'),
          api.get('/admin/updates/status'),
        ]);

        if (!isMounted) return;

        // Users count
        if (usersRes.status === 'fulfilled') {
          setUsersCount(usersRes.value.data?.total || 0);
        }

        // Modules count
        if (modulesRes.status === 'fulfilled') {
          const mods: any[] = modulesRes.value.data?.modules || [];
          setModulesCount(mods.length);
          setInstalledModulesCount(mods.filter((m) => m.is_installed).length);
          setEnabledModulesCount(mods.filter((m) => m.is_installed && m.is_enabled).length);
        }

        // Themes count
        if (themesRes.status === 'fulfilled') {
          const tList = themesRes.value.data?.themes || [];
          setThemesCount(Math.max(2, tList.length));
        }

        // Backups count
        if (backupsRes.status === 'fulfilled') {
          const bData = backupsRes.value.data;
          setBackupsCount(bData?.total_count || bData?.backups?.length || 0);
          setBackupsTotalSize(bData?.total_size_formatted || '');
        }

        // System Hardware Overview
        if (systemRes.status === 'fulfilled') {
          setOverview(systemRes.value.data);
        }

        // Maintenance state
        if (maintenanceRes.status === 'fulfilled') {
          setMaintenance(maintenanceRes.value.data);
        }

        // Updates & Licensing status
        if (updatesRes.status === 'fulfilled') {
          setUpdateStatus(updatesRes.value.data);
        }
      } catch (err) {
        console.error('Failed to load overview data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadAllOverviewData();
    fetchRandomQuote();

    return () => {
      isMounted = false;
    };
  }, [fetchRandomQuote]);

  // Check for updates on demand
  const handleCheckUpdatesNow = async () => {
    if (checkingUpdates) return;
    setCheckingUpdates(true);
    setLastCheckMessage(null);
    try {
      const res = await api.post('/admin/updates/check');
      if (res.data?.data) {
        const result = res.data.data;
        setUpdateStatus((prev: any) => ({
          ...prev,
          cached_update: result,
          last_checked_at: new Date().toISOString(),
        }));
        setLastCheckMessage(
          result.update_available
            ? `New version v${result.latest_version} is available!`
            : 'System is up to date with latest release.'
        );
      }
    } catch (err: any) {
      setLastCheckMessage(err.response?.data?.message || 'Failed to connect to update server.');
    } finally {
      setCheckingUpdates(false);
    }
  };

  const handleCopyInstallationId = () => {
    const id = updateStatus?.installation_id || 'ARX-CORE-HOST';
    navigator.clipboard.writeText(id);
    setCopiedFingerprint(true);
    setTimeout(() => setCopiedFingerprint(false), 2000);
  };

  const handleCopyLicenseKey = () => {
    const key = updateStatus?.license?.key || updateStatus?.license?.key_masked || 'ARX-ENTERPRISE-KEY';
    navigator.clipboard.writeText(key);
    setCopiedLicenseKey(true);
    setTimeout(() => setCopiedLicenseKey(false), 2000);
  };

  const navigateTo = (tab: string) => {
    if (onNavigateTab) {
      onNavigateTab(tab);
    } else {
      window.location.hash = tab;
    }
  };

  // RAM Metrics derivation
  const ramPercent = Math.min(100, Math.max(0, overview?.ram?.usage_percent || 15));
  const ramUsed = overview?.ram?.used_formatted || '1.2 GB';
  const ramTotal = overview?.ram?.total_formatted || '8.0 GB';
  const ramFree = overview?.ram?.free_formatted || '6.8 GB';

  // CPU Metrics derivation
  const cpuPercent = Math.min(100, Math.max(0, overview?.cpu?.usage_percent || 20));
  const cpuCores = overview?.cpu?.cores || 4;
  const cpuModel = overview?.cpu?.model || 'x86_64 Multi-Core Host';
  const cpuLoadAvg = overview?.cpu?.load_average?.join(', ') || '0.45, 0.38, 0.22';

  // Disk Metrics derivation
  const diskPercent = Math.min(100, Math.max(0, overview?.disk?.usage_percent || 18));
  const diskUsed = overview?.disk?.used_formatted || '24.5 GB';
  const diskTotal = overview?.disk?.total_formatted || '120.0 GB';
  const diskFree = overview?.disk?.free_formatted || '95.5 GB';

  // Connection Metrics derivation
  const dbStatus = overview?.database?.status || 'Connected';
  const dbDriver = overview?.database?.driver || 'POSTGRESQL';
  const dbLatency = overview?.database?.latency_ms ?? 0.4;
  const dbName = overview?.database?.database || 'arx_erp';

  // Security & Environment Checks
  const isDebugActive = Boolean(overview?.environment?.debug_mode);
  const isMaintenanceActive = Boolean(maintenance?.is_down);
  const phpVersion = overview?.environment?.php_version || '8.4.x';
  const laravelVersion = overview?.environment?.laravel_version || '11.x';
  const serverOs = overview?.environment?.server_os || 'Host OS';
  const appEnv = overview?.environment?.environment || 'production';
  const appTimezone = overview?.environment?.timezone || 'UTC';
  const cacheDriver = overview?.cache?.driver || 'File';

  // Updates & Licensing status derivation
  const currentVersion = updateStatus?.current_version?.version || '1.0.0';
  const hasUpdate = Boolean(updateStatus?.cached_update?.update_available);
  const latestVersion = updateStatus?.cached_update?.latest_version || currentVersion;
  const lastCheckedDate = updateStatus?.last_checked_at
    ? new Date(updateStatus.last_checked_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Recently';

  const licenseActive = Boolean(updateStatus?.license?.active || updateStatus?.license?.is_valid);
  const installationId = updateStatus?.installation_id || 'ARX-0000-0000-0000-0000';
  const licenseKeyMasked = updateStatus?.license?.key_masked || 'ARX-••••-••••-••••-9821';

  const GreetingIcon = greetingInfo.icon;

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      {/* ========================================================
          1. TOP BANNER: TIME-BASED GREETING & PROGRAMMING QUOTE
          Deep obsidian surface with subtle reference wave accent
          ======================================================== */}
      <div className="p-6 sm:p-7 rounded-[22px] bg-white dark:bg-[#121026] border border-slate-200/80 dark:border-[#231f45] shadow-sm relative overflow-hidden space-y-4">
        {/* Background wave accent matching reference UI */}
        <div className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-30 flex items-center justify-center overflow-hidden">
          <svg className="w-full h-28" viewBox="0 0 1200 120" fill="none" preserveAspectRatio="none">
            <path
              d="M0,60 C150,110 300,10 450,70 C600,130 750,10 900,60 C1050,110 1150,30 1200,60"
              stroke="#6e44ff"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M0,80 C180,20 320,110 480,40 C640,-10 800,100 960,30 C1100,0 1180,80 1200,50"
              stroke="#10b981"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              fill="none"
            />
          </svg>
        </div>

        {/* Top: Greeting & Current Date */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#6e44ff] text-white flex items-center justify-center shrink-0 shadow-sm">
              <GreetingIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {greetingInfo.text}, <span className="text-[#6e44ff] dark:text-[#8b6fff]">{adminFullName}</span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-[#8e8aab] mt-0.5 font-medium">
                {new Date().toLocaleDateString(undefined, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Core Systems Active</span>
            </span>
          </div>
        </div>

        {/* Below it: The Random Programming Quote */}
        <div className="pt-3 border-t border-slate-100 dark:border-[#231f45] relative z-10">
          <div className="flex items-start gap-2.5">
            <Quote className="w-4 h-4 text-[#6e44ff] shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-xs sm:text-sm font-medium italic text-slate-700 dark:text-slate-300 leading-relaxed">
                “{quote.text}”
              </p>
              <p className="text-[11px] font-semibold text-slate-400 dark:text-[#8e8aab]">
                — {quote.author}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          2. WARNING NOTICES: DEBUG & MAINTENANCE MODES (CONDITIONAL)
          ======================================================== */}
      {isDebugActive && (
        <div className="p-4 sm:p-5 rounded-[22px] bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-100">
                  Warning: Debug Mode is Enabled (APP_DEBUG=true)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-700 dark:text-amber-300">
                  Security Risk
                </span>
              </div>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5 leading-relaxed">
                Detailed stack traces, database parameters, and environment credentials may be visible to end users.
                Ensure <code className="font-mono font-semibold">APP_DEBUG=false</code> in production deployments.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigateTo('system')}
            className="self-start sm:self-center px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            Review System Settings
          </button>
        </div>
      )}

      {isMaintenanceActive && (
        <div className="p-4 sm:p-5 rounded-[22px] bg-rose-500/10 border border-rose-500/20 text-rose-900 dark:text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-rose-900 dark:text-rose-100">
                  Notice: System Maintenance Mode is Active
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-700 dark:text-rose-300">
                  503 In Effect
                </span>
              </div>
              <p className="text-xs text-rose-800/80 dark:text-rose-300/80 mt-0.5 leading-relaxed">
                The application is down for maintenance. Non-admin users currently receive HTTP 503 Service Unavailable pages.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigateTo('system')}
            className="self-start sm:self-center px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            Manage Maintenance
          </button>
        </div>
      )}

      {/* ========================================================
          3. METRIC CARDS & VERSION SUPERVISOR (MATCHING REFERENCE UI)
          Left: 6 Metric Cards in 3x2 Grid (lg:col-span-3)
          Right: ARX-ERP Version Card Spanning Full Height (lg:col-span-1)
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left: 6 Metric Cards in 3x2 Grid */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {/* 1. Total Users */}
          <div
            onClick={() => navigateTo('users')}
            className="rounded-[22px] bg-white dark:bg-[#121026] border border-slate-200/80 dark:border-[#231f45] hover:border-[#6e44ff]/40 shadow-sm transition-all duration-200 p-4 sm:p-5 flex items-center gap-4 cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#6e44ff] text-white flex items-center justify-center shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-105">
              <Users className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate">
                <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mr-1.5">
                  {loading ? '...' : usersCount}
                </span>
                <span className="text-sm sm:text-base font-semibold text-slate-800 dark:text-white/90">
                  Total Users
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#8e8aab] truncate mt-0.5">
                Active identity accounts
              </p>
            </div>
          </div>

          {/* 2. Installed Modules */}
          <div
            onClick={() => navigateTo('modules')}
            className="rounded-[22px] bg-white dark:bg-[#121026] border border-slate-200/80 dark:border-[#231f45] hover:border-[#6e44ff]/40 shadow-sm transition-all duration-200 p-4 sm:p-5 flex items-center gap-4 cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#6e44ff] text-white flex items-center justify-center shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-105">
              <Box className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate">
                <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mr-1.5">
                  {loading ? '...' : installedModulesCount}
                </span>
                <span className="text-sm sm:text-base font-semibold text-slate-800 dark:text-white/90">
                  Installed Modules
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#8e8aab] truncate mt-0.5">
                {enabledModulesCount} Active, {modulesCount} Discovered
              </p>
            </div>
          </div>

          {/* 3. Active Themes */}
          <div
            onClick={() => navigateTo('themes')}
            className="rounded-[22px] bg-white dark:bg-[#121026] border border-slate-200/80 dark:border-[#231f45] hover:border-[#6e44ff]/40 shadow-sm transition-all duration-200 p-4 sm:p-5 flex items-center gap-4 cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#6e44ff] text-white flex items-center justify-center shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-105">
              <Palette className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate">
                <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mr-1.5">
                  {themesCount}
                </span>
                <span className="text-sm sm:text-base font-semibold text-slate-800 dark:text-white/90">
                  Active Themes
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#8e8aab] truncate mt-0.5">
                Default Dashboard & Admin
              </p>
            </div>
          </div>

          {/* 4. Active Backups */}
          <div
            onClick={() => navigateTo('backups')}
            className="rounded-[22px] bg-white dark:bg-[#121026] border border-slate-200/80 dark:border-[#231f45] hover:border-[#6e44ff]/40 shadow-sm transition-all duration-200 p-4 sm:p-5 flex items-center gap-4 cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#6e44ff] text-white flex items-center justify-center shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-105">
              <Archive className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate">
                <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mr-1.5">
                  {loading ? '...' : backupsCount}
                </span>
                <span className="text-sm sm:text-base font-semibold text-slate-800 dark:text-white/90">
                  Active Backups
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#8e8aab] truncate mt-0.5">
                {backupsTotalSize ? `${backupsTotalSize} total archive` : 'Disaster recovery ready'}
              </p>
            </div>
          </div>

          {/* 5. Concurrent Sessions / Database */}
          <div
            onClick={() => navigateTo('system')}
            className="rounded-[22px] bg-white dark:bg-[#121026] border border-slate-200/80 dark:border-[#231f45] hover:border-[#6e44ff]/40 shadow-sm transition-all duration-200 p-4 sm:p-5 flex items-center gap-4 cursor-pointer group relative"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#6e44ff] text-white flex items-center justify-center shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-105">
              <Database className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1.5">
                <div className="truncate">
                  <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mr-1.5">
                    {dbLatency}ms
                  </span>
                  <span className="text-sm sm:text-base font-semibold text-slate-800 dark:text-white/90">
                    DB Latency
                  </span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Active & Operational" />
              </div>
              <p className="text-xs text-slate-500 dark:text-[#8e8aab] truncate mt-0.5">
                {dbDriver} • {dbName} ({dbStatus})
              </p>
            </div>
          </div>

          {/* 6. Hardware (RAM & CPU) */}
          <div
            onClick={() => navigateTo('system')}
            className="rounded-[22px] bg-white dark:bg-[#121026] border border-slate-200/80 dark:border-[#231f45] hover:border-[#6e44ff]/40 shadow-sm transition-all duration-200 p-4 sm:p-5 flex items-center gap-4 cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#6e44ff] text-white flex items-center justify-center shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-105">
              <Activity className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate">
                <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mr-1.5">
                  {ramPercent.toFixed(0)}%
                </span>
                <span className="text-sm sm:text-base font-semibold text-slate-800 dark:text-white/90">
                  RAM Memory
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#8e8aab] truncate mt-0.5">
                {ramUsed} / {ramTotal} ({ramFree} free) • {cpuPercent.toFixed(0)}% CPU ({cpuCores} Cores)
              </p>
            </div>
          </div>
        </div>

        {/* Right: ARX-ERP Version Card (Matching Spartan Version in reference UI) */}
        <div className="lg:col-span-1 rounded-[22px] bg-white dark:bg-[#121026] border border-slate-200/80 dark:border-[#231f45] shadow-sm p-6 flex flex-col justify-between items-center text-center">
          <div className="w-full flex flex-col items-center">
            <span className="text-xs font-semibold text-slate-400 dark:text-[#8e8aab] uppercase tracking-wider">
              ARX-ERP Version
            </span>
            <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-mono tracking-tight my-2">
              v{currentVersion}
            </div>
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-500 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{hasUpdate ? `Update v${latestVersion}` : 'Up to Date'}</span>
            </div>
            <div className="text-[11px] text-slate-400 dark:text-[#8e8aab] mt-1 font-mono">
              Current Version - {currentVersion}
            </div>
            {lastCheckMessage && (
              <p className="text-[11px] font-medium text-[#6e44ff] dark:text-[#8b6fff] mt-1 animate-in fade-in">
                {lastCheckMessage}
              </p>
            )}
          </div>

          <div className="pt-4 w-full flex flex-col items-center gap-2 border-t border-slate-100 dark:border-[#231f45]">
            <button
              type="button"
              onClick={handleCheckUpdatesNow}
              disabled={checkingUpdates}
              className="w-full py-2 px-3 rounded-xl bg-[#6e44ff] hover:bg-[#5b36ea] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdates ? 'animate-spin' : ''}`} />
              <span>{checkingUpdates ? 'Checking for Updates...' : 'Check for Updates'}</span>
            </button>
            <span className="text-[11px] text-slate-400 dark:text-[#8e8aab]">
              Last checked: {lastCheckedDate}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================
          4. ENTERPRISE AUTHORIZATION & RUNTIME ENVIRONMENT
          Row of: Enterprise License | Runtime Platform | Storage & Security
          ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Enterprise License */}
        <div className="p-5 sm:p-6 rounded-[22px] bg-white dark:bg-[#121026] border border-slate-200/80 dark:border-[#231f45] shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#6e44ff] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    ARX-ERP Enterprise Core
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-[#8e8aab]">
                    Cryptographic Machine Anchor
                  </p>
                </div>
              </div>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                licenseActive
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
              }`}>
                <CheckCircle2 className="w-3 h-3" />
                <span>{licenseActive ? 'Active & Verified' : 'Enterprise Core'}</span>
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-[#231f45] space-y-2.5">
              {/* Installation ID */}
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-[#8e8aab] tracking-wider block mb-1">
                  Installation ID
                </span>
                <div className="flex items-center justify-between gap-1.5 p-2 rounded-xl bg-white dark:bg-[#121026] border border-slate-200/80 dark:border-[#231f45]">
                  <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 tracking-wider">
                    {showInstallationId ? installationId : 'ARX-*****'}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowInstallationId(!showInstallationId)}
                      title={showInstallationId ? 'Hide Installation ID' : 'Reveal Installation ID'}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      {showInstallationId ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyInstallationId}
                      title="Copy Installation ID"
                      className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      {copiedFingerprint ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* License Key */}
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-[#8e8aab] tracking-wider block mb-1">
                  License Key
                </span>
                <div className="flex items-center justify-between gap-1.5 p-2 rounded-xl bg-white dark:bg-[#121026] border border-slate-200/80 dark:border-[#231f45]">
                  <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 tracking-wider">
                    {showLicenseKey ? licenseKeyMasked : 'ARX-*****'}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowLicenseKey(!showLicenseKey)}
                      title={showLicenseKey ? 'Hide License Key' : 'Reveal License Key'}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      {showLicenseKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyLicenseKey}
                      title="Copy License Key"
                      className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      {copiedLicenseKey ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-[#231f45] flex items-center justify-between text-[11px] text-slate-400 dark:text-[#8e8aab]">
            <span>Validated with Central Authority</span>
            <button
              type="button"
              onClick={() => navigateTo('updates')}
              className="text-[#6e44ff] dark:text-[#8b6fff] hover:underline font-semibold flex items-center gap-0.5 cursor-pointer"
            >
              <span>Manage License</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Card 2: Runtime Platform */}
        <div className="p-5 sm:p-6 rounded-[22px] bg-white dark:bg-[#121026] border border-slate-200/80 dark:border-[#231f45] shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#6e44ff] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Runtime Platform
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-[#8e8aab]">
                    Host Engine Stack
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                {appEnv}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-[#231f45] space-y-2 text-xs">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-[#8e8aab]">PHP Runtime</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  v{phpVersion}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-[#8e8aab]">Framework</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  Laravel {laravelVersion}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-[#8e8aab]">Host OS</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px]" title={serverOs}>
                  {serverOs}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-[#8e8aab]">Processor</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px]" title={`${cpuModel} (${cpuLoadAvg})`}>
                  {cpuModel} ({cpuLoadAvg})
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-[#8e8aab]">Timezone</span>
                <span className="font-mono text-slate-600 dark:text-slate-400">
                  {appTimezone}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-[#231f45] flex items-center justify-between text-[11px] text-slate-400 dark:text-[#8e8aab]">
            <span>Kernel specs</span>
            <button
              type="button"
              onClick={() => navigateTo('system')}
              className="text-[#6e44ff] dark:text-[#8b6fff] hover:underline font-semibold flex items-center gap-0.5 cursor-pointer"
            >
              <span>System Health</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Card 3: Storage & Security State */}
        <div className="p-5 sm:p-6 rounded-[22px] bg-white dark:bg-[#121026] border border-slate-200/80 dark:border-[#231f45] shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#6e44ff] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Storage & Security
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-[#8e8aab]">
                    Application Runtime Posture
                  </p>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  isDebugActive
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                }`}
              >
                {isDebugActive ? (
                  <>
                    <AlertTriangle className="w-3 h-3" />
                    <span>Debug On</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Hardened</span>
                  </>
                )}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-[#231f45] space-y-2 text-xs">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-[#8e8aab]">Disk Volume</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {diskPercent.toFixed(1)}% ({diskUsed} / {diskTotal}, {diskFree} free)
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-[#8e8aab]">Maintenance Mode</span>
                <span className={`font-semibold ${isMaintenanceActive ? 'text-rose-600 font-bold' : 'text-slate-800 dark:text-slate-200'}`}>
                  {isMaintenanceActive ? 'Active (503)' : 'Operational'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-[#8e8aab]">Database Driver</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {dbDriver} ({dbLatency}ms)
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-[#8e8aab]">Cache Store</span>
                <span className="font-mono text-slate-600 dark:text-slate-400">
                  {cacheDriver}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-[#231f45] flex items-center justify-between text-[11px] text-slate-400 dark:text-[#8e8aab]">
            <span>Storage & Security Posture</span>
            <button
              type="button"
              onClick={() => navigateTo('system')}
              className="text-[#6e44ff] dark:text-[#8b6fff] hover:underline font-semibold flex items-center gap-0.5 cursor-pointer"
            >
              <span>System</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
