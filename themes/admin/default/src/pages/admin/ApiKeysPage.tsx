import React, { useEffect, useState } from 'react';
import {
  KeyRound,
  Plus,
  Search,
  Copy,
  Check,
  Shield,
  Clock,
  Globe,
  Gauge,
  AlertTriangle,
  Trash2,
  Edit2,
  CheckCircle2,
  X,
  RefreshCw,
  Power,
  Activity,
  Sparkles,
  Lock,
  Unlock,
} from 'lucide-react';
import api from '../../services/api';
import { ApiKeyItem } from '../../types';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

interface PermissionGroupMap {
  [groupName: string]: {
    [permKey: string]: string;
  };
}

export const ApiKeysPage: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');
  const [stats, setStats] = useState({
    total_keys: 0,
    active_keys: 0,
    expired_keys: 0,
    total_requests: 0,
  });
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Meta permissions from backend
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroupMap>({});

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKeyItem | null>(null);
  const [newSecretData, setNewSecretData] = useState<{ key: ApiKeyItem; secret: string } | null>(null);
  const [regenConfirmKey, setRegenConfirmKey] = useState<ApiKeyItem | null>(null);
  const [deleteConfirmKey, setDeleteConfirmKey] = useState<ApiKeyItem | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formRateLimit, setFormRateLimit] = useState<number>(60);
  const [formExpiryPreset, setFormExpiryPreset] = useState<'30d' | '90d' | '1y' | 'never' | 'custom'>('90d');
  const [formCustomExpiry, setFormCustomExpiry] = useState('');
  const [formIpType, setFormIpType] = useState<'none' | 'whitelist' | 'blacklist'>('none');
  const [formIpListText, setFormIpListText] = useState('');
  const [formAllPermissions, setFormAllPermissions] = useState(false);
  const [formSelectedPermissions, setFormSelectedPermissions] = useState<string[]>([]);
  const [formAllowedEndpointsText, setFormAllowedEndpointsText] = useState('');

  // Fetch API Keys & Stats
  const fetchApiKeys = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (searchQuery) params.search = searchQuery;
      if (statusFilter !== 'all') params.status = statusFilter;

      const res = await api.get('/admin/api-keys', { params });
      setApiKeys(res.data.api_keys?.data || []);
      if (res.data.stats) {
        setStats(res.data.stats);
      }
    } catch (err: any) {
      console.error('Failed to load API keys:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Permission Meta
  const fetchMeta = async () => {
    try {
      const res = await api.get('/admin/api-keys/meta');
      setPermissionGroups(res.data.permission_groups || {});
    } catch (err) {
      console.error('Failed to load permission meta:', err);
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, [statusFilter]);

  useEffect(() => {
    fetchMeta();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchApiKeys();
  };

  // Copy helper
  const handleCopy = (text: string, identifier?: string) => {
    navigator.clipboard.writeText(text);
    if (identifier) {
      setCopiedKeyId(identifier);
      setTimeout(() => setCopiedKeyId(null), 2000);
    } else {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  // Open Create Modal
  const openCreateModal = () => {
    setFormName('');
    setFormRateLimit(60);
    setFormExpiryPreset('90d');
    setFormCustomExpiry('');
    setFormIpType('none');
    setFormIpListText('');
    setFormAllPermissions(false);
    setFormSelectedPermissions(['users.view', 'modules.view']);
    setFormAllowedEndpointsText('');
    setEditingKey(null);
    setShowCreateModal(true);
  };

  // Open Edit Modal
  const openEditModal = (key: ApiKeyItem) => {
    setEditingKey(key);
    setFormName(key.name);
    setFormRateLimit(key.rate_limit);
    if (!key.expires_at) {
      setFormExpiryPreset('never');
      setFormCustomExpiry('');
    } else {
      setFormExpiryPreset('custom');
      setFormCustomExpiry(key.expires_at.substring(0, 10));
    }
    setFormIpType(key.ip_restriction_type);
    setFormIpListText(key.ip_addresses ? key.ip_addresses.join('\n') : '');
    const isAll = key.permissions.includes('*');
    setFormAllPermissions(isAll);
    setFormSelectedPermissions(isAll ? [] : key.permissions);
    setFormAllowedEndpointsText(key.allowed_endpoints ? key.allowed_endpoints.join('\n') : '');
    setShowCreateModal(true);
  };

  // Calculate Expiry Date from Preset
  const calculateExpiryDate = (): string | null => {
    if (formExpiryPreset === 'never') return null;
    if (formExpiryPreset === 'custom') return formCustomExpiry || null;

    const now = new Date();
    if (formExpiryPreset === '30d') {
      now.setDate(now.getDate() + 30);
    } else if (formExpiryPreset === '90d') {
      now.setDate(now.getDate() + 90);
    } else if (formExpiryPreset === '1y') {
      now.setFullYear(now.getFullYear() + 1);
    }
    return now.toISOString();
  };

  // Submit Create or Update
  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setStatusMessage({ type: 'error', text: 'API Key Name is required.' });
      return;
    }

    setSubmitting(true);
    setStatusMessage(null);

    const ipAddresses = formIpListText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const allowedEndpoints = formAllowedEndpointsText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const permissions = formAllPermissions ? ['*'] : formSelectedPermissions;

    const payload = {
      name: formName.trim(),
      rate_limit: formRateLimit,
      ip_restriction_type: formIpType,
      ip_addresses: ipAddresses.length > 0 ? ipAddresses : null,
      permissions: permissions.length > 0 ? permissions : ['*'],
      allowed_endpoints: allowedEndpoints.length > 0 ? allowedEndpoints : null,
      expires_at: calculateExpiryDate(),
    };

    try {
      if (editingKey) {
        const res = await api.put(`/admin/api-keys/${editingKey.id}`, payload);
        setStatusMessage({ type: 'success', text: res.data.message });
        setShowCreateModal(false);
        fetchApiKeys();
      } else {
        const res = await api.post('/admin/api-keys', payload);
        setShowCreateModal(false);
        setNewSecretData({
          key: res.data.api_key,
          secret: res.data.plain_secret,
        });
        fetchApiKeys();
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to save Application API Key.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Status
  const handleToggleStatus = async (key: ApiKeyItem) => {
    try {
      const res = await api.put(`/admin/api-keys/${key.id}/toggle-status`);
      setStatusMessage({ type: 'success', text: res.data.message });
      setApiKeys((prev) => prev.map((item) => (item.id === key.id ? res.data.api_key : item)));
      if (stats) {
        setStats((prev) => ({
          ...prev,
          active_keys: res.data.api_key.is_active ? prev.active_keys + 1 : prev.active_keys - 1,
        }));
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to toggle API key status.',
      });
    }
  };

  // Regenerate Key Secret
  const handleConfirmRegenerate = async () => {
    if (!regenConfirmKey) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/admin/api-keys/${regenConfirmKey.id}/regenerate`);
      setRegenConfirmKey(null);
      setNewSecretData({
        key: res.data.api_key,
        secret: res.data.plain_secret,
      });
      fetchApiKeys();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to regenerate API key secret.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Delete API Key
  const handleConfirmDelete = async () => {
    if (!deleteConfirmKey) return;
    setActionLoading(true);
    try {
      const res = await api.delete(`/admin/api-keys/${deleteConfirmKey.id}`);
      setStatusMessage({ type: 'success', text: res.data.message });
      setDeleteConfirmKey(null);
      fetchApiKeys();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to delete API key.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle single permission checkbox
  const togglePermission = (perm: string) => {
    setFormSelectedPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  // Toggle entire permission group
  const togglePermissionGroup = (perms: string[]) => {
    const allSelected = perms.every((p) => formSelectedPermissions.includes(p));
    if (allSelected) {
      setFormSelectedPermissions((prev) => prev.filter((p) => !perms.includes(p)));
    } else {
      setFormSelectedPermissions((prev) => Array.from(new Set([...prev, ...perms])));
    }
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <KeyRound className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            <span>Application APIs</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Provision secure programmatic API keys with scoped permissions, rate limits, expiry, and IP firewalls
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-500/20 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Generate API Key</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">Total API Keys</span>
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <KeyRound className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total_keys}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Configured client applications</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">Active Credentials</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.active_keys}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Live & authorized keys</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">Expired / Inactive</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-500">{stats.expired_keys}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Past validity or paused</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">Total API Invocations</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-blue-500">{stats.total_requests.toLocaleString()}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Cumulative requests processed</span>
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

      {/* Filters & Search Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 custom-scrollbar">
          {(
            [
              { id: 'all', label: 'All Keys' },
              { id: 'active', label: 'Active' },
              { id: 'inactive', label: 'Suspended' },
              { id: 'expired', label: 'Expired' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-violet-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search key name or ID..."
            className="w-full bg-slate-100 dark:bg-slate-950/60 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </form>
      </div>

      {/* API Keys Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">No Application API Keys found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {searchQuery
                ? 'No API keys matching your search terms.'
                : 'Get started by generating an Application API Key to integrate third-party services and mobile apps.'}
            </p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-500 transition-all cursor-pointer mt-2"
            >
              <Plus className="w-4 h-4" />
              <span>Generate API Key</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-950/40 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-100 dark:border-slate-800/60">
                <tr>
                  <th className="px-6 py-3.5">Key & Client</th>
                  <th className="px-6 py-3.5">Key ID & Prefix</th>
                  <th className="px-6 py-3.5">Permissions & Endpoints</th>
                  <th className="px-6 py-3.5">Rate Limit</th>
                  <th className="px-6 py-3.5">IP Firewall</th>
                  <th className="px-6 py-3.5">Expiration</th>
                  <th className="px-6 py-3.5">Activity</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300 font-medium">
                {apiKeys.map((key) => {
                  const isAll = key.permissions.includes('*');

                  return (
                    <tr key={key.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      {/* Name & Creator */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 shrink-0">
                            <KeyRound className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white block">{key.name}</span>
                            <span className="text-[11px] text-slate-400">
                              Created by {key.user?.name || 'System Admin'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Key ID & Masked Secret */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-medium text-slate-800 dark:text-slate-200">
                              {key.key_id}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(key.key_id, `id_${key.id}`)}
                              title="Copy Key ID"
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                            >
                              {copiedKeyId === `id_${key.id}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <span className="font-mono text-[11px] text-slate-400 block">{key.secret_preview}</span>
                        </div>
                      </td>

                      {/* Permissions Scopes */}
                      <td className="px-6 py-4">
                        {isAll ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-500">
                            <Shield className="w-3 h-3" />
                            Full Root Access (*)
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {key.permissions.slice(0, 2).map((perm) => (
                              <span
                                key={perm}
                                className="px-2 py-0.5 rounded-md text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono"
                              >
                                {perm}
                              </span>
                            ))}
                            {key.permissions.length > 2 && (
                              <span
                                className="px-1.5 py-0.5 rounded-md text-[10px] bg-violet-500/10 text-violet-600 dark:text-violet-400 font-medium"
                                title={key.permissions.slice(2).join(', ')}
                              >
                                +{key.permissions.length - 2} more
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Rate Limit */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          <Gauge className="w-3.5 h-3.5 text-violet-500" />
                          {key.rate_limit} req/min
                        </span>
                      </td>

                      {/* IP Firewall */}
                      <td className="px-6 py-4">
                        {key.ip_restriction_type === 'none' ? (
                          <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                            <Globe className="w-3.5 h-3.5" />
                            Any IP Allowed
                          </span>
                        ) : key.ip_restriction_type === 'whitelist' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-500">
                            <Lock className="w-3 h-3" />
                            Whitelist ({key.ip_addresses?.length || 0})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-500">
                            <Unlock className="w-3 h-3" />
                            Blacklist ({key.ip_addresses?.length || 0})
                          </span>
                        )}
                      </td>

                      {/* Expiry */}
                      <td className="px-6 py-4">
                        {key.is_expired ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-500/10 text-rose-500">
                            <AlertTriangle className="w-3 h-3" />
                            Expired
                          </span>
                        ) : key.expires_at ? (
                          <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1 text-xs">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {key.expires_at_formatted}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">Never</span>
                        )}
                      </td>

                      {/* Activity */}
                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <span className="text-xs text-slate-700 dark:text-slate-300 block">
                            {key.last_used_at_formatted}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {key.total_requests.toLocaleString()} reqs
                          </span>
                        </div>
                      </td>

                      {/* Status Toggle */}
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(key)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                            key.is_active && !key.is_expired
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'
                          }`}
                        >
                          <Power className="w-3 h-3" />
                          <span>{key.is_active && !key.is_expired ? 'Active' : 'Suspended'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(key)}
                            title="Edit Configuration"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setRegenConfirmKey(key)}
                            title="Regenerate Key Secret"
                            className="p-1.5 rounded-lg text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 transition-colors cursor-pointer"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteConfirmKey(key)}
                            title="Revoke & Delete Key"
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Create / Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingKey ? `Edit API Key: ${editingKey.name}` : 'Generate Application API Key'}
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Set up permissions, speed limits, expiration, and IP rules
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

            {/* Modal Body / Scrollable Form */}
            <form onSubmit={handleSaveApiKey} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {/* Section 1: Application Identity */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">1. Client Identity & Limits</h3>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Application / Key Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Mobile iOS Client, Zapier Webhook, Billing Engine"
                    required
                    className="w-full bg-slate-100 dark:bg-slate-950/60 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                {/* Rate Limit */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-violet-500" />
                      <span>Rate Limit (Requests per minute)</span>
                    </label>
                    <span className="text-xs font-mono font-bold text-violet-600 dark:text-violet-400">
                      {formRateLimit} req/min
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="1200"
                    step="10"
                    value={formRateLimit}
                    onChange={(e) => setFormRateLimit(parseInt(e.target.value, 10))}
                    className="w-full accent-violet-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-800 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>10/min (Strict)</span>
                    <span>60/min (Standard)</span>
                    <span>300/min (High)</span>
                    <span>1200/min (Burst)</span>
                  </div>
                </div>

                {/* Expiry Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-violet-500" />
                    <span>Expiry Validity</span>
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {(
                      [
                        { id: '30d', label: '30 Days' },
                        { id: '90d', label: '90 Days' },
                        { id: '1y', label: '1 Year' },
                        { id: 'never', label: 'Never' },
                        { id: 'custom', label: 'Custom' },
                      ] as const
                    ).map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setFormExpiryPreset(preset.id)}
                        className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-center ${
                          formExpiryPreset === preset.id
                            ? 'bg-violet-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {formExpiryPreset === 'custom' && (
                    <div className="mt-2.5">
                      <input
                        type="date"
                        value={formCustomExpiry}
                        onChange={(e) => setFormCustomExpiry(e.target.value)}
                        min={new Date().toISOString().substring(0, 10)}
                        className="w-full bg-slate-100 dark:bg-slate-950/60 rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Section 2: IP Access Restrictions (Whitelist / Blacklist) */}
              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">2. IP Address Firewall</h3>

                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'none', label: 'Allow Any IP', desc: 'No IP restriction' },
                      { id: 'whitelist', label: 'Whitelist Only', desc: 'Only specified IPs' },
                      { id: 'blacklist', label: 'Blacklist Block', desc: 'Block listed IPs' },
                    ] as const
                  ).map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setFormIpType(type.id)}
                      className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                        formIpType === type.id
                          ? 'border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <span className="font-semibold text-xs block">{type.label}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{type.desc}</span>
                    </button>
                  ))}
                </div>

                {formIpType !== 'none' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      {formIpType === 'whitelist' ? 'Whitelisted IP Addresses' : 'Blacklisted IP Addresses'}
                    </label>
                    <textarea
                      value={formIpListText}
                      onChange={(e) => setFormIpListText(e.target.value)}
                      rows={3}
                      placeholder="192.168.1.1&#10;10.0.0.0/24&#10;2001:db8::1"
                      className="w-full font-mono text-xs bg-slate-100 dark:bg-slate-950/60 rounded-xl p-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Separate multiple IP addresses or CIDR subnets by new line or comma
                    </span>
                  </div>
                )}
              </div>

              {/* Section 3: Granular Scopes & Permissions */}
              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    3. Scopes & Permissions
                  </h3>
                  <button
                    type="button"
                    onClick={() => setFormAllPermissions(!formAllPermissions)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      formAllPermissions
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>{formAllPermissions ? 'Full Root Access (*)' : 'Grant Full Root Access'}</span>
                  </button>
                </div>

                {!formAllPermissions ? (
                  <div className="space-y-4">
                    {Object.entries(permissionGroups).map(([groupTitle, perms]) => {
                      const permKeys = Object.keys(perms);
                      const isGroupAllSelected = permKeys.every((k) => formSelectedPermissions.includes(k));

                      return (
                        <div
                          key={groupTitle}
                          className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{groupTitle}</span>
                            <button
                              type="button"
                              onClick={() => togglePermissionGroup(permKeys)}
                              className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
                            >
                              {isGroupAllSelected ? 'Deselect All' : 'Select All'}
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {Object.entries(perms).map(([permKey, permLabel]) => {
                              const isChecked = formSelectedPermissions.includes(permKey);
                              return (
                                <label
                                  key={permKey}
                                  className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-white dark:hover:bg-slate-900 transition-colors cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => togglePermission(permKey)}
                                    className="accent-violet-600 rounded-md w-4 h-4 mt-0.5 cursor-pointer"
                                  />
                                  <div>
                                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                                      {permLabel}
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-400 block">{permKey}</span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-3">
                    <Shield className="w-5 h-5 shrink-0" />
                    <span>
                      This API Key will have unrestricted Super-Admin access to all system APIs, resources, and modules.
                    </span>
                  </div>
                )}
              </div>

              {/* Footer Save Button */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>{editingKey ? 'Update Configuration' : 'Generate & Save Key'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Secret Generated Display Modal (Crucial One-Time View) */}
      {newSecretData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <Sparkles className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">API Key Generated Successfully</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Please copy and save your secret key securely. For your security, this plaintext secret will{' '}
                <strong className="text-rose-500 font-semibold">never be shown again</strong>.
              </p>
            </div>

            {/* Secret Box */}
            <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 text-left space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Live Secret Key:
              </span>
              <div className="flex items-center justify-between gap-3 bg-slate-900 rounded-xl px-3.5 py-2.5 border border-slate-800">
                <code className="text-xs font-mono text-emerald-400 break-all select-all font-semibold">
                  {newSecretData.secret}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopy(newSecretData.secret)}
                  className="p-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition-colors cursor-pointer shrink-0"
                  title="Copy secret key"
                >
                  {copiedSecret ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Key Metadata Summary */}
            <div className="bg-slate-50 dark:bg-slate-950/40 rounded-2xl p-4 text-xs text-left space-y-2 border border-slate-100 dark:border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-500">Key Identifier:</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {newSecretData.key.key_id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Rate Limit:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {newSecretData.key.rate_limit} req/min
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Expiry:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {newSecretData.key.expires_at_formatted}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setNewSecretData(null);
                setCopiedSecret(false);
              }}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-500/20 transition-all cursor-pointer"
            >
              I Have Saved My Secret Key
            </button>
          </div>
        </div>
      )}

      {/* Regenerate Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(regenConfirmKey)}
        title="Regenerate API Secret Key?"
        message={`Regenerating credentials for '${regenConfirmKey?.name}' will immediately revoke the existing secret key. Any application or integration currently using the old key will lose access until updated.`}
        confirmText="Regenerate Secret"
        cancelText="Keep Current Secret"
        variant="warning"
        loading={actionLoading}
        onConfirm={handleConfirmRegenerate}
        onCancel={() => setRegenConfirmKey(null)}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteConfirmKey)}
        title="Revoke & Delete API Key?"
        message={`Are you sure you want to permanently delete '${deleteConfirmKey?.name}'? This action is irreversible and all future API calls with this key will fail immediately.`}
        confirmText="Revoke & Delete"
        cancelText="Cancel"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmKey(null)}
      />
    </div>
  );
};
