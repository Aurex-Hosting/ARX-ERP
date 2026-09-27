import React, { useState, useEffect } from 'react';
import {
  Send,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  Users,
  ShieldCheck,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Search,
  Edit3,
  X,
  MessageSquare,
  ShieldAlert,
  BarChart3,
  Mail,
} from 'lucide-react';
import api from '../../services/api';
import { BroadcastNotificationItem, NotificationActionButton } from '../../types';

interface UserOption {
  id: number;
  name: string;
  email: string;
  avatar_url?: string | null;
  user_type: string;
}

interface RoleOption {
  id: number;
  name: string;
  display_name: string;
  color?: string;
  users_count?: number;
}

const EMOJI_REACTIONS: Record<string, { label: string; emoji: string }> = {
  fire: { label: 'Fire', emoji: '🔥' },
  thumbs_up: { label: 'Thumbs Up', emoji: '👍' },
  smile: { label: 'Smile', emoji: '😊' },
  laugh: { label: 'Laugh', emoji: '😂' },
  handshake: { label: 'Handshake', emoji: '🤝' },
  cry: { label: 'Cry', emoji: '😢' },
  angry: { label: 'Angry', emoji: '😡' },
};

export const NotifyPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'history' | 'compose'>('history');
  const [historyItems, setHistoryItems] = useState<BroadcastNotificationItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(true);
  const [historyTotal, setHistoryTotal] = useState<number>(0);
  const [historyPage, setHistoryPage] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Compose / Dispatch Form State
  const [title, setTitle] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [type, setType] = useState<string>('info');
  const [enableReactions, setEnableReactions] = useState<boolean>(true);
  const [sendEmail, setSendEmail] = useState<boolean>(false);
  const [emailSubject, setEmailSubject] = useState<string>('');
  const [targetType, setTargetType] = useState<'all' | 'users' | 'roles' | 'all_except_users' | 'all_except_roles'>('all');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<(number | string)[]>([]);
  const [excludedUserIds, setExcludedUserIds] = useState<number[]>([]);
  const [excludedRoleIds, setExcludedRoleIds] = useState<(number | string)[]>([]);
  const [actionButtons, setActionButtons] = useState<NotificationActionButton[]>([]);
  const [isScheduled, setIsScheduled] = useState<boolean>(false);
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [repeatInterval, setRepeatInterval] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [sending, setSending] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Available Users & Roles for Multi-selection
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  const [allRoles, setAllRoles] = useState<RoleOption[]>([]);
  const [userSearchText, setUserSearchText] = useState<string>('');
  const [userPickerPage, setUserPickerPage] = useState<number>(1);
  const [targetRecipientCount, setTargetRecipientCount] = useState<number | null>(null);
  const [targetPreviewLoading, setTargetPreviewLoading] = useState<boolean>(false);

  // Modals & Detailed Stats
  const [selectedBroadcast, setSelectedBroadcast] = useState<BroadcastNotificationItem | null>(null);
  const [broadcastStatsData, setBroadcastStatsData] = useState<any | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(false);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<BroadcastNotificationItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [deleteFromInbox, setDeleteFromInbox] = useState<boolean>(true);

  const [metadataLoading, setMetadataLoading] = useState<boolean>(false);
  const [isEmailBroadcastEnabled, setIsEmailBroadcastEnabled] = useState<boolean>(false);

  // Fetch broadcast history
  const fetchBroadcastHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get('/admin/notifications', {
        params: {
          page: historyPage,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          type: typeFilter !== 'all' ? typeFilter : undefined,
          search: searchQuery.trim() || undefined,
        },
      });
      setHistoryItems(res.data.data || []);
      setHistoryTotal(res.data.total || 0);
    } catch (err: any) {
      console.error('Failed to load broadcast history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Fetch users & roles for picker and check mail broadcast hook status
  const fetchMetadata = async () => {
    setMetadataLoading(true);
    try {
      const usersRes = await api.get('/admin/users', { params: { per_page: 200 } });
      const rawUsers = usersRes.data.data || usersRes.data.users || usersRes.data || [];
      setAllUsers(Array.isArray(rawUsers) ? rawUsers : []);
    } catch (err) {
      console.error('Failed to load users:', err);
    }

    try {
      const rolesRes = await api.get('/admin/roles');
      const rawRoles = rolesRes.data.roles || rolesRes.data.data || rolesRes.data || [];
      setAllRoles(Array.isArray(rawRoles) ? rawRoles : []);
    } catch (err) {
      console.error('Failed to load roles:', err);
    }

    try {
      const mailRes = await api.get('/admin/mail/hooks');
      const enabled = Boolean(mailRes.data?.is_mail_enabled && mailRes.data?.hooks?.hook_notify_broadcast);
      setIsEmailBroadcastEnabled(enabled);
    } catch {
      setIsEmailBroadcastEnabled(false);
    } finally {
      setMetadataLoading(false);
    }
  };

  useEffect(() => {
    fetchBroadcastHistory();
    fetchMetadata();
  }, [historyPage, statusFilter, typeFilter]);

  // Live polling for history tab to update scheduled broadcasts as soon as they are sent
  useEffect(() => {
    if (activeTab !== 'history') return;

    const interval = setInterval(() => {
      fetchBroadcastHistory();
    }, 10000);

    return () => clearInterval(interval);
  }, [activeTab, historyPage, statusFilter, typeFilter]);

  useEffect(() => {
    if (activeTab === 'compose' || targetType !== 'all') {
      if (allUsers.length === 0 || allRoles.length === 0) {
        fetchMetadata();
      }
    }
  }, [activeTab, targetType]);

  // Preview target recipients
  useEffect(() => {
    const checkTargetPreview = async () => {
      setTargetPreviewLoading(true);
      try {
        const res = await api.get('/admin/notifications/target-preview', {
          params: {
            target_type: targetType,
            target_user_ids: targetType === 'users' ? selectedUserIds : undefined,
            target_role_ids: targetType === 'roles' ? selectedRoleIds : undefined,
            excluded_user_ids: targetType === 'all_except_users' ? excludedUserIds : undefined,
            excluded_role_ids: targetType === 'all_except_roles' ? excludedRoleIds : undefined,
          },
        });
        setTargetRecipientCount(res.data.total_recipients);
      } catch {
        setTargetRecipientCount(null);
      } finally {
        setTargetPreviewLoading(false);
      }
    };

    const timer = setTimeout(checkTargetPreview, 300);
    return () => clearTimeout(timer);
  }, [targetType, selectedUserIds, selectedRoleIds, excludedUserIds, excludedRoleIds]);

  // Add Action Button
  const handleAddActionButton = () => {
    setActionButtons([
      ...actionButtons,
      { label: '', url: '', style: 'primary', external: true },
    ]);
  };

  const handleUpdateActionButton = (index: number, field: keyof NotificationActionButton, value: any) => {
    const updated = [...actionButtons];
    updated[index] = { ...updated[index], [field]: value };
    setActionButtons(updated);
  };

  const handleRemoveActionButton = (index: number) => {
    setActionButtons(actionButtons.filter((_, idx) => idx !== index));
  };

  // Reset Compose Form
  const resetForm = () => {
    setTitle('');
    setBody('');
    setType('info');
    setEnableReactions(true);
    setSendEmail(false);
    setEmailSubject('');
    setTargetType('all');
    setSelectedUserIds([]);
    setSelectedRoleIds([]);
    setExcludedUserIds([]);
    setExcludedRoleIds([]);
    setActionButtons([]);
    setIsScheduled(false);
    setScheduledAt('');
    setRepeatInterval('none');
  };

  // Dispatch / Schedule Notification
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setStatusMessage({ type: 'error', text: 'Please fill in both the Notification Title and Message Body.' });
      return;
    }

    setSending(true);
    setStatusMessage(null);

    try {
      const payload = {
        title: title.trim(),
        body: body.trim(),
        type,
        action_buttons: actionButtons
          .filter((b) => b.label.trim() && b.url.trim())
          .map((b) => ({ ...b, external: true })),
        enable_reactions: enableReactions,
        send_email: sendEmail,
        email_subject: emailSubject.trim() || null,
        target_type: targetType,
        target_user_ids: targetType === 'users' ? selectedUserIds : [],
        target_role_ids: targetType === 'roles' ? selectedRoleIds : [],
        excluded_user_ids: targetType === 'all_except_users' ? excludedUserIds : [],
        excluded_role_ids: targetType === 'all_except_roles' ? excludedRoleIds : [],
        scheduled_at: isScheduled && scheduledAt ? new Date(scheduledAt).toISOString() : null,
        repeat_interval: repeatInterval !== 'none' ? repeatInterval : null,
      };

      const res = await api.post('/admin/notifications', payload);
      setStatusMessage({ type: 'success', text: res.data.message || 'Notification sent successfully.' });
      resetForm();
      setActiveTab('history');
      await fetchBroadcastHistory();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.response?.data?.message || 'Failed to dispatch notification.' });
    } finally {
      setSending(false);
    }
  };

  // Edit and Resend existing notification
  const handleEditAndResend = (item: BroadcastNotificationItem) => {
    setTitle(item.title);
    setBody(item.body);
    setType(item.type);
    setEnableReactions(item.enable_reactions);
    setTargetType(item.target_type);
    setSelectedUserIds(item.target_user_ids || []);
    setSelectedRoleIds(item.target_role_ids || []);
    setExcludedUserIds(item.excluded_user_ids || []);
    setExcludedRoleIds(item.excluded_role_ids || []);
    setActionButtons(item.action_buttons || []);
    setIsScheduled(false);
    setScheduledAt('');
    setRepeatInterval(item.repeat_interval || 'none');
    setActiveTab('compose');
    setStatusMessage({ type: 'success', text: `Loaded notification '${item.title}' into composer.` });
  };

  // View detailed broadcast analytics
  const handleViewStats = async (item: BroadcastNotificationItem) => {
    setSelectedBroadcast(item);
    setStatsLoading(true);
    try {
      const res = await api.get(`/admin/notifications/${item.id}`);
      setBroadcastStatsData(res.data);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Failed to load broadcast analytics.' });
    } finally {
      setStatsLoading(false);
    }
  };

  // Delete notification from history
  const handleDeleteBroadcast = async () => {
    if (!deleteConfirmItem) return;
    setDeleteLoading(true);
    try {
      const res = await api.delete(`/admin/notifications/${deleteConfirmItem.id}`, {
        params: { delete_recipients_inbox: deleteFromInbox },
      });
      setHistoryItems((prev) => prev.filter((item) => item.id !== deleteConfirmItem.id));
      setStatusMessage({
        type: 'success',
        text: res.data?.message || 'Notification removed from history.',
      });
      setDeleteConfirmItem(null);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.response?.data?.message || 'Failed to delete notification.' });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Send className="w-6 h-6 text-violet-600" />
            <span>Notify & Push Broadcasts</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Dispatch manual notifications to targeted users, roles, or entire workspace with live reactions & analytics.
          </p>
        </div>

        {/* Action Button to switch tabs */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab(activeTab === 'compose' ? 'history' : 'compose');
              setStatusMessage(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer ${
              activeTab === 'compose'
                ? 'bg-slate-800 hover:bg-slate-700 text-white'
                : 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-500/20'
            }`}
          >
            {activeTab === 'compose' ? (
              <>
                <BarChart3 className="w-4 h-4" />
                <span>View Sent History</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Create Notification</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Status Message */}
      {statusMessage && (
        <div
          className={`flex items-center justify-between p-4 rounded-2xl text-xs ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
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

      {/* COMPOSE / DISPATCH VIEW */}
      {activeTab === 'compose' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Compose Form */}
          <form onSubmit={handleSendNotification} className="lg:col-span-7 space-y-6">
            {/* Step 1: Target Audience Selection */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 shadow-sm border border-slate-100 dark:border-slate-800/60 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/60">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">1. Select Target Audience</h3>
                    <p className="text-[11px] text-slate-400">Specify who should receive this notification</p>
                  </div>
                </div>

                {/* Live Preview Badge */}
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                  <span>🎯 Recipients:</span>
                  {targetPreviewLoading ? (
                    <div className="w-3 h-3 rounded-full border border-violet-500 border-t-transparent animate-spin" />
                  ) : (
                    <span className="text-violet-600 dark:text-violet-400 font-bold">
                      {targetRecipientCount ?? '...'} users
                    </span>
                  )}
                </div>
              </div>

              {/* Target Type Selector Radio Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { id: 'all', label: 'All Users', desc: 'Deliver to all registered users' },
                  { id: 'roles', label: 'Specific Roles', desc: 'Deliver to users with selected roles' },
                  { id: 'users', label: 'Specific Users', desc: 'Deliver to individually chosen users' },
                  { id: 'all_except_roles', label: 'All Except Roles', desc: 'All users excluding specific roles' },
                  { id: 'all_except_users', label: 'All Except Users', desc: 'All users excluding specific users' },
                ].map((item) => (
                  <label
                    key={item.id}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      targetType === item.id
                        ? 'border-violet-500 bg-violet-500/5 dark:bg-violet-500/10 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="targetType"
                      value={item.id}
                      checked={targetType === item.id}
                      onChange={() => setTargetType(item.id as any)}
                      className="mt-0.5 text-violet-600 focus:ring-violet-500"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{item.label}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              {/* Roles Multi-Selector */}
              {(targetType === 'roles' || targetType === 'all_except_roles') && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {targetType === 'roles' ? 'Choose Roles to Receive:' : 'Choose Roles to Exclude:'}
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {targetType === 'roles' ? selectedRoleIds.length : excludedRoleIds.length} selected
                    </span>
                  </div>

                  {metadataLoading ? (
                    <div className="py-4 flex items-center justify-center text-xs text-slate-400 gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
                      <span>Loading available roles...</span>
                    </div>
                  ) : allRoles.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2">No roles found.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {allRoles.map((role) => {
                        const isSelected =
                          targetType === 'roles'
                            ? selectedRoleIds.includes(role.id) || selectedRoleIds.includes(role.name)
                            : excludedRoleIds.includes(role.id) || excludedRoleIds.includes(role.name);

                        return (
                          <button
                            key={role.id}
                            type="button"
                            onClick={() => {
                              if (targetType === 'roles') {
                                setSelectedRoleIds((prev) =>
                                  prev.includes(role.id) ? prev.filter((id) => id !== role.id) : [...prev, role.id]
                                );
                              } else {
                                setExcludedRoleIds((prev) =>
                                  prev.includes(role.id) ? prev.filter((id) => id !== role.id) : [...prev, role.id]
                                );
                              }
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-violet-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>{role.display_name || role.name}</span>
                            {role.users_count !== undefined && (
                              <span className="text-[10px] opacity-75">({role.users_count})</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Users Multi-Selector */}
              {(targetType === 'users' || targetType === 'all_except_users') && (() => {
                const filteredUsers = allUsers.filter(
                  (u) =>
                    u.name.toLowerCase().includes(userSearchText.toLowerCase()) ||
                    u.email.toLowerCase().includes(userSearchText.toLowerCase())
                );
                const usersPerPage = 3;
                const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / usersPerPage));
                const currentPage = Math.min(userPickerPage, totalUserPages);
                const paginatedUsers = filteredUsers.slice(
                  (currentPage - 1) * usersPerPage,
                  currentPage * usersPerPage
                );

                return (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {targetType === 'users' ? 'Select Target Users:' : 'Select Users to Exclude:'}
                      </label>
                      <span className="text-[11px] text-slate-400">
                        {targetType === 'users' ? selectedUserIds.length : excludedUserIds.length} selected
                      </span>
                    </div>

                    {/* Search input for users */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search users by name or email..."
                        value={userSearchText}
                        onChange={(e) => {
                          setUserSearchText(e.target.value);
                          setUserPickerPage(1);
                        }}
                        className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-xs border border-transparent focus:border-violet-500 focus:outline-none"
                      />
                    </div>

                    {/* Users Pick List (3 per page) */}
                    {metadataLoading ? (
                      <div className="py-6 flex items-center justify-center text-xs text-slate-400 gap-2">
                        <div className="w-4 h-4 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
                        <span>Loading available users...</span>
                      </div>
                    ) : filteredUsers.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-3 text-center">
                        {allUsers.length === 0 ? 'No users found.' : 'No users match your search.'}
                      </p>
                    ) : (
                      <div className="space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800/50">
                        {paginatedUsers.map((u) => {
                          const isSelected =
                            targetType === 'users'
                              ? selectedUserIds.includes(u.id)
                              : excludedUserIds.includes(u.id);

                          return (
                            <div
                              key={u.id}
                              onClick={() => {
                                if (targetType === 'users') {
                                  setSelectedUserIds((prev) =>
                                    prev.includes(u.id) ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                                  );
                                } else {
                                  setExcludedUserIds((prev) =>
                                    prev.includes(u.id) ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                                  );
                                }
                              }}
                              className={`flex items-center justify-between p-2.5 rounded-xl transition-colors cursor-pointer ${
                                isSelected ? 'bg-violet-500/10 dark:bg-violet-500/15' : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 flex items-center justify-center font-bold text-xs shrink-0">
                                  {u.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="truncate">
                                  <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{u.name}</p>
                                  <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                                </div>
                              </div>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="rounded text-violet-600 focus:ring-violet-500 w-4 h-4 cursor-pointer"
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Pagination Controls (< Previous / Next >) */}
                    {filteredUsers.length > 0 && (
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60">
                        <button
                          type="button"
                          disabled={currentPage <= 1}
                          onClick={() => setUserPickerPage((p) => Math.max(1, p - 1))}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          <span>Previous</span>
                        </button>

                        <span className="text-[11px] text-slate-400 font-medium">
                          Page {currentPage} of {totalUserPages} ({filteredUsers.length} users)
                        </span>

                        <button
                          type="button"
                          disabled={currentPage >= totalUserPages}
                          onClick={() => setUserPickerPage((p) => Math.min(totalUserPages, p + 1))}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                        >
                          <span>Next</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Step 2: Content & Customization */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 shadow-sm border border-slate-100 dark:border-slate-800/60 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800/60">
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">2. Message Content & Tone</h3>
                  <p className="text-[11px] text-slate-400">Design the notification appearance, links, and buttons</p>
                </div>
              </div>

              {/* Title & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Notification Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Scheduled System Upgrade Tonight"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700 focus:border-violet-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Category / Tone</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700 focus:border-violet-500 focus:outline-none capitalize"
                  >
                    <option value="info">Info (Blue)</option>
                    <option value="success">Success (Emerald)</option>
                    <option value="warning">Warning (Amber)</option>
                    <option value="danger">Critical / Danger (Rose)</option>
                    <option value="announcement">Announcement (Violet)</option>
                    <option value="security">Security Alert (Indigo)</option>
                  </select>
                </div>
              </div>

              {/* Message Body */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Message Description / Body *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Enter detailed notification content here..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700 focus:border-violet-500 focus:outline-none leading-relaxed"
                />
              </div>

              {/* Action Buttons Builder */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Call-to-Action Buttons (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddActionButton}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Button</span>
                  </button>
                </div>

                {actionButtons.map((btn, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                    <input
                      type="text"
                      placeholder="Button Label (e.g. View Logs)"
                      value={btn.label}
                      onChange={(e) => handleUpdateActionButton(index, 'label', e.target.value)}
                      className="w-1/3 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700 focus:border-violet-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Target URL (e.g. https://example.com or /admin/users)"
                      value={btn.url}
                      onChange={(e) => handleUpdateActionButton(index, 'url', e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700 focus:border-violet-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveActionButton(index)}
                      className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Remove button"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Enable Reactions Toggle */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-slate-900 dark:text-white">Enable Emoji Reactions</label>
                  <p className="text-[11px] text-slate-400">
                    Allow recipients to react with: 🔥 👍 😊 😂 🤝 😢 😡
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableReactions}
                    onChange={(e) => setEnableReactions(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-violet-600" />
                </label>
              </div>
            </div>

            {/* Step 3: Scheduling & Recurrence */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 shadow-sm border border-slate-100 dark:border-slate-800/60 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800/60">
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">3. Delivery Schedule & Repeat</h3>
                  <p className="text-[11px] text-slate-400">Send immediately or schedule for future dispatch</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Immediate vs Schedule */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Delivery Timing</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsScheduled(false)}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        !isScheduled
                          ? 'bg-violet-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Send Immediately
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsScheduled(true)}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isScheduled
                          ? 'bg-violet-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Schedule Later
                    </button>
                  </div>
                </div>

                {/* Recurrence / Repeat */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Repeat Interval</label>
                  <select
                    value={repeatInterval}
                    onChange={(e) => setRepeatInterval(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700 focus:border-violet-500 focus:outline-none"
                  >
                    <option value="none">One-time (No repeat)</option>
                    <option value="daily">Repeat Daily</option>
                    <option value="weekly">Repeat Weekly</option>
                    <option value="monthly">Repeat Monthly</option>
                  </select>
                </div>
              </div>

              {isScheduled && (
                <div className="pt-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Target Date & Time</label>
                  <input
                    type="datetime-local"
                    required={isScheduled}
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700 focus:border-violet-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Step 4: Dual-Channel Email Delivery (Optional) */}
            {isEmailBroadcastEnabled && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 shadow-sm border border-slate-100 dark:border-slate-800/60 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Also Send via Email Announcement</h3>
                      <p className="text-[11px] text-slate-400">Deliver this announcement directly to recipients' email inboxes</p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendEmail}
                      onChange={(e) => setSendEmail(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600" />
                  </label>
                </div>

                {sendEmail && (
                  <div className="pt-2 space-y-1 animate-in fade-in">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Custom Email Subject (Optional)</label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder={title || 'Leave blank to use broadcast title as subject'}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Clear Form
              </button>
              <button
                type="submit"
                disabled={sending}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-500/25 transition-all cursor-pointer disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Dispatching...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>{isScheduled ? 'Schedule Notification' : 'Send Notification Now'}</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Real-Time Live Preview Mockup Card */}
          <div className="lg:col-span-5 sticky top-20 space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800/60 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/60">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  <Eye className="w-4 h-4 text-violet-500" />
                  <span>Real-Time Live Preview</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                  Recipient View
                </span>
              </div>

              {/* Rendered Mockup Box */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 space-y-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${
                      type === 'warning'
                        ? 'bg-amber-500/10 text-amber-500'
                        : type === 'danger'
                        ? 'bg-rose-500/10 text-rose-500'
                        : type === 'success'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : type === 'security'
                        ? 'bg-indigo-500/10 text-indigo-500'
                        : 'bg-violet-500/10 text-violet-500'
                    }`}
                  >
                    {type === 'warning' || type === 'danger' ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : type === 'security' ? (
                      <ShieldAlert className="w-4 h-4" />
                    ) : type === 'success' ? (
                      <Flame className="w-4 h-4" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] uppercase font-bold text-violet-600 dark:text-violet-400">
                        {type}
                      </span>
                      <span className="text-[10px] text-slate-400">Just now</span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {title || 'Your Notification Title'}
                    </h4>

                    <p className="text-[11px] text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                      {body || 'This is how your notification body will appear to users in their inbox and drop-down notification bell panel.'}
                    </p>

                    {/* Buttons in Preview */}
                    {actionButtons.filter((b) => b.label.trim()).length > 0 && (
                      <div className="flex items-center gap-2 pt-2 flex-wrap">
                        {actionButtons
                          .filter((b) => b.label.trim())
                          .map((btn, idx) => (
                            <button
                              key={idx}
                              type="button"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-600 text-white text-[10px] font-semibold"
                            >
                              <span>{btn.label}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          ))}
                      </div>
                    )}

                    {/* Reactions Bar in Preview */}
                    {enableReactions && (
                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 mt-2 flex items-center gap-1 flex-wrap">
                        {Object.entries(EMOJI_REACTIONS).map(([key, val]) => (
                          <span
                            key={key}
                            className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                          >
                            {val.emoji}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BROADCAST HISTORY VIEW */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Controls & Filter Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800/60 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search sent broadcasts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') fetchBroadcastHistory();
                  }}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/70 text-xs border border-transparent focus:border-violet-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Type Filter */}
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs border border-transparent focus:border-violet-500 focus:outline-none capitalize"
                >
                  <option value="all">All Types</option>
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="danger">Danger</option>
                  <option value="announcement">Announcement</option>
                  <option value="security">Security</option>
                </select>

                {/* Status Filter Tabs */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/70 rounded-xl text-xs overflow-x-auto">
                  {[
                    { id: 'all', label: 'All Status' },
                    { id: 'sent', label: 'Sent' },
                    { id: 'scheduled', label: 'Scheduled' },
                    { id: 'draft', label: 'Draft' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setStatusFilter(st.id)}
                      className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer ${
                        statusFilter === st.id
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* History Cards / Table */}
          {historyLoading ? (
            <div className="py-16 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
            </div>
          ) : historyItems.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center text-slate-400 text-xs shadow-sm border border-slate-100 dark:border-slate-800/60">
              <Send className="w-10 h-10 opacity-30 mx-auto mb-2 text-slate-400" />
              <p className="font-semibold text-sm text-slate-600 dark:text-slate-300">No sent broadcasts found</p>
              <p className="text-slate-400 max-w-sm mx-auto mt-1">
                Dispatch your first notification to users or roles using the "Create Notification" button.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {historyItems.map((item) => {
                const totalRecipients = item.recipients_count || 0;
                const readCount = item.read_count || 0;
                const readRate = item.read_rate || 0;
                const totalReactions = item.total_reactions || 0;

                return (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-violet-500/10 text-violet-600 dark:text-violet-400">
                            {item.type}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                              item.status === 'sent'
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : item.status === 'scheduled'
                                ? 'bg-amber-500/10 text-amber-600 animate-pulse'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {item.status}
                          </span>

                          {item.repeat_interval && item.repeat_interval !== 'none' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/10 text-cyan-600 capitalize">
                              Repeats {item.repeat_interval}
                            </span>
                          )}

                          <span className="text-xs text-slate-400 font-medium">
                            {item.status === 'scheduled' && item.scheduled_at ? (
                              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                Scheduled for: {new Date(item.scheduled_at).toLocaleString()}
                              </span>
                            ) : item.status === 'sent' && item.sent_at ? (
                              <span>Sent: {new Date(item.sent_at).toLocaleString()}</span>
                            ) : (
                              <span>Created: {new Date(item.created_at).toLocaleString()}</span>
                            )}
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {item.title}
                        </h3>

                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {item.body}
                        </p>
                      </div>

                      {/* Action Menu */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleViewStats(item)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                        >
                          <BarChart3 className="w-3.5 h-3.5 text-violet-500" />
                          <span>Analytics</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEditAndResend(item)}
                          title="Edit & Resend"
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/60 text-xs font-semibold transition-all cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Resend</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setDeleteFromInbox(true);
                            setDeleteConfirmItem(item);
                          }}
                          title="Delete from history"
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Stats & Reactions Summary Row */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      {/* Metric Chips */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                          <Users className="w-3.5 h-3.5 text-violet-500" />
                          <span>
                            Target: <strong className="capitalize">{item.target_type.replace(/_/g, ' ')}</strong> ({totalRecipients} {item.status === 'scheduled' ? 'target recipients' : 'recipients'})
                          </span>
                        </span>

                        <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                          {item.status === 'scheduled' ? (
                            <>
                              <Calendar className="w-3.5 h-3.5 text-amber-500" />
                              <span className="text-amber-600 dark:text-amber-400 font-medium">Pending automated dispatch</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              <span>Read Rate: <strong>{readCount} / {totalRecipients} ({readRate}%)</strong></span>
                            </>
                          )}
                        </span>
                      </div>

                      {/* Emoji Reactions Breakdown Pills */}
                      {item.enable_reactions && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.reactions_summary &&
                            Object.entries(item.reactions_summary)
                              .filter(([_, r]) => r.count > 0)
                              .map(([key, r]) => (
                                <span
                                  key={key}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold"
                                >
                                  <span>{r.emoji}</span>
                                  <span>{r.count}</span>
                                </span>
                              ))}
                          {totalReactions === 0 && (
                            <span className="text-[11px] text-slate-400">No reactions yet</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Pagination Controls */}
              {historyTotal > 15 && (
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/60 text-xs text-slate-500">
                  <span>Showing {historyItems.length} of {historyTotal} broadcasts</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={historyPage <= 1}
                      onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      Previous
                    </button>
                    <span className="px-2 font-medium">{historyPage}</span>
                    <button
                      type="button"
                      disabled={historyItems.length < 15}
                      onClick={() => setHistoryPage((p) => p + 1)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ANALYTICS & DETAILS MODAL */}
      {selectedBroadcast && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Broadcast Analytics</h3>
                  <p className="text-xs text-slate-400">{selectedBroadcast.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedBroadcast(null);
                  setBroadcastStatsData(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {statsLoading ? (
              <div className="py-12 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
              </div>
            ) : broadcastStatsData ? (
              <div className="space-y-5">
                {/* 3 Metric Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-center">
                    <p className="text-[11px] text-slate-400">Total Recipients</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                      {broadcastStatsData.total_recipients}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Read / Viewed</p>
                    <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                      {broadcastStatsData.read_count} ({broadcastStatsData.read_rate}%)
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-center">
                    <p className="text-[11px] text-violet-600 dark:text-violet-400">Total Reactions</p>
                    <p className="text-xl font-bold text-violet-600 dark:text-violet-400 mt-1">
                      {broadcastStatsData.total_reactions}
                    </p>
                  </div>
                </div>

                {/* Reactions Breakdown List */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Reactions Breakdown
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {broadcastStatsData.reactions_summary &&
                      Object.entries(broadcastStatsData.reactions_summary).map(([key, r]: any) => (
                        <div
                          key={key}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs"
                        >
                          <span className="text-base">{r.emoji}</span>
                          <span className="capitalize font-semibold text-slate-700 dark:text-slate-300">{r.key}:</span>
                          <span className="font-bold text-violet-600 dark:text-violet-400">{r.count}</span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Recent Readers Sample */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Recent Views
                  </h4>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800/40 text-xs">
                    {broadcastStatsData.recent_readers?.length > 0 ? (
                      broadcastStatsData.recent_readers.map((reader: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between py-1.5">
                          <span className="font-medium text-slate-900 dark:text-white">{reader.name}</span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(reader.read_at).toLocaleString()}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 text-xs">No user view timestamps recorded yet.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Delete Broadcast Confirm Dialog with Receiver Inbox Toggle */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 border border-slate-200/80 dark:border-slate-800/80">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                    Remove Broadcast Notification
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Broadcast #{deleteConfirmItem.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                disabled={deleteLoading}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content & Warning */}
            <div className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Are you sure you want to delete <span className="font-semibold text-slate-900 dark:text-white">"{deleteConfirmItem.title}"</span> from broadcast history? This action cannot be undone.
              </p>

              {/* Toggle: Also delete from receivers' inboxes */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <label htmlFor="delete-inbox-toggle" className="text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer block">
                    Also delete from receivers' inboxes
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                    Purges this notification from all recipients' notification centers immediately.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    id="delete-inbox-toggle"
                    type="checkbox"
                    checked={deleteFromInbox}
                    onChange={(e) => setDeleteFromInbox(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-rose-600" />
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                disabled={deleteLoading}
                className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteBroadcast}
                disabled={deleteLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold shadow-md shadow-rose-500/20 bg-rose-600 hover:bg-rose-700 text-white transition-all cursor-pointer disabled:opacity-50"
              >
                {deleteLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete from History</span>
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

export default NotifyPage;
