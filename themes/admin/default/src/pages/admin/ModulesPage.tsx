import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  BookOpen,
} from 'lucide-react';
import api from '../../services/api';
import { ModuleItem } from '../../types';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { MarkdownPreview } from '../../components/common/MarkdownPreview';

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

  // Readme Modal state
  const [readmeModalModule, setReadmeModalModule] = useState<ModuleItem | null>(null);
  const [readmeLoading, setReadmeLoading] = useState(false);
  const [readmeContent, setReadmeContent] = useState<string | null>(null);

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

  // Close open modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (readmeModalModule) setReadmeModalModule(null);
        if (showCreateModal) setShowCreateModal(false);
        if (showUploadModal) {
          setShowUploadModal(false);
          setSelectedFile(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [readmeModalModule, showCreateModal, showUploadModal]);

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

  // Open Readme Preview Modal
  const handleOpenReadme = async (module: ModuleItem) => {
    setReadmeModalModule(module);
    setReadmeLoading(true);
    setReadmeContent(null);
    try {
      const res = await api.get(`/modules/${module.slug}/readme`);
      if (res.data.has_readme && res.data.content) {
        setReadmeContent(res.data.content);
      } else {
        setReadmeContent(null);
      }
    } catch (err: any) {
      console.warn('Failed to load README:', err);
      setReadmeContent(null);
    } finally {
      setReadmeLoading(false);
    }
  };

  const [deleteSavedData, setDeleteSavedData] = useState<boolean>(false);

  // Uninstall Module Confirmation
  const handleConfirmUninstall = async () => {
    if (!uninstallConfirmModule) return;
    setActionLoading(uninstallConfirmModule.slug);
    try {
      const res = await api.delete(
        `/admin/modules/${uninstallConfirmModule.slug}${deleteSavedData ? '?delete_data=true' : ''}`
      );
      setStatusMessage({ type: 'success', text: res.data.message });
      setUninstallConfirmModule(null);
      setDeleteSavedData(false);
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
    <div className="w-full space-y-6 pb-12">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredModules.map((module) => {
            const isBusy = actionLoading === module.slug;

            return (
              <div
                key={module.slug}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all group overflow-hidden floating-card"
              >
                {/* Header Banner Image */}
                <div className="relative h-28 sm:h-32 w-full overflow-hidden bg-slate-900 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
                  {module.banner_url ? (
                    <img
                      src={module.banner_url}
                      alt={`${module.name} banner`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-950 via-slate-900 to-violet-950 flex items-center justify-center">
                      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#818cf8_1px,transparent_1px)] [background-size:16px_16px]" />
                      <Layers className="w-8 h-8 text-white/20" />
                    </div>
                  )}

                  {/* Area Badge overlay top-right */}
                  <div className="absolute top-3 right-3 z-10">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-950/70 text-slate-200 backdrop-blur-md border border-white/10 shadow-xs">
                      {module.area}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 pt-0 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Floating Overlapping Icon Row */}
                    <div className="relative -mt-7 mb-3 flex items-end justify-between">
                      <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-900 p-1 shadow-md ring-2 ring-white/50 dark:ring-slate-800 shrink-0 overflow-hidden flex items-center justify-center">
                        {module.icon_url ? (
                          <img
                            src={module.icon_url}
                            alt={`${module.name} icon`}
                            className="w-full h-full object-contain rounded-xl"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                            <Box className="w-6 h-6" />
                          </div>
                        )}
                      </div>

                      {/* Version Tag */}
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pb-1">
                        <span className="font-mono bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-lg text-slate-600 dark:text-slate-300 font-medium">
                          v{module.version}
                        </span>
                      </div>
                    </div>

                    {/* Title & Slug */}
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                      {module.name}
                    </h3>
                    <span className="font-mono text-[11px] text-slate-400 block mb-2">{module.slug}</span>

                    {/* Description */}
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2 mb-3">
                      {module.description || 'Custom modular ERP capability package.'}
                    </p>

                    {/* Author & Status Chips */}
                    <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                      <span className="text-[11px] text-slate-400">
                        By {module.author?.name || 'Developer'}
                      </span>

                      {/* Status Indicator */}
                      {module.is_installed ? (
                        module.is_enabled ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-500">
                            <Power className="w-2.5 h-2.5" />
                            <span>Disabled</span>
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                          <Layers className="w-2.5 h-2.5" />
                          <span>Discovered</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                    {/* Left: Read More Button + Export Zip */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenReadme(module)}
                        title="Read Module Overview & README documentation"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/60 text-xs font-semibold border border-violet-200/50 dark:border-violet-800/40 transition-colors cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Read More</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExport(module.slug)}
                        title="Export / Download ZIP package"
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-1.5">
                      {module.is_installed ? (
                        <>
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
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleInstall(module.slug)}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Install</span>
                          </button>

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
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create Module */}
      {showCreateModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] overflow-y-auto flex items-start sm:items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowCreateModal(false)}
          >
            <div
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)] animate-in zoom-in-95 duration-200"
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
          </div>,
          document.body
        )}

      {/* Modal: Upload Module ZIP */}
      {showUploadModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] overflow-y-auto flex items-start sm:items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => {
              setShowUploadModal(false);
              setSelectedFile(null);
            }}
          >
            <div
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)] animate-in zoom-in-95 duration-200"
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

              <form onSubmit={handleUploadZip} className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
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
          </div>,
          document.body
        )}

      {/* Modal: Read More & Documentation Preview */}
      {readmeModalModule &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/80 backdrop-blur-md p-3 sm:p-6 md:p-8 flex justify-center items-start sm:items-center animate-in fade-in duration-200"
            onClick={() => setReadmeModalModule(null)}
          >
            <div
              className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[calc(100vh-2.5rem)] sm:max-h-[calc(100vh-4rem)] animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Hero Banner */}
              <div className="relative h-32 sm:h-40 md:h-44 w-full overflow-hidden bg-slate-950 shrink-0">
                {readmeModalModule.banner_url ? (
                  <img
                    src={readmeModalModule.banner_url}
                    alt={`${readmeModalModule.name} Banner`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-violet-950 via-slate-900 to-indigo-950 flex items-center justify-center">
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#818cf8_1px,transparent_1px)] [background-size:16px_16px]" />
                    <Layers className="w-12 h-12 text-white/20" />
                  </div>
                )}

                {/* Close Button top-right */}
                <button
                  type="button"
                  onClick={() => setReadmeModalModule(null)}
                  className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 p-2 rounded-full bg-slate-950/70 hover:bg-slate-950 text-white backdrop-blur-md border border-white/10 transition-all cursor-pointer z-30 shadow-md"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Top-Left Area Tag */}
                <div className="absolute top-3.5 left-3.5 sm:top-4 sm:left-4 z-20">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-950/75 text-slate-200 backdrop-blur-md border border-white/10 shadow-xs">
                    {readmeModalModule.area} MODULE
                  </span>
                </div>
              </div>

              {/* Identity & Actions Bar (Clean solid surface, only icon overlaps banner) */}
              <div className="relative bg-white dark:bg-slate-900 px-6 sm:px-8 pb-4 pt-0 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* Floating Icon */}
                    <div className="-mt-8 sm:-mt-10 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white dark:bg-slate-900 p-1.5 shadow-xl ring-4 ring-white dark:ring-slate-900 shrink-0 overflow-hidden flex items-center justify-center z-10">
                      {readmeModalModule.icon_url ? (
                        <img
                          src={readmeModalModule.icon_url}
                          alt={`${readmeModalModule.name} Icon`}
                          className="w-full h-full object-contain rounded-xl"
                        />
                      ) : (
                        <div className="w-full h-full rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                          <Box className="w-8 h-8 sm:w-10 sm:h-10" />
                        </div>
                      )}
                    </div>

                    <div className="pt-2 sm:pt-0">
                      <h2 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        {readmeModalModule.name}
                      </h2>
                      <div className="flex items-center gap-2 text-xs text-slate-400 pt-0.5 flex-wrap">
                        <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300 font-semibold text-[11px]">
                          v{readmeModalModule.version}
                        </span>
                        <span>•</span>
                        <span>By {readmeModalModule.author?.name || 'Developer'}</span>
                        <span>•</span>
                        <span className="font-mono text-[11px]">{readmeModalModule.slug}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Action Buttons */}
                  <div className="flex items-center gap-2 self-start sm:self-center pt-2 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => handleExport(readmeModalModule.slug)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export ZIP</span>
                    </button>

                    {readmeModalModule.is_installed ? (
                      <button
                        type="button"
                        disabled={actionLoading === readmeModalModule.slug}
                        onClick={() => handleToggle(readmeModalModule)}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          readmeModalModule.is_enabled
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
                            : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>{readmeModalModule.is_enabled ? 'Disable' : 'Enable'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={actionLoading === readmeModalModule.slug}
                        onClick={() => handleInstall(readmeModalModule.slug)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-500/20 transition-all cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Install Module</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Scrollable Documentation Content */}
              <div className="overflow-y-auto custom-scrollbar px-6 sm:px-8 py-5 flex-1 space-y-6">
                {/* Description callout */}
                {readmeModalModule.description && (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {readmeModalModule.description}
                  </div>
                )}

                {/* Documentation Body */}
                {readmeLoading ? (
                  <div className="space-y-4 py-6">
                    <div className="h-6 w-1/3 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
                    <div className="h-4 w-full bg-slate-100 dark:bg-slate-800/60 rounded-md animate-pulse" />
                    <div className="h-4 w-5/6 bg-slate-100 dark:bg-slate-800/60 rounded-md animate-pulse" />
                    <div className="h-24 w-full bg-slate-100 dark:bg-slate-800/60 rounded-2xl animate-pulse" />
                  </div>
                ) : readmeContent ? (
                  <div className="prose prose-slate dark:prose-invert max-w-none">
                    <MarkdownPreview content={readmeContent} />
                  </div>
                ) : (
                  <div className="py-12 text-center space-y-3 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6">
                    <BookOpen className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      No README.md Documented
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                      This module does not contain a root <code className="font-mono font-semibold">README.md</code>. You can document features, installation guides, and API documentation by creating a <code className="font-mono font-semibold">README.md</code> file in the module folder.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  {readmeModalModule.is_installed ? (
                    readmeModalModule.is_enabled ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>Module is Installed & Enabled</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-500">
                        <Power className="w-4 h-4 text-amber-500" />
                        <span>Module is Installed but Disabled</span>
                      </span>
                    )
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                      <Layers className="w-4 h-4 text-slate-400" />
                      <span>Discovered from filesystem (Not Installed)</span>
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setReadmeModalModule(null)}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Confirm: Uninstall Module */}
      <ConfirmDialog
        isOpen={Boolean(uninstallConfirmModule)}
        title="Uninstall Module?"
        message={`Are you sure you want to uninstall '${uninstallConfirmModule?.name}'? Registered permissions and hooks will be removed immediately.`}
        confirmText={deleteSavedData ? "Uninstall & Delete Data" : "Uninstall Module"}
        cancelText="Cancel"
        variant={deleteSavedData ? "danger" : "warning"}
        loading={actionLoading === uninstallConfirmModule?.slug}
        onConfirm={handleConfirmUninstall}
        onCancel={() => {
          setUninstallConfirmModule(null);
          setDeleteSavedData(false);
        }}
      >
        <div className="mt-2 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={deleteSavedData}
              onChange={(e) => setDeleteSavedData(e.target.checked)}
              className="mt-0.5 accent-rose-600 rounded-md w-4 h-4 cursor-pointer"
            />
            <div>
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400 block">
                Also delete saved data
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                Permanently drops module database tables, records, and purges uploaded documents and vault storage.
              </span>
            </div>
          </label>
        </div>
      </ConfirmDialog>

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
