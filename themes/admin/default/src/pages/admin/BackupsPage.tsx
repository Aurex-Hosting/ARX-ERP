import React, { useEffect, useState, useRef } from 'react';
import {
  Archive,
  Database,
  HardDrive,
  Download,
  RotateCcw,
  Trash2,
  Plus,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileArchive,
  FolderArchive,
  Clock,
  ShieldAlert,
  Search,
  X,
  Info,
  Check,
  Sliders,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface BackupItem {
  filename: string;
  path: string;
  type: 'full' | 'db' | 'files';
  size_bytes: number;
  size_formatted: string;
  created_at: string;
  created_at_human: string;
  created_by: string;
  notes: string | null;
  checksum: string;
  tables_count: number | null;
  records_count: number | null;
  files_count: number | null;
  db_driver: string;
  arx_version: string;
}

interface BackupConfig {
  auto_backup_enabled: boolean;
  schedule: string;
  time?: string;
  timezone?: string;
  last_auto_backup_at?: string | null;
  backup_type: 'full' | 'db' | 'files';
  retention_count: number;
  storage_driver: string;
  backup_dir: string;
}

interface CustomCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  title?: string;
}

const CustomCheckbox: React.FC<CustomCheckboxProps> = ({
  checked,
  indeterminate = false,
  onChange,
  title,
}) => {
  return (
    <label
      title={title}
      className="relative inline-flex items-center justify-center cursor-pointer select-none group w-5 h-5"
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="checkbox"
        checked={checked}
        ref={(el) => {
          if (el) el.indeterminate = indeterminate;
        }}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <div
        className={`w-[18px] h-[18px] rounded-md flex items-center justify-center transition-all duration-150 ${
          checked || indeterminate
            ? 'bg-violet-600 text-white shadow-xs shadow-violet-600/30'
            : 'bg-slate-100 dark:bg-slate-800 text-transparent border border-slate-300/80 dark:border-slate-700 group-hover:border-violet-500 group-hover:bg-slate-200 dark:group-hover:bg-slate-750'
        }`}
      >
        {checked && <Check className="w-3 h-3 stroke-[3]" />}
        {!checked && indeterminate && <div className="w-2 h-0.5 bg-white rounded-full" />}
      </div>
    </label>
  );
};

