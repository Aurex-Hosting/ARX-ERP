import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Upload,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Power,
  Search,
  X,
  FileArchive,
  Layers,
  Sparkles,
  HardDrive,
} from 'lucide-react';
import api from '../../services/api';
import { ModuleItem } from '../../types';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

export const ModulesPage: React.FC = () => {
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [filterArea, setFilterArea] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uninstallConfirmModule, setUninstallConfirmModule] = useState<ModuleItem | null>(null);
  const [diskDeleteConfirmModule, setDiskDeleteConfirmModule] = useState<ModuleItem | null>(null);

  // Form State: Create
  const [formName, setFormName] = useState('');
  const [formArea, setFormArea] = useState<'dashboard' | 'admin' | 'shared'>('dashboard');
  const [formDescription, setFormDescription] = useState('');
  const [formAuthor, setFormAuthor] = useState('');
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Form State: Upload ZIP
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadAutoInstall, setUploadAutoInstall] = useState(true);
  const [uploadingZip, setUploadingZip] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchModules = async () => {
    try {
      const response = await api.get('/admin/modules');
      setModules(response.data.modules || []);
    } catch (err: any) {
      console.error('Failed to fetch modules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  // Install discovered module
  const handleInstall = async (slug: string) => {
    setActionLoading(slug);
    setStatusMessage(null);
    try {
      const res = await api.post(`/admin/modules/${slug}/install`);
      setStatusMessage({ type: 'success', text: res.data.message });
      await fetchModules();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to install module.',
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Toggle Enable / Disable
  const handleToggle = async (module: ModuleItem) => {
    setActionLoading(module.slug);
    setStatusMessage(null);
    try {
      if (module.is_enabled) {
        const res = await api.post(`/admin/modules/${module.slug}/disable`);
        setStatusMessage({ type: 'success', text: res.data.message });
      } else {
        const res = await api.post(`/admin/modules/${module.slug}/enable`);
        setStatusMessage({ type: 'success', text: res.data.message });
      }
      await fetchModules();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to toggle module status.',
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Export module as ZIP
  const handleExport = (slug: string) => {
    window.open(`/api/v1/admin/modules/${slug}/export`, '_blank');
  };

  // Uninstall Module Confirmation
  const handleConfirmUninstall = async () => {
    if (!uninstallConfirmModule) return;
    setActionLoading(uninstallConfirmModule.slug);
    try {
      const res = await api.delete(`/admin/modules/${uninstallConfirmModule.slug}`);
      setStatusMessage({ type: 'success', text: res.data.message });
      setUninstallConfirmModule(null);
      await fetchModules();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to uninstall module.',
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Delete from Disk Confirmation
  const handleConfirmDiskDelete = async () => {
    if (!diskDeleteConfirmModule) return;
    setActionLoading(diskDeleteConfirmModule.slug);
    try {
      const res = await api.delete(`/admin/modules/${diskDeleteConfirmModule.slug}/disk`);
      setStatusMessage({ type: 'success', text: res.data.message });
      setDiskDeleteConfirmModule(null);
      await fetchModules();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to delete module from filesystem.',
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Generate Starter Kit ZIP Submit
  const handleGenerateStarterZip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setStatusMessage({ type: 'error', text: 'Module name is required.' });
      return;
    }

    setSubmittingCreate(true);
    setStatusMessage(null);
    try {
      const response = await api.post(
        '/admin/modules/generate-starter',
        {
          name: formName.trim(),
          area: formArea,
          description: formDescription.trim() || undefined,
          author: formAuthor.trim() || undefined,
        },
        {
          responseType: 'blob',
        }
      );

      const blob = new Blob([response.data], { type: 'application/zip' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const cleanName = formName.trim().replace(/[^a-zA-Z0-9]/g, '');
      link.setAttribute('download', `Starter_${cleanName}_Module.zip`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      setStatusMessage({
        type: 'success',
        text: `Starter kit for '${formName.trim()}' generated & downloaded! Write your module logic, then click 'Upload ZIP' to install it.`,
      });
      setShowCreateModal(false);
      setFormName('');
      setFormDescription('');
      setFormAuthor('');
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to generate starter package.',
      });
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Upload ZIP Submit
  const handleUploadZip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setStatusMessage({ type: 'error', text: 'Please select a module .zip archive.' });
      return;
    }

    setUploadingZip(true);
    setStatusMessage(null);

    const formData = new FormData();
    formData.append('module_zip', selectedFile);
    formData.append('auto_install', uploadAutoInstall ? '1' : '0');

    try {
      const res = await api.post('/admin/modules/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setStatusMessage({ type: 'success', text: res.data.message });
      setShowUploadModal(false);
      setSelectedFile(null);
      await fetchModules();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to upload and extract module archive.',
      });
    } finally {
      setUploadingZip(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.zip') || file.type.includes('zip'))) {
      setSelectedFile(file);
    } else {
      setStatusMessage({ type: 'error', text: 'Please upload a valid .zip archive.' });
    }
  };

  // Filtered modules
  const filteredModules = modules.filter((m) => {
    if (filterArea !== 'all' && m.area !== filterArea) return false;
    if (filterStatus === 'installed' && (!m.is_installed || !m.is_enabled)) return false;
    if (filterStatus === 'disabled' && (!m.is_installed || m.is_enabled)) return false;
    if (filterStatus === 'uninstalled' && m.is_installed) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = m.name?.toLowerCase().includes(q);
      const matchSlug = m.slug?.toLowerCase().includes(q);
      const matchDesc = m.description?.toLowerCase().includes(q);
      return matchName || matchSlug || matchDesc;
    }
    return true;
  });

  // Calculate stats
  const totalCount = modules.length;
  const enabledCount = modules.filter((m) => m.is_installed && m.is_enabled).length;
  const disabledCount = modules.filter((m) => m.is_installed && !m.is_enabled).length;
  const uninstalledCount = modules.filter((m) => !m.is_installed).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Box className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            <span>Modules Manager</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Discover, scaffold, upload ZIP packages, and manage lifecycle states across ERP modules
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4 text-violet-500" />
            <span>Upload ZIP</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-500/20 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Generate Starter (.ZIP)</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">Total Packages</span>
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Box className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalCount}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Discovered on filesystem</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">Active & Enabled</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{enabledCount}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Running in active workspace</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">Disabled / Paused</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Power className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-500">{disabledCount}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Installed but suspended</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">Not Installed</span>
            <div className="p-2 rounded-xl bg-slate-500/10 text-slate-600 dark:text-slate-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-600 dark:text-slate-400">{uninstalledCount}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Awaiting installation</span>
        </div>
      </div>

      {/* Alert Status Banner */}
      {statusMessage && (
        <div
          className={`flex items-center justify-between p-4 rounded-2xl text-xs ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
          } animate-in fade-in slide-in-from-top-1`}
        >
          <div className="flex items-center gap-2.5">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer ml-4"
          >
            ×
          </button>
        </div>
      )}

      {/* Toolbar: Area Filters & Search */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Area Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 custom-scrollbar">
          {(
            [
              { id: 'all', label: 'All Areas' },
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'admin', label: 'Admin' },
              { id: 'shared', label: 'Shared' },
            ] as const
          ).map((area) => (
            <button
              key={area.id}
              onClick={() => setFilterArea(area.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium capitalize whitespace-nowrap transition-all cursor-pointer ${
                filterArea === area.id
                  ? 'bg-violet-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {area.label}
            </button>
          ))}
        </div>

        {/* Status Dropdown + Search */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-100 dark:bg-slate-950/60 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 border-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="installed">Active & Enabled</option>
            <option value="disabled">Disabled</option>
            <option value="uninstalled">Not Installed</option>
          </select>

          <div className="relative flex-1 md:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search modules..."
              className="w-full bg-slate-100 dark:bg-slate-950/60 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      </div>

      {/* Modules Catalog Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
        </div>
      ) : filteredModules.length === 0 ? (
        <div className="py-16 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-8 space-y-3">
          <Box className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No modules found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {searchQuery
              ? 'No modules match your search filter.'
              : 'Create a new module package or upload a .zip archive to extend your ERP.'}
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload ZIP</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-500 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Generate Starter (.ZIP)</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredModules.map((module) => {
            const isBusy = actionLoading === module.slug;

            return (
              <div
                key={module.slug}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-5 shadow-xs flex flex-col justify-between hover:border-slate-200 dark:hover:border-slate-700 transition-all group"
              >
                {/* Top Section */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400 shrink-0">
                        <Box className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                          {module.name}
                        </h3>
                        <span className="font-mono text-[11px] text-slate-400 block">{module.slug}</span>
                      </div>
                    </div>

                    {/* Area Badge */}
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {module.area}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                    {module.description || 'Custom modular ERP capability package.'}
                  </p>

                  {/* Metadata Chips */}
                  <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-400 pt-1">
                    <span className="font-mono">v{module.version}</span>
                    <span>•</span>
                    <span>{module.author?.name || 'Developer'}</span>
                  </div>

                  {/* Status Indicator */}
                  <div className="pt-2">
                    {module.is_installed ? (
                      module.is_enabled ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Active & Enabled</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500">
                          <Power className="w-3 h-3" />
                          <span>Disabled (Paused)</span>
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        <Layers className="w-3 h-3" />
                        <span>Discovered (Not Installed)</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="pt-5 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                  {/* Left: Export Zip */}
                  <button
                    type="button"
                    onClick={() => handleExport(module.slug)}
                    title="Export / Download ZIP package"
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  {/* Right Actions */}
                  <div className="flex items-center gap-1.5">
                    {module.is_installed ? (
                      <>
                        {/* Enable / Disable Button */}
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleToggle(module)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 ${
                            module.is_enabled
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
                              : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-xs'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                          <span>{module.is_enabled ? 'Disable' : 'Enable'}</span>
                        </button>

                        {/* Uninstall Button */}
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => setUninstallConfirmModule(module)}
                          title="Uninstall module"
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        {/* Install Button */}
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleInstall(module.slug)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Install</span>
                        </button>

                        {/* Delete from Disk */}
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => setDiskDeleteConfirmModule(module)}
                          title="Delete files from disk"
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <HardDrive className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create Module */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Generate Module Starter (.ZIP)</h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Scaffolds complete architecture into a downloadable ZIP for local development
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateStarterZip} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              {/* Informational Workflow Callout */}
              <div className="p-3.5 rounded-2xl bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/40 text-[11px] text-violet-800 dark:text-violet-300 space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-violet-900 dark:text-violet-200">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Developer Starter Kit Workflow</span>
                </div>
                <p>1. Download the scaffolded ZIP with `module.json`, ServiceProvider, Controller, Routes & Models.</p>
                <p>2. Build your custom business logic locally in your favorite IDE.</p>
                <p>3. Upload your completed ZIP package via <strong>Upload ZIP</strong> to install and enable.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Module Name (StudlyCase) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. ContactsCRM, InventoryPro, PaymentGateway"
                  required
                  className="w-full bg-slate-100 dark:bg-slate-950/60 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Target Application Area
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'dashboard', label: 'Dashboard' },
                      { id: 'admin', label: 'Admin' },
                      { id: 'shared', label: 'Shared' },
                    ] as const
                  ).map((area) => (
                    <button
                      key={area.id}
                      type="button"
                      onClick={() => setFormArea(area.id)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer text-center ${
                        formArea === area.id
                          ? 'bg-violet-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {area.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Description
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  placeholder="Brief description of module capabilities and features..."
                  className="w-full bg-slate-100 dark:bg-slate-950/60 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Author / Organization Name
                </label>
                <input
                  type="text"
                  value={formAuthor}
                  onChange={(e) => setFormAuthor(e.target.value)}
                  placeholder="e.g. Your Name or Company"
                  className="w-full bg-slate-100 dark:bg-slate-950/60 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submittingCreate ? (
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>Generate & Download (.ZIP)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Upload Module ZIP */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Upload Module Package</h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Upload a .zip package containing module.json and source files
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedFile(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadZip} className="p-6 space-y-5">
              {/* Dropzone */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip,application/zip"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setSelectedFile(file);
                }}
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isDragOver
                    ? 'border-violet-500 bg-violet-500/10'
                    : selectedFile
                    ? 'border-emerald-500/50 bg-emerald-500/5'
                    : 'border-slate-200 dark:border-slate-800 hover:border-violet-500/50 hover:bg-slate-50 dark:hover:bg-slate-950/40'
                }`}
              >
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div
                    className={`p-3 rounded-2xl ${
                      selectedFile
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                    }`}
                  >
                    <FileArchive className="w-8 h-8" />
                  </div>

                  {selectedFile ? (
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        {selectedFile.name}
                      </span>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block mt-0.5">
                        {(selectedFile.size / 1024).toFixed(1)} KB • Ready to extract & install
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        Click or drag module .ZIP file here
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-1">
                        Must contain module.json in root or top-level directory (max 50MB)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={uploadAutoInstall}
                    onChange={(e) => setUploadAutoInstall(e.target.checked)}
                    className="accent-violet-600 rounded-md w-4 h-4 cursor-pointer"
                  />
                  <span>Automatically install and register permissions immediately</span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedFile(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingZip || !selectedFile}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {uploadingZip ? (
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  <span>Upload & Install</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm: Uninstall Module */}
      <ConfirmDialog
        isOpen={Boolean(uninstallConfirmModule)}
        title="Uninstall Module?"
        message={`Are you sure you want to uninstall '${uninstallConfirmModule?.name}'? This will remove registered permissions and mark the module as uninstalled, but keep its files on disk.`}
        confirmText="Uninstall Module"
        cancelText="Cancel"
        variant="warning"
        loading={actionLoading === uninstallConfirmModule?.slug}
        onConfirm={handleConfirmUninstall}
        onCancel={() => setUninstallConfirmModule(null)}
      />

      {/* Confirm: Delete Module From Disk */}
      <ConfirmDialog
        isOpen={Boolean(diskDeleteConfirmModule)}
        title="Permanently Delete Module Files?"
        message={`Are you sure you want to permanently delete '${diskDeleteConfirmModule?.name}' from the server filesystem? All files in 'modules/${diskDeleteConfirmModule?.area}/${diskDeleteConfirmModule?.name}' will be destroyed.`}
        confirmText="Delete Files Permanently"
        cancelText="Cancel"
        variant="danger"
        loading={actionLoading === diskDeleteConfirmModule?.slug}
        onConfirm={handleConfirmDiskDelete}
        onCancel={() => setDiskDeleteConfirmModule(null)}
      />
    </div>
  );
};
