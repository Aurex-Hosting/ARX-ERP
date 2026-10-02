import React, { useEffect, useState } from 'react';
import {
  User as UserIcon,
  Bot,
  Plus,
  Search,
  KeyRound,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  X,
  RefreshCw,
  Clock,
  AlertTriangle,
  RotateCcw,
  Power,
  Flame,
  Shield,
  ShieldCheck,
  ShieldOff,
  Lock,
  Mail,
  Send,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { UserListItem, TrashedUserItem, RoleItem } from '../../types';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [trashedUsers, setTrashedUsers] = useState<TrashedUserItem[]>([]);
  const [trashCount, setTrashCount] = useState<number>(0);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'user' | 'ai_agent' | 'disabled' | 'trash'>('all');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);
  const [passwordModalUser, setPasswordModalUser] = useState<UserListItem | null>(null);

  // Confirmation dialogs state
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<UserListItem | null>(null);
  const [forceDeleteConfirmUser, setForceDeleteConfirmUser] = useState<TrashedUserItem | null>(null);
  const [disable2FaConfirmUser, setDisable2FaConfirmUser] = useState<UserListItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State: Create
  const [formIdentifier, setFormIdentifier] = useState('');
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formUserType, setFormUserType] = useState<'user' | 'ai_agent'>('user');
  const [formRoles, setFormRoles] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Form State: Change Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Outbound Mail Hooks state
  const [mailHooks, setMailHooks] = useState<{
    is_mail_enabled: boolean;
    hook_user_pwd_change: boolean;
    hook_verify_email_on_created: boolean;
  }>({
    is_mail_enabled: false,
    hook_user_pwd_change: false,
    hook_verify_email_on_created: false,
  });

  useEffect(() => {
    const fetchMailHooks = async () => {
      try {
        const res = await api.get('/admin/mail/hooks');
        setMailHooks({
          is_mail_enabled: Boolean(res.data?.is_mail_enabled),
          hook_user_pwd_change: Boolean(res.data?.hooks?.hook_user_pwd_change),
          hook_verify_email_on_created: Boolean(res.data?.hooks?.hook_verify_email_on_created),
        });
      } catch {
        // Mail system may be disabled or unavailable
      }
    };
    fetchMailHooks();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      if (activeTab === 'trash') {
        const [trashRes, rolesRes] = await Promise.all([
          api.get('/admin/users/trash', { params: { search: searchQuery || undefined } }),
          api.get('/admin/roles'),
        ]);
        setTrashedUsers(trashRes.data.data || []);
        setTrashCount(trashRes.data.trash_count || (trashRes.data.data ? trashRes.data.data.length : 0));
        setRoles(rolesRes.data.roles || []);
      } else {
        const params: any = {};
        if (searchQuery) params.search = searchQuery;
        if (activeTab === 'disabled') {
          params.is_active = false;
        } else if (activeTab !== 'all') {
          params.user_type = activeTab;
        }

        const [usersRes, rolesRes] = await Promise.all([
          api.get('/admin/users', { params }),
          api.get('/admin/roles'),
        ]);

        setUsers(usersRes.data.data || []);
        setTrashCount(usersRes.data.trash_count || 0);
        setRoles(rolesRes.data.roles || []);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [activeTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  // Open Create Modal
  const openCreateModal = () => {
    setFormIdentifier('');
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormUserType('user');
    setFormRoles(['user']);
    setShowCreateModal(true);
  };

  // Open Edit Modal (no password, no status toggle)
  const openEditModal = (user: UserListItem) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormUserType(user.user_type === 'ai_agent' ? 'ai_agent' : 'user');
    setFormRoles(user.roles.map((r) => r.name));
  };

  // Open Change Password Modal
  const openPasswordModal = (user: UserListItem) => {
    setPasswordModalUser(user);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: any = {
        name: formName,
        email: formEmail,
        password: formPassword,
        user_type: formUserType,
        is_active: true,
        roles: formRoles,
      };
      if (formIdentifier.trim()) {
        payload.identifier = formIdentifier.trim().toUpperCase();
      }

      const res = await api.post('/admin/users', payload);
      const createdId = res.data.user?.identifier || formName;

      setStatusMessage({ type: 'success', text: `Identity '${formName}' [ID: ${createdId}] created successfully.` });
      setShowCreateModal(false);
      await fetchUsers();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.response?.data?.message || 'Failed to create identity.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSubmitting(true);

    try {
      const userKey = editingUser.identifier || editingUser.id;
      await api.put(`/admin/users/${userKey}`, {
        name: formName,
        email: formEmail,
        user_type: formUserType,
        roles: formRoles,
      });

      setStatusMessage({ type: 'success', text: `User '${formName}' updated successfully.` });
      setEditingUser(null);
      await fetchUsers();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update user.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser) return;

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);
    setPasswordError('');

    try {
      const userKey = passwordModalUser.identifier || passwordModalUser.id;
      await api.put(`/admin/users/${userKey}/password`, {
        password: newPassword,
        password_confirmation: confirmPassword,
      });

      setStatusMessage({ type: 'success', text: `Password for '${passwordModalUser.name}' updated successfully.` });
      setPasswordModalUser(null);
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: UserListItem) => {
    try {
      const userKey = user.identifier || user.id;
      const res = await api.put(`/admin/users/${userKey}/toggle-status`);
      setStatusMessage({ type: 'success', text: res.data.message });
      // Optimistic update
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: res.data.is_active } : u))
      );
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.response?.data?.message || 'Failed to toggle status.' });
    }
  };

  const handleSendResetLink = async (user: UserListItem) => {
    try {
      const userKey = user.identifier || user.id;
      const res = await api.post(`/admin/users/${userKey}/send-reset-link`);
      setStatusMessage({ type: 'success', text: res.data.message || `Password reset link sent to ${user.email}.` });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.response?.data?.message || 'Failed to dispatch password reset link.' });
    }
  };

  const handleResendActivation = async (user: UserListItem) => {
    try {
      const userKey = user.identifier || user.id;
      const res = await api.post(`/admin/users/${userKey}/resend-activation`);
      setStatusMessage({ type: 'success', text: res.data.message || `Activation email sent to ${user.email}.` });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.response?.data?.message || 'Failed to dispatch activation email.' });
    }
  };

  const handleSoftDelete = async () => {
    if (!deleteConfirmUser) return;
    setActionLoading(true);
    try {
      const userKey = deleteConfirmUser.identifier || deleteConfirmUser.id;
      await api.delete(`/admin/users/${userKey}`);
      setStatusMessage({
        type: 'success',
        text: `'${deleteConfirmUser.name}' [${deleteConfirmUser.identifier}] moved to Recycle Bin. It can be restored within 30 days.`,
      });
      setDeleteConfirmUser(null);
      await fetchUsers();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.response?.data?.message || 'Failed to delete user.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestoreUser = async (user: TrashedUserItem) => {
    try {
      const userKey = user.identifier || user.id;
      await api.post(`/admin/users/${userKey}/restore`);
      setStatusMessage({ type: 'success', text: `'${user.name}' [${user.identifier}] restored successfully.` });
      await fetchUsers();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.response?.data?.message || 'Failed to restore user.' });
    }
  };

  const handleForceDelete = async () => {
    if (!forceDeleteConfirmUser) return;
    setActionLoading(true);
    try {
      const userKey = forceDeleteConfirmUser.identifier || forceDeleteConfirmUser.id;
      await api.delete(`/admin/users/${userKey}/force`);
      setStatusMessage({
        type: 'success',
        text: `'${forceDeleteConfirmUser.name}' [${forceDeleteConfirmUser.identifier}] permanently deleted from database.`,
      });
      setForceDeleteConfirmUser(null);
      await fetchUsers();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.response?.data?.message || 'Failed to permanently delete user.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdminDisable2Fa = async () => {
    if (!disable2FaConfirmUser) return;
    setActionLoading(true);
    try {
      const userKey = disable2FaConfirmUser.identifier || disable2FaConfirmUser.id;
      await api.post(`/admin/users/${userKey}/disable-2fa`);
      setStatusMessage({
        type: 'success',
        text: `Two-Factor Authentication has been disabled for '${disable2FaConfirmUser.name}'.`,
      });
      setDisable2FaConfirmUser(null);
      await fetchUsers();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to disable 2FA for this user.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const toggleRoleSelection = (roleName: string) => {
    if (formRoles.includes(roleName)) {
      setFormRoles(formRoles.filter((r) => r !== roleName));
    } else {
      setFormRoles([...formRoles, roleName]);
    }
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Users & Identities</h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Manage human users, administrators, AI Agents, and 30-day Recycle Bin lifecycle.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add User / AI Agent</span>
        </button>
      </div>

      {/* Status Feedback Message */}
      {statusMessage && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-xl text-xs font-medium animate-in fade-in duration-150 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 rounded-xl shadow-sm overflow-x-auto">
          {[
            { id: 'all', label: 'All Identities' },
            { id: 'user', label: 'Human Users' },
            { id: 'ai_agent', label: 'AI Agents' },
            { id: 'disabled', label: 'Disabled' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                activeTab === item.id
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}

          {/* Recycle Bin Tab with Badge */}
          <button
            onClick={() => setActiveTab('trash')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'trash'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Recycle Bin</span>
            {trashCount > 0 && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                  activeTab === 'trash' ? 'bg-white text-rose-600' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                }`}
              >
                {trashCount}
              </span>
            )}
          </button>
        </div>

        {/* Search & Refresh */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={activeTab === 'trash' ? 'Search recycle bin...' : 'Search by name, email...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 shadow-sm"
            />
          </div>
          <button
            type="button"
            onClick={fetchUsers}
            title="Refresh list"
            className="p-2 rounded-xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shadow-sm transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </form>
      </div>

      {/* Main Table: Active Identities View */}
      {activeTab !== 'trash' && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-sm">Loading identities...</div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-sm">
              No users or AI agents found matching your filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-3.5 whitespace-nowrap">Identity</th>
                    <th className="px-6 py-3.5 whitespace-nowrap">Actor Type</th>
                    <th className="px-6 py-3.5 whitespace-nowrap">Roles</th>
                    <th className="px-6 py-3.5 whitespace-nowrap">2FA Security</th>
                    <th className="px-6 py-3.5 whitespace-nowrap">Status</th>
                    <th className="px-6 py-3.5 whitespace-nowrap">Created</th>
                    <th className="px-6 py-3.5 whitespace-nowrap text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                  {users.map((user) => {
                    const isSelf = currentUser ? (currentUser.id === user.id || currentUser.email === user.email) : false;

                    return (
                      <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        {/* Identity Name & Email */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                user.user_type === 'ai_agent'
                                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                  : 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                              }`}
                            >
                              {user.user_type === 'ai_agent' ? <Bot className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-slate-900 dark:text-white">{user.name}</p>
                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                  {user.identifier}
                                </span>
                                {isSelf && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400">
                                    You
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">{user.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Actor Type */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                              user.user_type === 'ai_agent'
                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                                : 'bg-violet-500/10 text-violet-700 dark:text-violet-300'
                            }`}
                          >
                            {user.user_type === 'ai_agent' ? 'AI Agent' : 'Human User'}
                          </span>
                        </td>

                        {/* Roles Badges */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {user.roles.map((r) => (
                              <span
                                key={r.id}
                                className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                              >
                                {r.name}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* 2FA Security Badge */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.two_factor_enabled ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>2FA Active</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-normal px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                              <Shield className="w-3.5 h-3.5 opacity-60" />
                              <span>Off</span>
                            </span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.is_locked ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300">
                              <Lock className="w-3 h-3" />
                              <span>Locked</span>
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full ${
                                user.is_active
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {user.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              {user.is_active ? 'Active' : 'Disabled'}
                            </span>
                          )}
                        </td>

                        {/* Timestamp */}
                        <td className="px-6 py-4 whitespace-nowrap text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 opacity-60 shrink-0" />
                            <span>{new Date(user.created_at).toLocaleDateString()}</span>
                          </div>
                        </td>

                        {/* Actions: Edit, Disable 2FA, Change Password, Enable/Disable, Delete */}
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* 1. Edit User */}
                            <button
                              onClick={() => openEditModal(user)}
                              title="Edit User Details & Roles"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-violet-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            {/* 2. Admin Disable 2FA Action (if enabled) */}
                            {user.two_factor_enabled && (
                              <button
                                onClick={() => setDisable2FaConfirmUser(user)}
                                title="Disable Two-Factor Authentication"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              >
                                <ShieldOff className="w-4 h-4" />
                              </button>
                            )}

                            {/* 3. Change Password */}
                            {isSelf ? (
                              <span
                                title="To update your own password, please use Profile Settings"
                                className="p-1.5 rounded-lg text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-40"
                              >
                                <KeyRound className="w-4 h-4" />
                              </span>
                            ) : (
                              <button
                                onClick={() => openPasswordModal(user)}
                                title="Change Password Manually"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                              >
                                <KeyRound className="w-4 h-4" />
                              </button>
                            )}

                            {/* 3b. Send Password Reset Link (10-min token) */}
                            {user.user_type !== 'ai_agent' &&
                              mailHooks.is_mail_enabled &&
                              mailHooks.hook_user_pwd_change && (
                                <button
                                  onClick={() => handleSendResetLink(user)}
                                  title="Dispatch 10-Minute Secure Password Reset Link via Email"
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
                                >
                                  <Mail className="w-4 h-4" />
                                </button>
                              )}

                            {/* 3c. Resend Activation Email (if unverified / inactive) */}
                            {user.user_type !== 'ai_agent' &&
                              mailHooks.is_mail_enabled &&
                              mailHooks.hook_verify_email_on_created &&
                              (!user.is_active || !user.email_verified_at) && (
                                <button
                                  onClick={() => handleResendActivation(user)}
                                  title="Resend Account Activation Email (10-min validity)"
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                              )}

                            {/* 4. Enable / Disable Toggle (also resets lockout) */}
                            {isSelf ? (
                              <span
                                title="You cannot disable your own active administrative account"
                                className="p-1.5 rounded-lg text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-40"
                              >
                                <Power className="w-4 h-4" />
                              </span>
                            ) : (
                              <button
                                onClick={() => handleToggleStatus(user)}
                                title={user.is_active ? 'Disable Account' : 'Enable Account (Clears Lockout)'}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  user.is_active
                                    ? 'text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                                    : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                }`}
                              >
                                <Power className="w-4 h-4" />
                              </button>
                            )}

                            {/* 5. Delete (Soft delete to Recycle Bin) */}
                            {isSelf ? (
                              <span
                                title="You cannot delete your own logged-in account"
                                className="p-1.5 rounded-lg text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-40"
                              >
                                <Trash2 className="w-4 h-4" />
                              </span>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirmUser(user)}
                                title="Move to Recycle Bin"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
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
      )}

      {/* Recycle Bin View */}
      {activeTab === 'trash' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                Identities in the Recycle Bin will remain recoverable for <strong>30 days</strong> before automatic permanent deletion.
              </span>
            </div>
            <span className="font-mono text-[11px] font-semibold opacity-80">{trashedUsers.length} Trashed</span>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-sm">Loading recycle bin...</div>
            ) : trashedUsers.length === 0 ? (
              <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-sm">
                Recycle Bin is empty. No deleted identities found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="px-6 py-3.5 whitespace-nowrap">Identity</th>
                      <th className="px-6 py-3.5 whitespace-nowrap">Actor Type</th>
                      <th className="px-6 py-3.5 whitespace-nowrap">Deleted At</th>
                      <th className="px-6 py-3.5 whitespace-nowrap">Retention Window</th>
                      <th className="px-6 py-3.5 whitespace-nowrap text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                    {trashedUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        {/* Identity Name & Email */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
                              {user.user_type === 'ai_agent' ? <Bot className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-slate-900 dark:text-white line-through opacity-70">{user.name}</p>
                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                                  {user.identifier}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">{user.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Actor Type */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-[11px] font-semibold text-slate-500">
                            {user.user_type === 'ai_agent' ? 'AI Agent' : 'Human User'}
                          </span>
                        </td>

                        {/* Deleted At */}
                        <td className="px-6 py-4 whitespace-nowrap text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 opacity-60 shrink-0" />
                            <span>{new Date(user.deleted_at).toLocaleDateString()}</span>
                          </div>
                        </td>

                        {/* Retention Window */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full ${
                              user.days_remaining <= 5
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            <span>{user.days_remaining} days remaining</span>
                          </span>
                        </td>

                        {/* Recycle Bin Actions: Restore & Permanent Delete */}
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleRestoreUser(user)}
                              title="Restore Identity"
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Restore</span>
                            </button>
                            <button
                              onClick={() => setForceDeleteConfirmUser(user)}
                              title="Delete Permanently"
                              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            >
                              <Flame className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create User / AI Agent Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Create New Identity</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Add a human user or AI Agent to the system</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              {/* Actor Type Switcher */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Identity Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormUserType('user');
                      setFormRoles(['user']);
                    }}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      formUserType === 'user'
                        ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20 font-semibold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <UserIcon className="w-4 h-4" />
                    <span>Human User</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormUserType('ai_agent');
                      setFormRoles(['ai-agent']);
                    }}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      formUserType === 'ai_agent'
                        ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20 font-semibold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Bot className="w-4 h-4" />
                    <span>AI Agent Identity</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name / Agent Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={formUserType === 'ai_agent' ? 'e.g. ERP Inventory Agent' : 'e.g. John Doe'}
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Unique User ID <span className="text-[10px] font-normal text-slate-400">(Auto if blank)</span>
                  </label>
                  <input
                    type="text"
                    maxLength={20}
                    placeholder="e.g. A2C921"
                    value={formIdentifier}
                    onChange={(e) => setFormIdentifier(e.target.value.toUpperCase())}
                    className="w-full font-mono uppercase px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 placeholder:normal-case"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder={formUserType === 'ai_agent' ? 'inventory-agent@arx-erp.local' : 'john@arx-erp.local'}
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Initial Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                />
              </div>

              {/* Roles Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Assigned Roles
                </label>
                <div className="flex flex-wrap gap-2 p-3 bg-slate-100/60 dark:bg-slate-800/40 rounded-xl">
                  {roles.map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => toggleRoleSelection(role.name)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        formRoles.includes(role.name)
                          ? 'bg-violet-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {role.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Identity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal (without password & without status toggle) */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Identity</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Modify details or assigned roles for {editingUser.name}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              {/* Actor Type Switcher */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Identity Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormUserType('user')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      formUserType === 'user'
                        ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20 font-semibold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <UserIcon className="w-4 h-4" />
                    <span>Human User</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormUserType('ai_agent')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      formUserType === 'ai_agent'
                        ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20 font-semibold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Bot className="w-4 h-4" />
                    <span>AI Agent Identity</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name / Agent Identifier
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                />
              </div>

              {/* Roles Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Assigned Roles
                  </label>
                  {editingUser && currentUser && (editingUser.id === currentUser.id || editingUser.email === currentUser.email) && (
                    <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                      Self-role modifications locked
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 p-3 bg-slate-100/60 dark:bg-slate-800/40 rounded-xl">
                  {roles.map((role) => {
                    const isSelfEdit = editingUser && currentUser && (editingUser.id === currentUser.id || editingUser.email === currentUser.email);
                    return (
                      <button
                        key={role.id}
                        type="button"
                        disabled={!!isSelfEdit}
                        onClick={() => toggleRoleSelection(role.name)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          isSelfEdit ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
                        } ${
                          formRoles.includes(role.name)
                            ? 'bg-violet-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {role.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Change Password</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Update credentials for {passwordModalUser.name}</p>
                </div>
              </div>
              <button
                onClick={() => setPasswordModalUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {passwordError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Min 8 characters..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Re-type new password..."
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setPasswordModalUser(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirmation Popup: Move to Recycle Bin */}
      <ConfirmDialog
        isOpen={!!deleteConfirmUser}
        title="Move to Recycle Bin"
        message={`Are you sure you want to delete '${deleteConfirmUser?.name}' (${deleteConfirmUser?.email})? This identity will be held in the Recycle Bin for 30 days before permanent deletion, during which it can be restored.`}
        confirmText="Move to Trash"
        cancelText="Cancel"
        variant="warning"
        loading={actionLoading}
        onConfirm={handleSoftDelete}
        onCancel={() => setDeleteConfirmUser(null)}
      />

      {/* Custom Confirmation Popup: Permanent Delete */}
      <ConfirmDialog
        isOpen={!!forceDeleteConfirmUser}
        title="Permanently Delete Identity"
        message={`Are you sure you want to permanently purge '${forceDeleteConfirmUser?.name}' from the database? This action is irreversible and all associated tokens and identity records will be permanently destroyed.`}
        confirmText="Permanently Delete"
        cancelText="Keep in Trash"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleForceDelete}
        onCancel={() => setForceDeleteConfirmUser(null)}
      />

      {/* Custom Confirmation Popup: Admin Disable 2FA */}
      <ConfirmDialog
        isOpen={!!disable2FaConfirmUser}
        title="Disable Two-Factor Authentication"
        message={`Are you sure you want to disable Two-Factor Authentication for '${disable2FaConfirmUser?.name}' (${disable2FaConfirmUser?.identifier})? This will immediately revoke their TOTP authenticator key and all emergency backup recovery codes.`}
        confirmText="Disable 2FA"
        cancelText="Cancel"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleAdminDisable2Fa}
        onCancel={() => setDisable2FaConfirmUser(null)}
      />
    </div>
  );
};
