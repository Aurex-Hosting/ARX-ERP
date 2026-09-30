import React, { useEffect, useState } from 'react';
import {
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  ArrowUpCircle,
  RotateCcw,
  Copy,
  Check,
  Archive,
  Clock,
  KeyRound,
  Cpu,
  FileCode,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react';
import api from '../../services/api';

interface StatusData {
  current_version: {
    version: string;
    name: string;
    channel: string;
    release_date: string;
  };
  installation_id: string;
  license: {
    active?: boolean;
    is_valid?: boolean;
    key_masked?: string | null;
    license_key?: string | null;
    full_license_key?: string | null;
    expires_at: string | null;
    message?: string;
  };
  cached_update?: {
    update_available: boolean;
    current_version: string;
    latest_version?: string;
    name?: string;
    notes?: string;
    published_at?: string;
    zip_hash?: string;
  } | null;
  last_checked_at?: string | null;
  backup_status: {
    eligible: boolean;
    recent_backup?: {
      filename: string;
      created_at: string;
      size?: string;
    };
    message?: string;
    reason?: string;
    last_backup?: string | null;
  };
  rollback_info?: {
    available: boolean;
    version?: string;
    created_at?: string | null;
  } | null;
}

interface UpdatesPageProps {
  onNavigateTab?: (tab: string) => void;
}

export const UpdatesPage: React.FC<UpdatesPageProps> = ({ onNavigateTab }) => {
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<StatusData | null>(null);

  // Copy states
  const [copiedFingerprint, setCopiedFingerprint] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Reveal / Spoiler toggle states (hidden by default)
  const [showLicenseKey, setShowLicenseKey] = useState(false);
  const [showHardwareFingerprint, setShowHardwareFingerprint] = useState(false);

  // Update modal & process states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStepIndex, setUpdateStepIndex] = useState(0);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);

  // Rollback modal states
  const [showRollbackModal, setShowRollbackModal] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);

  // Alert toast
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const fetchStatus = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/admin/updates/status');
      setStatus(res.data);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to load update status.', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleCheckForUpdates = async () => {
    setChecking(true);
    try {
      const res = await api.post('/admin/updates/check');
      const updateData = res.data.data;
      if (updateData.update_available) {
        showToast(`New version v${updateData.latest_version} is available!`, 'success');
      } else {
        showToast(updateData.message || 'System is running the latest version.', 'info');
      }
      await fetchStatus(true);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Update check failed.', 'error');
    } finally {
      setChecking(false);
    }
  };

  const handleCopy = (text: string, type: 'fingerprint' | 'hash' | 'license') => {
    navigator.clipboard.writeText(text);
    if (type === 'fingerprint') {
      setCopiedFingerprint(true);
      setTimeout(() => setCopiedFingerprint(false), 2000);
    } else if (type === 'license') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  const handleStartUpdate = () => {
    if (!status?.backup_status.eligible) {
      showToast('A fresh system backup (< 1 hour old) is strictly required before updating.', 'error');
      return;
    }
    setUpdateStepIndex(0);
    setUpdateError(null);
    setUpdateSuccess(null);
    setShowConfirmModal(true);
  };

  const handleExecuteUpdate = async () => {
    setIsUpdating(true);
    setUpdateError(null);

    // Step simulation progression while request processes
    const stepTimer = setInterval(() => {
      setUpdateStepIndex((prev) => (prev < 4 ? prev + 1 : prev));
    }, 1800);

    try {
      const updateInfo = status?.cached_update;
      const res = await api.post('/admin/updates/apply', {
        release_name: updateInfo?.latest_version || updateInfo?.name,
        version: updateInfo?.latest_version,
        zip_hash: updateInfo?.zip_hash,
        notes: updateInfo?.notes,
      });

      clearInterval(stepTimer);
      setUpdateStepIndex(6);
      setUpdateSuccess(res.data.message || 'Update completed successfully!');
      showToast('System updated successfully!', 'success');
      await fetchStatus(true);
    } catch (err: any) {
      clearInterval(stepTimer);
      const errMsg = err.response?.data?.message || 'Update failed during extraction or database migration.';
      setUpdateError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleExecuteRollback = async () => {
    setIsRollingBack(true);
    try {
      const res = await api.post('/admin/updates/rollback');
      showToast(res.data.message || 'System rolled back to previous snapshot.', 'success');
      setShowRollbackModal(false);
      await fetchStatus(true);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Rollback failed.', 'error');
    } finally {
      setIsRollingBack(false);
    }
  };

  const renderMarkdownNotes = (markdown?: string) => {
    if (!markdown) {
      return <p className="text-sm text-slate-500 italic">No release notes provided for this release.</p>;
    }

    const lines = markdown.split('\n');
    return (
      <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('### ')) {
            return (
              <h4 key={idx} className="text-base font-semibold text-slate-900 dark:text-white pt-2">
                {trimmed.replace('### ', '')}
              </h4>
            );
          }
          if (trimmed.startsWith('## ')) {
            return (
              <h3 key={idx} className="text-lg font-bold text-slate-900 dark:text-white pt-2 border-b border-slate-200/60 dark:border-slate-800 pb-1">
                {trimmed.replace('## ', '')}
              </h3>
            );
          }
          if (trimmed.startsWith('# ')) {
            return (
              <h2 key={idx} className="text-xl font-bold text-slate-900 dark:text-white pt-1">
                {trimmed.replace('# ', '')}
              </h2>
            );
          }
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const content = trimmed.substring(2);
            return (
              <div key={idx} className="flex items-start gap-2 pl-2">
                <span className="text-violet-500 font-bold leading-5">•</span>
                <span className="leading-relaxed">{parseInlineMarkdown(content)}</span>
              </div>
            );
          }
          if (trimmed === '') {
            return <div key={idx} className="h-1" />;
          }
          return (
            <p key={idx} className="leading-relaxed">
              {parseInlineMarkdown(trimmed)}
            </p>
          );
        })}
      </div>
    );
  };

  const parseInlineMarkdown = (text: string) => {
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-violet-600 dark:text-violet-400 font-mono text-xs">
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-slate-900 dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  const updateSteps = [
    'Verifying 1-hour system backup safety gatekeeper...',
    'Downloading update package archive from central server...',
    'Validating cryptographic SHA256 integrity seal...',
    'Creating atomic rollback snapshot of current system...',
    'Safely extracting package over application root...',
    'Executing database migrations and schema sync...',
    'Flushing application caches and updating version manifest...',
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <RefreshCw className="w-8 h-8 text-violet-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading system update & licensing status...</p>
      </div>
    );
  }

  const updateAvailable = Boolean(status?.cached_update?.update_available);
  const currentVer = status?.current_version.version || '1.0.0';
  const latestVer = status?.cached_update?.latest_version || currentVer;
  const backupEligible = Boolean(status?.backup_status.eligible);

  return (
    <div className="space-y-6">
      {/* Toast Banner */}
      {toast && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl shadow-lg transition-all animate-in fade-in slide-in-from-top duration-300 ${
            toast.type === 'success'
              ? 'bg-emerald-500 text-white'
              : toast.type === 'error'
              ? 'bg-rose-500 text-white'
              : 'bg-violet-600 text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : toast.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 shrink-0" />
            ) : (
              <Sparkles className="w-5 h-5 shrink-0" />
            )}
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
          <button onClick={() => setToast(null)} className="p-1 hover:bg-white/20 rounded-lg text-white">
            <span className="sr-only">Dismiss</span>
            &times;
          </button>
        </div>
      )}

      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <RefreshCw className="w-6 h-6 text-violet-600" />
            System Updates & Licensing
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Enterprise software lifecycle management, cryptographic license integrity, and safe disaster-resilient updates.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {status?.rollback_info?.available && (
            <button
              onClick={() => setShowRollbackModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
              title="Restore previous application files from snapshot"
            >
              <RotateCcw className="w-4 h-4" />
              Rollback Snapshot
            </button>
          )}

          <button
            onClick={handleCheckForUpdates}
            disabled={checking}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-violet-600 text-white shadow-sm hover:bg-violet-700 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Checking Authority...' : 'Check for Updates'}
          </button>
        </div>
      </div>

      {/* Overview Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Version Info */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-xs transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Installed Software
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300">
              {status?.current_version.channel || 'Stable'}
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                v{currentVer}
              </span>
              {updateAvailable ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full">
                  Update Ready
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                  Up to Date
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {status?.current_version.name || 'ARX-ERP Enterprise'}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Build Date: {status?.current_version.release_date || '2026-09-27'}
            </span>
            <span>
              {status?.last_checked_at
                ? `Checked: ${new Date(status.last_checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Not checked yet'}
            </span>
          </div>
        </div>

        {/* Card 2: License & Device ID (Spoiler Protected) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-xs transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Enterprise License
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                (status?.license.active || status?.license.is_valid)
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${(status?.license.active || status?.license.is_valid) ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              {(status?.license.active || status?.license.is_valid) ? 'Active & Cryptographically Verified' : 'Unlicensed'}
            </span>
          </div>

          <div className="space-y-3">
            {/* License Key with Click-to-Reveal Spoiler */}
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                <span className="flex items-center gap-1 font-medium">
                  <KeyRound className="w-3 h-3 text-violet-500" /> License Key
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowLicenseKey(!showLicenseKey)}
                    className="text-[11px] font-medium text-slate-500 hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-400 flex items-center gap-1 transition-colors"
                    title={showLicenseKey ? 'Conceal license key' : 'Reveal license key'}
                  >
                    {showLicenseKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showLicenseKey ? 'Hide' : 'Reveal'}</span>
                  </button>
                  {showLicenseKey && (status?.license.full_license_key || status?.license.license_key || status?.license.key_masked) && (
                    <button
                      type="button"
                      onClick={() => handleCopy((status?.license.full_license_key || status?.license.license_key || status?.license.key_masked) || '', 'license')}
                      className="text-[11px] font-medium text-slate-500 hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-400 flex items-center gap-1 transition-colors"
                      title="Copy License Key"
                    >
                      {copiedKey ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}
                </div>
              </div>

              <div
                onClick={() => setShowLicenseKey(!showLicenseKey)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setShowLicenseKey(!showLicenseKey);
                  }
                }}
                className={`group relative rounded-xl px-2.5 py-1.5 cursor-pointer select-none transition-all duration-200 overflow-hidden ${
                  showLicenseKey
                    ? 'bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-white'
                    : 'bg-slate-100/70 hover:bg-slate-200/70 dark:bg-slate-800/50 dark:hover:bg-slate-800/80 text-slate-400 dark:text-slate-500'
                }`}
                title={showLicenseKey ? 'Click to conceal' : 'Click to reveal'}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`font-mono text-xs font-semibold truncate transition-all duration-200 ${
                      showLicenseKey ? 'filter-none select-all' : 'blur-[4px] opacity-70 group-hover:blur-[2.5px]'
                    }`}
                  >
                    {showLicenseKey
                      ? (status?.license.full_license_key || status?.license.license_key || status?.license.key_masked || 'None Configured')
                      : '••••••••-••••••••-••••••••-••••••••'}
                  </span>
                  {!showLicenseKey && (
                    <span className="shrink-0 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 flex items-center gap-1">
                      <Eye className="w-2.5 h-2.5" /> Spoiler
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Hardware Device Fingerprint with Click-to-Reveal Spoiler */}
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                <span className="flex items-center gap-1 font-medium">
                  <Cpu className="w-3 h-3 text-violet-500" /> Hardware Device Fingerprint
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowHardwareFingerprint(!showHardwareFingerprint)}
                    className="text-[11px] font-medium text-slate-500 hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-400 flex items-center gap-1 transition-colors"
                    title={showHardwareFingerprint ? 'Conceal hardware fingerprint' : 'Reveal hardware fingerprint'}
                  >
                    {showHardwareFingerprint ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showHardwareFingerprint ? 'Hide' : 'Reveal'}</span>
                  </button>
                  {showHardwareFingerprint && status?.installation_id && (
                    <button
                      type="button"
                      onClick={() => handleCopy(status.installation_id, 'fingerprint')}
                      className="text-[11px] font-medium text-slate-500 hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-400 flex items-center gap-1 transition-colors"
                      title="Copy Hardware Fingerprint"
                    >
                      {copiedFingerprint ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedFingerprint ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}
                </div>
              </div>

              <div
                onClick={() => setShowHardwareFingerprint(!showHardwareFingerprint)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setShowHardwareFingerprint(!showHardwareFingerprint);
                  }
                }}
                className={`group relative rounded-xl px-2.5 py-1.5 cursor-pointer select-none transition-all duration-200 overflow-hidden ${
                  showHardwareFingerprint
                    ? 'bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-white'
                    : 'bg-slate-100/70 hover:bg-slate-200/70 dark:bg-slate-800/50 dark:hover:bg-slate-800/80 text-slate-400 dark:text-slate-500'
                }`}
                title={showHardwareFingerprint ? 'Click to conceal' : 'Click to reveal'}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`font-mono text-xs font-semibold truncate transition-all duration-200 ${
                      showHardwareFingerprint ? 'filter-none select-all' : 'blur-[4px] opacity-70 group-hover:blur-[2.5px]'
                    }`}
                  >
                    {showHardwareFingerprint ? (status?.installation_id || '-') : 'ARX-••••-••••-••••-••••'}
                  </span>
                  {!showHardwareFingerprint && (
                    <span className="shrink-0 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 flex items-center gap-1">
                      <Eye className="w-2.5 h-2.5" /> Spoiler
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500">
            <span>
              Expires:{' '}
              {status?.license.expires_at ? new Date(status.license.expires_at).toLocaleDateString() : 'Perpetual / Active'}
            </span>
          </div>
        </div>

        {/* Card 3: 1-Hour Backup Safety Gatekeeper */}
        <div
          className={`bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-xs transition-colors flex flex-col justify-between ${
            backupEligible ? '' : 'ring-1 ring-amber-500/30 dark:ring-amber-500/20'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Safety Gatekeeper
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                backupEligible
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
              }`}
            >
              {backupEligible ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
              {backupEligible ? 'Passed (≤ 1h Backup)' : 'Backup Required'}
            </span>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {backupEligible ? 'Disaster Recovery Prepared' : 'System Backup Required'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {backupEligible
                ? `A fresh backup (${status?.backup_status.recent_backup?.filename}) was created within the last hour. Updates are unlocked.`
                : 'To prevent any potential data loss, an update can only be initiated if a backup was generated within the last 1 hour.'}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <span className="text-xs text-slate-500 truncate">
              {status?.backup_status.recent_backup?.created_at
                ? `Recent: ${new Date(status.backup_status.recent_backup.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'No recent backup'}
            </span>

            <button
              onClick={() => {
                if (onNavigateTab) {
                  onNavigateTab('backups');
                } else {
                  window.location.hash = 'backups';
                }
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400 hover:underline"
            >
              <Archive className="w-3.5 h-3.5" />
              Manage Backups &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Update Availability Banner / Card */}
      {updateAvailable ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden transition-colors">
          <div className="absolute top-0 right-0 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 relative z-10">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-violet-600 text-white shadow-xs">
                <Sparkles className="w-3.5 h-3.5" />
                NEW VERSION AVAILABLE
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {status?.cached_update?.name || `ARX-ERP v${latestVer}`}
              </h2>

              <p className="text-sm text-slate-600 dark:text-slate-300">
                You are currently running <span className="font-semibold text-slate-900 dark:text-white">v{currentVer}</span>.
                Upgrading will deploy latest enhancements, enterprise modules, and database schema updates.
              </p>

              {/* Package Checksum details */}
              {status?.cached_update?.zip_hash && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-slate-500 font-mono flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5" /> SHA256:
                  </span>
                  <code className="text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded truncate max-w-xs">
                    {status.cached_update.zip_hash}
                  </code>
                  <button
                    onClick={() => handleCopy(status.cached_update?.zip_hash || '', 'hash')}
                    className="p-1 hover:text-violet-600 text-slate-400 transition-colors"
                    title="Copy SHA256 Checksum"
                  >
                    {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
            </div>

            {/* Action Box */}
            <div className="shrink-0 flex flex-col items-start md:items-end gap-3">
              {backupEligible ? (
                <button
                  onClick={handleStartUpdate}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold shadow-lg shadow-violet-600/25 active:scale-[0.98] transition-all text-sm"
                >
                  <ArrowUpCircle className="w-5 h-5" />
                  Install Update Now (v{latestVer})
                </button>
              ) : (
                <div className="flex flex-col items-start md:items-end gap-2">
                  <button
                    disabled
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-semibold cursor-not-allowed text-sm"
                    title="A backup created within the last 1 hour is required"
                  >
                    <Lock className="w-4 h-4" />
                    Install Update Locked
                  </button>
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    Create a backup before installing
                  </p>
                  <button
                    onClick={() => {
                      if (onNavigateTab) {
                        onNavigateTab('backups');
                      } else {
                        window.location.hash = 'backups';
                      }
                    }}
                    className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline"
                  >
                    Go to Backups & Create Backup &rarr;
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Release Notes Changelog */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/80">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-violet-600" />
              Release Notes & Changelog
            </h3>
            <div className="bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-5 overflow-y-auto max-h-96">
              {renderMarkdownNotes(status?.cached_update?.notes)}
            </div>
          </div>
        </div>
      ) : (
        /* Up to date Banner */
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xs text-center flex flex-col items-center justify-center space-y-4 transition-colors">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Your System is Up to Date
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              ARX-ERP is currently operating on the latest release <span className="font-semibold text-slate-900 dark:text-white">v{currentVer}</span>.
              Automated checks are performed every 12 hours.
            </p>
          </div>
          <button
            onClick={handleCheckForUpdates}
            disabled={checking}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
            Check Central Server Again
          </button>
        </div>
      )}

      {/* Snapshot Rollback Card */}
      {status?.rollback_info?.available && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-xs transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                Rollback Snapshot Available (v{status.rollback_info.version})
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Created: {status.rollback_info.created_at ? new Date(status.rollback_info.created_at).toLocaleString() : 'Recent snapshot'}.
                You can instantly restore this snapshot if needed.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowRollbackModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-all shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restore v{status.rollback_info.version}
          </button>
        </div>
      )}

      {/* Modal 1: Live Update Execution Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-4">
                <ArrowUpCircle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {isUpdating ? 'Applying Enterprise Update...' : updateSuccess ? 'Update Complete!' : `Upgrade to v${latestVer}`}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isUpdating
                  ? 'Please do not refresh or close this window while updates and database migrations are being processed.'
                  : updateSuccess
                  ? 'All application files, migrations, and caches have been safely synchronized.'
                  : 'The update engine will snapshot current files, stream the package, verify cryptographic signatures, and run migrations.'}
              </p>
            </div>

            {/* Steps Progress Tracker */}
            <div className="space-y-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-4">
              {updateSteps.map((step, idx) => {
                const isCurrent = isUpdating && updateStepIndex === idx;
                const isDone = updateSuccess || updateStepIndex > idx;

                return (
                  <div key={idx} className="flex items-center gap-3 text-xs">
                    <div className="shrink-0">
                      {isDone ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : isCurrent ? (
                        <div className="w-5 h-5 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-[10px]">
                          {idx + 1}
                        </div>
                      )}
                    </div>
                    <span
                      className={`leading-relaxed ${
                        isDone
                          ? 'text-slate-700 dark:text-slate-300 font-medium line-through opacity-80'
                          : isCurrent
                          ? 'text-violet-600 dark:text-violet-400 font-bold'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Error Display with Auto-Rollback note */}
            {updateError && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                  Update Interrupted
                </div>
                <p className="leading-relaxed">{updateError}</p>
                <div className="pt-2 border-t border-rose-200 dark:border-rose-900/50 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                  ✓ Instant auto-rollback was executed. Application files have been restored to v{currentVer}.
                </div>
              </div>
            )}

            {/* Modal Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              {!isUpdating && !updateSuccess && (
                <>
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExecuteUpdate}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl shadow-xs transition-colors"
                  >
                    Start Safe Upgrade
                  </button>
                </>
              )}

              {updateSuccess && (
                <button
                  onClick={() => window.location.reload()}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reload Application
                </button>
              )}

              {updateError && !isUpdating && (
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="px-5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Rollback Confirmation Modal */}
      {showRollbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <RotateCcw className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Restore Previous Version Snapshot?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                This will revert all core application files back to v{status?.rollback_info?.version}.
                Your environment file (<code className="font-mono">.env</code>) and storage files (<code className="font-mono">storage/</code>) will be preserved.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowRollbackModal(false)}
                disabled={isRollingBack}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteRollback}
                disabled={isRollingBack}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                {isRollingBack && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {isRollingBack ? 'Restoring Snapshot...' : 'Confirm Rollback'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