export const BackupsPage: React.FC = () => {
  const { user } = useAuth();

  // Permission Checks
  const isSuperAdmin = Boolean(user?.is_super_admin);
  const perms = (user?.permissions as string[]) || [];
  const hasPerm = (p: string) => isSuperAdmin || perms.includes(p);

  const canView = hasPerm('backups.view');
  const canCreate = hasPerm('backups.create');
  const canDownload = hasPerm('backups.download');
  const canRestore = hasPerm('backups.restore');
  const canDelete = hasPerm('backups.delete');

  // State
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'full' | 'db' | 'files'>('all');
  const [selectedFilenames, setSelectedFilenames] = useState<string[]>([]);

  // Config State
  const [config, setConfig] = useState<BackupConfig | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // Modals & Action States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingType, setCreatingType] = useState<'full' | 'db' | 'files'>('full');
  const [creatingNotes, setCreatingNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [restoreTarget, setRestoreTarget] = useState<BackupItem | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgressStep, setRestoreProgressStep] = useState<string>('');
  const [restoreSuccessResult, setRestoreSuccessResult] = useState<any>(null);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploadingRestore, setIsUploadingRestore] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  // Delete Confirmation Modal State
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'single' | 'batch';
    backup?: BackupItem;
    filenames: string[];
  }>({
    isOpen: false,
    type: 'single',
    filenames: [],
  });
  const [isDeletingBackup, setIsDeletingBackup] = useState(false);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Fetch Backups
  const fetchBackups = async () => {
    if (!canView) return;
    try {
      setLoading(true);
      const res = await api.get('/admin/backups');
      setBackups(res.data.backups || []);
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to fetch backups list');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Config
  const fetchConfig = async () => {
    if (!canView) return;
    try {
      const res = await api.get('/admin/backups/config');
      setConfig(res.data.config || null);
    } catch (err) {
      console.error('Failed to load backup config:', err);
    }
  };

  useEffect(() => {
    fetchBackups();
    fetchConfig();
  }, [canView]);

  // Create Backup
  const handleCreateBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate) return;

    try {
      setIsCreating(true);
      const res = await api.post('/admin/backups', {
        type: creatingType,
        notes: creatingNotes || null,
      });

      showNotification('success', res.data.message || 'Backup created successfully!');
      setShowCreateModal(false);
      setCreatingNotes('');
      await fetchBackups();
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to create backup archive');
    } finally {
      setIsCreating(false);
    }
  };

  // Download Backup
  const handleDownload = async (filename: string) => {
    if (!canDownload) return;
    try {
      const response = await api.get(`/admin/backups/${encodeURIComponent(filename)}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to download backup archive');
    }
  };

  // Quick Restore
  const handleExecuteRestore = async () => {
    if (!restoreTarget || !canRestore) return;

    try {
      setIsRestoring(true);
      setRestoreProgressStep('Verifying archive integrity and creating safety rollback point...');

      setTimeout(() => {
        setRestoreProgressStep('Restoring database schemas and records...');
      }, 700);

      setTimeout(() => {
        setRestoreProgressStep('Synchronizing storage files & clearing system caches...');
      }, 1400);

      const res = await api.post(`/admin/backups/${encodeURIComponent(restoreTarget.filename)}/restore`);

      setRestoreSuccessResult(res.data.result);
      showNotification('success', 'System restored successfully! All caches re-synchronized.');
      await fetchBackups();
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Restore failed');
      setRestoreTarget(null);
    } finally {
      setIsRestoring(false);
    }
  };

  // Upload and Restore
  const handleUploadAndRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !canRestore) return;

    const formData = new FormData();
    formData.append('file', uploadFile);

    try {
      setIsUploadingRestore(true);
      const res = await api.post('/admin/backups/upload-restore', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      showNotification('success', res.data.message || 'Uploaded backup restored successfully!');
      setShowUploadModal(false);
      setUploadFile(null);
      await fetchBackups();
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Upload & restore failed');
    } finally {
      setIsUploadingRestore(false);
    }
  };

  // Prompt Single Delete Modal
  const promptDeleteBackup = (backup: BackupItem) => {
    if (!canDelete) return;
    setDeleteModal({
      isOpen: true,
      type: 'single',
      backup,
      filenames: [backup.filename],
    });
  };

  // Prompt Batch Delete Modal
  const promptBatchDelete = () => {
    if (!canDelete || selectedFilenames.length === 0) return;
    setDeleteModal({
      isOpen: true,
      type: 'batch',
      filenames: [...selectedFilenames],
    });
  };

  // Confirm Delete Action (Handles both single and batch delete)
  const handleConfirmDelete = async () => {
    if (!canDelete || deleteModal.filenames.length === 0) return;

    setIsDeletingBackup(true);
    try {
      if (deleteModal.type === 'single') {
        const filename = deleteModal.filenames[0];
        await api.delete(`/admin/backups/${encodeURIComponent(filename)}`);
        showNotification('success', `Backup '${filename}' deleted successfully.`);
        setSelectedFilenames((prev) => prev.filter((f) => f !== filename));
      } else {
        const res = await api.post('/admin/backups/batch-delete', {
          filenames: deleteModal.filenames,
        });
        showNotification('success', res.data.message || 'Selected backups deleted successfully.');
        setSelectedFilenames([]);
      }
      setDeleteModal({ isOpen: false, type: 'single', filenames: [] });
      await fetchBackups();
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to delete backup');
    } finally {
      setIsDeletingBackup(false);
    }
  };

  // Save Config
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config || !canCreate) return;

    try {
      setSavingConfig(true);
      await api.put('/admin/backups/config', {
        auto_backup_enabled: config.auto_backup_enabled,
        schedule: config.schedule,
        time: config.time || '00:00',
        backup_type: config.backup_type,
        retention_count: config.retention_count,
      });

      showNotification('success', 'Backup configuration and retention settings updated.');
      setShowConfigModal(false);
      await fetchBackups();
      await fetchConfig();
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to update settings');
    } finally {
      setSavingConfig(false);
    }
  };

  // Calculations
  const totalSizeBytes = backups.reduce((acc, b) => acc + b.size_bytes, 0);
  const formatTotalSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let val = bytes;
    let i = 0;
    while (val >= 1024 && i < units.length - 1) {
      val /= 1024;
      i++;
    }
    return `${val.toFixed(2)} ${units[i]}`;
  };

  // Filtered List
  const filteredBackups = backups.filter((b) => {
    const matchesType = filterType === 'all' || b.type === filterType;
    const matchesSearch =
      b.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.notes && b.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  if (!canView) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 rounded-3xl bg-white dark:bg-slate-900 shadow-sm text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Access Denied</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
          You do not have permission to view or manage system backups. Contact your system administrator to assign the <code className="font-mono text-[11px]">backups.view</code> permission.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-xs font-semibold backdrop-blur-md transition-all animate-in slide-in-from-bottom-4 ${
            notification.type === 'success'
              ? 'bg-emerald-500/90 text-white shadow-emerald-500/20'
              : 'bg-rose-500/90 text-white shadow-rose-500/20'
          }`}
        >
          {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header & Main Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Archive className="w-6 h-6 text-violet-600 dark:text-violet-400 shrink-0" />
            <span>Backup & Disaster Recovery</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Generate atomic database dumps, archive storage uploads, execute quick restores, and configure automated retention.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => fetchBackups()}
            title="Refresh Backups"
            className="p-2.5 rounded-xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shadow-xs cursor-pointer transition-colors shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {canCreate && (
            <button
              onClick={() => setShowConfigModal(true)}
              className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap shrink-0"
            >
              <Sliders className="w-3.5 h-3.5 text-violet-500" />
              <span>Retention & Auto Policy</span>
            </button>
          )}

          {canRestore && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload & Restore</span>
            </button>
          )}

          {canCreate && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-md shadow-violet-500/20 flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Create Backup</span>
            </button>
          )}
        </div>
      </div>

      {/* Read-Only Banner if lacks create/restore */}
      {!canCreate && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>
            <strong>Read-Only Access:</strong> You have permission to view backup records, but lack privileges to generate new backups or restore system checkpoints.
          </span>
        </div>
      )}

      {/* Automated Backup Policy Banner */}
      {config && (
        <div
          className={`p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all ${
            config.auto_backup_enabled
              ? 'bg-emerald-500/10 text-emerald-950 dark:text-emerald-200 shadow-2xs'
              : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                config.auto_backup_enabled
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}
            >
              {config.auto_backup_enabled ? <CheckCircle2 className="w-5 h-5" /> : <Sliders className="w-4 h-4" />}
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-white block text-xs">
                {config.auto_backup_enabled ? (
                  <>
                    Auto-Backups are <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">Enabled</span> &amp; backing up{' '}
                    <span className="font-semibold">{config.schedule === 'hourly' ? 'every hour' : config.schedule === 'daily' ? 'every day' : config.schedule === 'weekly' ? 'every week (Sundays)' : 'every month'}</span>{' '}
                    @ <span className="font-mono font-bold bg-emerald-500/15 dark:bg-emerald-400/20 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded text-[11px]">{config.time || '00:00'}</span>
                    {config.timezone && (
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 ml-1.5">
                        ({config.timezone})
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    Auto-Backups are currently <span className="text-slate-500 dark:text-slate-400 font-bold">Disabled</span>
                  </>
                )}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                {config.auto_backup_enabled ? (
                  <>
                    Target: <span className="capitalize font-medium text-slate-800 dark:text-slate-200">{config.backup_type === 'db' ? 'Database Only' : config.backup_type === 'files' ? 'Storage Files Only' : 'Full System Snapshot'}</span> • Retention Policy: Keep last <span className="font-semibold text-slate-800 dark:text-slate-200">{config.retention_count}</span> archives automatically
                    {config.last_auto_backup_at && (
                      <> • Last executed: <span className="text-emerald-600 dark:text-emerald-400 font-medium">{new Date(config.last_auto_backup_at).toLocaleString()}</span></>
                    )}
                  </>
                ) : (
                  <>Configure automated background snapshots via the Retention Policy &amp; Auto-Schedule button.</>
                )}
              </span>
            </div>
          </div>

          {canCreate && (
            <button
              onClick={() => setShowConfigModal(true)}
              className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all cursor-pointer shrink-0 shadow-xs"
            >
              {config.auto_backup_enabled ? 'Modify Schedule' : 'Enable Schedule'}
            </button>
          )}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total Backups */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
            <Archive className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Total Backups</span>
            <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{backups.length}</span>
          </div>
        </div>

        {/* Card 2: Disk Usage */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Archive Storage</span>
            <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{formatTotalSize(totalSizeBytes)}</span>
          </div>
        </div>

        {/* Card 3: Last Backup */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Last Snapshot</span>
            <span className="text-xs font-bold text-slate-900 dark:text-white truncate block max-w-[140px]">
              {backups.length > 0 ? backups[0].created_at_human : 'No backups yet'}
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
        {/* Type Badges */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/70 rounded-xl">
          {(['all', 'full', 'db', 'files'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                filterType === t
                  ? 'bg-violet-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t === 'all' ? 'All Types' : t === 'db' ? 'Database Only' : t === 'files' ? 'Storage Files' : 'Full System'}
            </button>
          ))}
        </div>

        {/* Search & Bulk Delete */}
        <div className="flex items-center gap-2">
          {selectedFilenames.length > 0 && canDelete && (
            <button
              onClick={promptBatchDelete}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedFilenames.length})</span>
            </button>
          )}

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search backups by name or notes..."
              className="w-full sm:w-64 pl-9 pr-4 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
            />
          </div>
        </div>
      </div>

      {/* Backups Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-xs">Loading backup archives...</div>
        ) : filteredBackups.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Archive className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No backup archives found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Create your first database or full system snapshot to secure your enterprise records.
            </p>
            {canCreate && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Backup</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                  <th className="p-4 w-8">
                    <CustomCheckbox
                      checked={selectedFilenames.length === filteredBackups.length && filteredBackups.length > 0}
                      indeterminate={selectedFilenames.length > 0 && selectedFilenames.length < filteredBackups.length}
                      onChange={(checked) => {
                        if (checked) {
                          setSelectedFilenames(filteredBackups.map((b) => b.filename));
                        } else {
                          setSelectedFilenames([]);
                        }
                      }}
                      title="Select all backups"
                    />
                  </th>
                  <th className="p-4">Backup Archive</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Size & Content</th>
                  <th className="p-4">Timestamp & Author</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-slate-700 dark:text-slate-300">
                {filteredBackups.map((backup) => {
                  const isSelected = selectedFilenames.includes(backup.filename);
                  return (
                    <tr
                      key={backup.filename}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-violet-500/5' : ''
                      }`}
                    >
                      <td className="p-4">
                        <CustomCheckbox
                          checked={isSelected}
                          onChange={(checked) => {
                            if (checked) {
                              setSelectedFilenames((prev) => [...prev, backup.filename]);
                            } else {
                              setSelectedFilenames((prev) => prev.filter((f) => f !== backup.filename));
                            }
                          }}
                          title={`Select ${backup.filename}`}
                        />
                      </td>

                      {/* Filename & Notes */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              backup.type === 'full'
                                ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                                : backup.type === 'db'
                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {backup.type === 'full' ? (
                              <FileArchive className="w-4 h-4" />
                            ) : backup.type === 'db' ? (
                              <Database className="w-4 h-4" />
                            ) : (
                              <FolderArchive className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <span className="font-mono font-bold text-slate-900 dark:text-white text-xs block">
                              {backup.filename}
                            </span>
                            {backup.notes ? (
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5 line-clamp-1">
                                {backup.notes}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-mono">
                                SHA256: {backup.checksum?.substring(0, 16)}...
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            backup.type === 'full'
                              ? 'bg-violet-500/15 text-violet-700 dark:text-violet-300'
                              : backup.type === 'db'
                              ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
                              : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          {backup.type === 'full' ? 'Full Archive' : backup.type === 'db' ? 'Database SQL' : 'Storage Assets'}
                        </span>
                      </td>

                      {/* Size & Content Details */}
                      <td className="p-4">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-slate-900 dark:text-white text-xs block">
                            {backup.size_formatted}
                          </span>
                          <span className="text-[11px] text-slate-400 block">
                            {backup.tables_count !== null && `${backup.tables_count} tables (${backup.records_count || 0} rows)`}
                            {backup.files_count !== null && backup.files_count > 0 && ` • ${backup.files_count} files`}
                          </span>
                        </div>
                      </td>

                      {/* Timestamp & Created By */}
                      <td className="p-4">
                        <div className="space-y-0.5">
                          <span className="text-slate-900 dark:text-white text-xs block font-medium">
                            {backup.created_at_human}
                          </span>
                          <span className="text-[11px] text-slate-400 block">
                            By {backup.created_by}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canDownload && (
                            <button
                              onClick={() => handleDownload(backup.filename)}
                              title="Download Backup Archive"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer transition-colors shadow-xs"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {canRestore && (
                            <button
                              onClick={() => setRestoreTarget(backup)}
                              title="Quick Restore System from this Backup"
                              className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 cursor-pointer transition-colors shadow-xs"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              onClick={() => promptDeleteBackup(backup)}
                              title="Delete Archive"
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 cursor-pointer transition-colors shadow-xs"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE BACKUP                                                    */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden space-y-6 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                  <Archive className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Create System Backup</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBackup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Select Backup Scope:
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {/* Option 1: Full */}
                  <button
                    type="button"
                    onClick={() => setCreatingType('full')}
                    className={`p-3 rounded-xl text-left cursor-pointer transition-all ${
                      creatingType === 'full'
                        ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-900 dark:text-violet-200 ring-2 ring-violet-500/40'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750'
                    }`}
                  >
                    <FileArchive className="w-5 h-5 text-violet-500 mb-1.5" />
                    <span className="font-bold text-xs block">Full System</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">Database + Uploads</span>
                  </button>

                  {/* Option 2: Database Only */}
                  <button
                    type="button"
                    onClick={() => setCreatingType('db')}
                    className={`p-3 rounded-xl text-left cursor-pointer transition-all ${
                      creatingType === 'db'
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/40'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750'
                    }`}
                  >
                    <Database className="w-5 h-5 text-blue-500 mb-1.5" />
                    <span className="font-bold text-xs block">Database Only</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">SQL & Table data</span>
                  </button>

                  {/* Option 3: Files Only */}
                  <button
                    type="button"
                    onClick={() => setCreatingType('files')}
                    className={`p-3 rounded-xl text-left cursor-pointer transition-all ${
                      creatingType === 'files'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/40'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750'
                    }`}
                  >
                    <FolderArchive className="w-5 h-5 text-emerald-500 mb-1.5" />
                    <span className="font-bold text-xs block">Storage Files</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">Public assets & media</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Backup Description / Notes (Optional):
                </label>
                <input
                  type="text"
                  value={creatingNotes}
                  onChange={(e) => setCreatingNotes(e.target.value)}
                  placeholder="e.g. Pre-upgrade snapshot, Monthly routine backup"
                  className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed flex items-start gap-2.5">
                <Info className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                <span>
                  The archive will be generated atomically and sealed with a SHA256 checksum in <code className="font-mono text-[10px]">storage/app/backups</code>.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-md shadow-violet-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isCreating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating Archive...</span>
                    </>
                  ) : (
                    <>
                      <Archive className="w-3.5 h-3.5" />
                      <span>Generate Backup Now</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: QUICK RESTORE CONFIRMATION                                       */}
      {/* ========================================================================= */}
      {restoreTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden space-y-6 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Quick System Restore</h3>
              </div>
              {!isRestoring && (
                <button
                  onClick={() => {
                    setRestoreTarget(null);
                    setRestoreSuccessResult(null);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {restoreSuccessResult ? (
              <div className="space-y-4 text-center py-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Restore Completed Successfully!</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Database tables, records, and storage assets have been synchronized. All application caches and permissions have been re-indexed.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-left text-xs space-y-1.5 font-mono">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Archive:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{restoreSuccessResult.filename}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Tables Synced:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{restoreSuccessResult.restored_tables}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Files Synced:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{restoreSuccessResult.restored_files}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setRestoreTarget(null);
                    setRestoreSuccessResult(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-md shadow-violet-500/20 cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>Warning: Irreversible Overwrite</span>
                  </div>
                  <p className="leading-relaxed">
                    Restoring from this archive will overwrite current database records and replace active storage uploads with the snapshot taken on <strong>{restoreTarget.created_at_human}</strong>.
                  </p>
                </div>

                {/* Target details */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">File:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{restoreTarget.filename}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Type:</span>
                    <span className="font-semibold uppercase text-violet-600 dark:text-violet-400">{restoreTarget.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Archive Size:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{restoreTarget.size_formatted}</span>
                  </div>
                </div>

                {isRestoring && (
                  <div className="p-4 rounded-xl bg-violet-50 dark:bg-violet-950/30 text-center space-y-2">
                    <RefreshCw className="w-5 h-5 text-violet-600 animate-spin mx-auto" />
                    <p className="text-xs font-semibold text-violet-900 dark:text-violet-200">
                      {restoreProgressStep}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    disabled={isRestoring}
                    onClick={() => setRestoreTarget(null)}
                    className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isRestoring}
                    onClick={handleExecuteRestore}
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-md shadow-amber-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isRestoring ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Restoring System...</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Confirm & Restore Now</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: UPLOAD & RESTORE EXTERNAL ARCHIVE                                */}
      {/* ========================================================================= */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden space-y-6 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Upload &amp; Restore External Archive</h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadAndRestore} className="space-y-4">
              {/* Drag & drop upload area */}
              <div
                onClick={() => uploadInputRef.current?.click()}
                className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-700/80 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 flex flex-col items-center justify-center text-center cursor-pointer transition-all space-y-2"
              >
                <input
                  ref={uploadInputRef}
                  type="file"
                  accept=".zip,application/zip"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setUploadFile(e.target.files[0]);
                    }
                  }}
                />
                <div className="w-12 h-12 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                {uploadFile ? (
                  <div>
                    <span className="font-bold text-xs text-slate-900 dark:text-white block font-mono">
                      {uploadFile.name}
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      {(uploadFile.size / (1024 * 1024)).toFixed(2)} MB • Click to change file
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="font-bold text-xs text-slate-900 dark:text-white block">
                      Click to choose backup .zip archive
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Supports standard ARX-ERP full, database, and storage backup archives (max 512MB)
                    </span>
                  </div>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Uploading and confirming will immediately unpack the archive and restore its database and storage files.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!uploadFile || isUploadingRestore}
                  className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-md shadow-violet-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isUploadingRestore ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Uploading & Restoring...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Upload & Execute Restore</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: RETENTION & AUTOMATED BACKUP CONFIG                              */}
      {/* ========================================================================= */}
      {showConfigModal && config && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden space-y-6 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                  <Sliders className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Retention Policy &amp; Auto-Schedule</h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              {/* Enable Auto Backup */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <div>
                  <span className="font-bold text-xs text-slate-900 dark:text-white block">Automated Cron Backups</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    Execute background snapshots via system scheduler
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={config.auto_backup_enabled}
                  onClick={() => setConfig({ ...config, auto_backup_enabled: !config.auto_backup_enabled })}
                  className={`relative inline-flex h-6 w-11 p-0.5 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                    config.auto_backup_enabled ? 'bg-violet-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      config.auto_backup_enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Schedule Frequency & Execution Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Schedule Frequency:
                  </label>
                  <select
                    value={config.schedule}
                    onChange={(e) => setConfig({ ...config, schedule: e.target.value })}
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/30 font-medium"
                  >
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly (Sundays)</option>
                    <option value="monthly">Monthly (1st of month)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Execution Time (HH:MM):
                  </label>
                  <input
                    type="time"
                    value={config.time || '00:00'}
                    onChange={(e) => setConfig({ ...config, time: e.target.value })}
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/30 font-mono"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    {config.schedule === 'hourly'
                      ? `Triggered at minute :${config.time?.split(':')[1] || '00'}`
                      : `Configured in system timezone${config.timezone ? `: ${config.timezone}` : ''} (defined in .env)`}
                  </span>
                </div>
              </div>

              {/* Default Auto-Type & Retention Count */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Default Auto-Type:
                  </label>
                  <select
                    value={config.backup_type}
                    onChange={(e) => setConfig({ ...config, backup_type: e.target.value as any })}
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/30 font-medium"
                  >
                    <option value="full">Full System</option>
                    <option value="db">Database Only</option>
                    <option value="files">Storage Files Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Retention Policy (Keep Last N):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={config.retention_count}
                    onChange={(e) => setConfig({ ...config, retention_count: parseInt(e.target.value) || 10 })}
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/30 font-mono"
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                Archives older than the retention threshold will be pruned automatically to preserve disk space.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-md shadow-violet-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {savingConfig ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Policy...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Policy</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: DELETE BACKUP CONFIRMATION POPUP                                 */}
      {/* ========================================================================= */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden space-y-5 p-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-xs">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {deleteModal.type === 'single' ? 'Delete Backup Archive' : 'Delete Selected Backups'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {deleteModal.type === 'single' ? 'Confirm permanent archive deletion' : `Bulk removal of ${deleteModal.filenames.length} archives`}
                  </p>
                </div>
              </div>
              {!isDeletingBackup && (
                <button
                  onClick={() => setDeleteModal({ isOpen: false, type: 'single', filenames: [] })}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Warning Banner */}
            <div className="p-4 rounded-2xl bg-rose-500/10 text-rose-800 dark:text-rose-300 text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>Irreversible Action</span>
              </div>
              <p className="leading-relaxed">
                {deleteModal.type === 'single' ? (
                  <>
                    Are you sure you want to permanently delete backup{' '}
                    <span className="font-mono font-bold break-all text-rose-900 dark:text-rose-200">
                      '{deleteModal.backup?.filename || deleteModal.filenames[0]}'
                    </span>
                    ? Once deleted, this backup cannot be recovered.
                  </>
                ) : (
                  <>
                    Are you sure you want to permanently delete{' '}
                    <strong className="font-bold">{deleteModal.filenames.length} selected backup archives</strong>?
                    All selected snapshot files will be purged from storage.
                  </>
                )}
              </p>
            </div>

            {/* Target details (if single) */}
            {deleteModal.type === 'single' && deleteModal.backup && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Archive Name:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white text-[11px] truncate max-w-[220px]" title={deleteModal.backup.filename}>
                    {deleteModal.backup.filename}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Type:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300 capitalize">
                    {deleteModal.backup.type === 'full' ? 'Full System' : deleteModal.backup.type === 'db' ? 'Database Only' : 'Storage Files'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Size:</span>
                  <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                    {deleteModal.backup.size_formatted}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Created:</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {deleteModal.backup.created_at_human}
                  </span>
                </div>
              </div>
            )}

            {/* Target files preview (if batch) */}
            {deleteModal.type === 'batch' && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs">
                <div className="text-slate-500 dark:text-slate-400 mb-1.5 font-medium">Selected files ({deleteModal.filenames.length}):</div>
                <div className="max-h-32 overflow-y-auto space-y-1 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                  {deleteModal.filenames.map((name) => (
                    <div key={name} className="truncate p-1 rounded bg-slate-100 dark:bg-slate-800/80">
                      {name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
              <button
                type="button"
                disabled={isDeletingBackup}
                onClick={() => setDeleteModal({ isOpen: false, type: 'single', filenames: [] })}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingBackup}
                onClick={handleConfirmDelete}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-md shadow-rose-500/20 transition-all disabled:opacity-50"
              >
                {isDeletingBackup ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>
                      {deleteModal.type === 'single' ? 'Permanently Delete' : `Delete (${deleteModal.filenames.length}) Archives`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
