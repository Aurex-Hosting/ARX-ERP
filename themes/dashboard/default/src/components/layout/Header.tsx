import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Bell,
  BellRing,
  Moon,
  Sun,
  LogOut,
  Shield,
  Menu,
  Clock,
  ChevronDown,
  User as UserIcon,
  Mail,
  Copy,
  Check,
  CheckCheck,
  Flame,
  ShieldAlert,
  AlertTriangle,
  Info,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Inbox,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import { NotificationItem } from '../../types';

interface HeaderProps {
  onToggleSidebar: () => void;
  onNavigate?: (path: string) => void;
}

const DigitalClock: React.FC<{ timezone?: string }> = ({ timezone }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  let timeStr = '';
  let dateStr = '';

  try {
    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      ...(timezone ? { timeZone: timezone } : {}),
    };
    timeStr = time.toLocaleTimeString('en-US', options);

    const dateOptions: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      ...(timezone ? { timeZone: timezone } : {}),
    };
    dateStr = time.toLocaleDateString('en-US', dateOptions);
  } catch {
    timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    dateStr = time.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 text-xs shadow-sm select-none">
      <Clock className="w-3.5 h-3.5 text-violet-500 dark:text-violet-400 shrink-0" />
      <span className="font-mono font-semibold tracking-tight text-slate-900 dark:text-slate-100">
        {timeStr}
      </span>
      <span className="text-slate-300 dark:text-slate-700 font-light">|</span>
      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
        {dateStr}
      </span>
    </div>
  );
};

const getUserRoleMeta = (user: any) => {
  if (!user) {
    return {
      label: 'Guest',
      colorClass: 'text-slate-500 dark:text-slate-400',
      bgClass: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
      badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
      ringClass: 'ring-slate-500/30',
      avatarRing: 'ring-slate-400/40',
      dotClass: 'bg-slate-400',
    };
  }

  if (user.is_super_admin || user.roles?.some((r: string) => r.toLowerCase().includes('super'))) {
    return {
      label: 'Super Admin',
      colorClass: 'text-rose-600 dark:text-rose-400',
      bgClass: 'bg-rose-500/10 dark:bg-rose-500/15 border-rose-500/30',
      badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
      ringClass: 'ring-rose-500/50',
      avatarRing: 'ring-rose-500/60',
      dotClass: 'bg-rose-500',
    };
  }

  if (user.user_type === 'ai_agent' || user.roles?.some((r: string) => r.toLowerCase().includes('agent'))) {
    return {
      label: 'AI Agent',
      colorClass: 'text-amber-600 dark:text-amber-400',
      bgClass: 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/30',
      badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
      ringClass: 'ring-amber-500/50',
      avatarRing: 'ring-amber-500/60',
      dotClass: 'bg-amber-500',
    };
  }

  if (user.roles?.some((r: string) => r.toLowerCase().includes('admin'))) {
    return {
      label: 'Admin',
      colorClass: 'text-violet-600 dark:text-violet-400',
      bgClass: 'bg-violet-500/10 dark:bg-violet-500/15 border-violet-500/30',
      badgeClass: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30',
      ringClass: 'ring-violet-500/50',
      avatarRing: 'ring-violet-500/60',
      dotClass: 'bg-violet-500',
    };
  }

  if (user.roles?.some((r: string) => r.toLowerCase().includes('manager'))) {
    return {
      label: 'Manager',
      colorClass: 'text-emerald-600 dark:text-emerald-400',
      bgClass: 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/30',
      badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      ringClass: 'ring-emerald-500/50',
      avatarRing: 'ring-emerald-500/60',
      dotClass: 'bg-emerald-500',
    };
  }

  const roleName = user.roles?.[0] || 'User';
  return {
    label: roleName,
    colorClass: 'text-cyan-600 dark:text-cyan-400',
    bgClass: 'bg-cyan-500/10 dark:bg-cyan-500/15 border-cyan-500/30',
    badgeClass: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
    ringClass: 'ring-cyan-500/50',
    avatarRing: 'ring-cyan-500/60',
    dotClass: 'bg-cyan-500',
  };
};

const formatTimeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const getNotificationIcon = (type: string, category: string) => {
  if (category === 'login_alert' || type === 'security') {
    return <ShieldAlert className="w-4 h-4 text-amber-500" />;
  }
  if (type === 'danger') {
    return <AlertTriangle className="w-4 h-4 text-rose-500" />;
  }
  if (type === 'warning') {
    return <AlertTriangle className="w-4 h-4 text-amber-500" />;
  }
  if (type === 'announcement') {
    return <Sparkles className="w-4 h-4 text-violet-500" />;
  }
  if (type === 'success') {
    return <Flame className="w-4 h-4 text-emerald-500" />;
  }
  return <Info className="w-4 h-4 text-blue-500" />;
};

const REACTION_EMOJIS: Record<string, string> = {
  fire: '🔥',
  thumbs_up: '👍',
  smile: '😊',
  laugh: '😂',
  handshake: '🤝',
  cry: '😢',
  angry: '😡',
};

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, onNavigate }) => {
  const { user, logout } = useAuth();
  const { mode, toggleTheme, settings } = useTheme();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Notification State
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread' | 'alerts'>('all');

  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const roleMeta = getUserRoleMeta(user);

  // Fetch unread count & notifications
  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data.unread_count || 0);
    } catch {
      // Ignore background fetch error
    }
  };

  const fetchRecentNotifications = async () => {
    try {
      setNotifLoading(true);
      const res = await api.get('/notifications', {
        params: {
          per_page: 12,
          status: notifFilter === 'unread' ? 'unread' : undefined,
          category: notifFilter === 'alerts' ? 'login_alert' : undefined,
        },
      });
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch {
      // Ignore background fetch error
    } finally {
      setNotifLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (showNotifMenu) {
      fetchRecentNotifications();
    }
  }, [showNotifMenu, notifFilter]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifMenu(false);
      }
    };
    if (showProfileMenu || showNotifMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileMenu, showNotifMenu]);

  const handleCopyId = () => {
    const userId = user?.identifier || (user?.id ? `#${user.id}` : '#USR-001');
    navigator.clipboard.writeText(userId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Ignore error
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch {
      // Ignore error
    }
  };

  const handleReact = async (id: number, emojiKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await api.post(`/notifications/${id}/react`, { reaction: emojiKey });
      setNotifications((prev) =>
        prev.map((n) => {
          if (n.id === id) {
            return {
              ...n,
              user_reaction: res.data.user_reaction,
              reactions_summary: res.data.reactions_summary,
            };
          }
          return n;
        })
      );
    } catch {
      // Ignore error
    }
  };

  const handleNotificationClick = (item: NotificationItem, btn?: any, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (!item.is_read) {
      handleMarkAsRead(item.id);
    }

    const actionBtn = btn || (item.action_buttons && item.action_buttons.length > 0 ? item.action_buttons[0] : null);

    if (actionBtn) {
      if (actionBtn.external && actionBtn.url && actionBtn.url.startsWith('http')) {
        window.open(actionBtn.url, '_blank', 'noopener,noreferrer');
        return;
      }

      if (
        actionBtn.action_tab === 'login-history' ||
        actionBtn.action_subtab === 'history' ||
        actionBtn.url === '/login-history' ||
        item.category === 'login_alert'
      ) {
        setShowNotifMenu(false);
        sessionStorage.setItem('arx_target_profile_tab', 'history');
        window.location.hash = 'history';
        onNavigate?.('/profile');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('arx:navigate-profile-tab', { detail: 'history' }));
        }, 50);
        return;
      }

      if (actionBtn.action_tab === 'profile' || actionBtn.url?.includes('profile')) {
        setShowNotifMenu(false);
        const targetSubtab = actionBtn.action_subtab || 'notifications';
        sessionStorage.setItem('arx_target_profile_tab', targetSubtab);
        window.location.hash = targetSubtab;
        onNavigate?.('/profile');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('arx:navigate-profile-tab', { detail: targetSubtab }));
        }, 50);
        return;
      }

      if (actionBtn.url && actionBtn.url.startsWith('http')) {
        window.open(actionBtn.url, '_blank', 'noopener,noreferrer');
        return;
      }

      if (actionBtn.url && actionBtn.url !== '/') {
        setShowNotifMenu(false);
        onNavigate?.(actionBtn.url);
        return;
      }
    }

    if (item.category === 'login_alert') {
      setShowNotifMenu(false);
      sessionStorage.setItem('arx_target_profile_tab', 'history');
      window.location.hash = 'history';
      onNavigate?.('/profile');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('arx:navigate-profile-tab', { detail: 'history' }));
      }, 50);
    }
  };

  return (
    <header className="h-16 shrink-0 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Mobile Toggle & Global Search Bar */}
      <div className="flex items-center gap-3">
        {/* Hamburger Menu Button (Mobile & Tablet) */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Input */}
        <div className="relative w-48 sm:w-64 md:w-80 hidden sm:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search modules, records..."
            className="w-full bg-slate-100 dark:bg-slate-900 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
          />
        </div>
      </div>

      {/* Right Quick Nav Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Top Bar Quick Links (Always open in new tab) */}
        {settings.quick_links_topbar && settings.quick_links_topbar.length > 0 && (
          <div className="hidden lg:flex items-center gap-2">
            {settings.quick_links_topbar
              .filter((link) => Boolean(link.name?.trim() && link.url?.trim()))
              .map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={link.name}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800/60 shadow-xs transition-all"
                >
                  {link.icon_url ? (
                    <img src={link.icon_url} alt={link.name} className="w-3.5 h-3.5 object-contain shrink-0" />
                  ) : (
                    <ExternalLink className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                  )}
                  <span className="truncate max-w-[120px]">{link.name}</span>
                </a>
              ))}
          </div>
        )}

        {/* Digital Clock with Live Date (App Timezone) */}
        <DigitalClock timezone={settings?.timezone || (user as any)?.timezone} />

        {/* Dark / Light Mode Switcher */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${mode === 'dark' ? 'Light' : 'Dark'} Mode`}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer"
        >
          {mode === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-violet-600" />
          )}
        </button>

        {/* Notification Bell Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            title="Notifications"
            className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            {unreadCount > 0 ? (
              <BellRing className="w-4 h-4 text-violet-600 dark:text-violet-400 animate-wiggle" />
            ) : (
              <Bell className="w-4 h-4" />
            )}

            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-900 animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Frosted Glass Notification Dropdown */}
          {showNotifMenu && (
            <div className="absolute right-0 mt-3 w-80 sm:w-96 backdrop-blur-2xl bg-white/95 dark:bg-slate-900/95 rounded-3xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 border border-slate-200/80 dark:border-slate-800/80 overflow-hidden text-slate-900 dark:text-slate-100">
              {/* Header */}
              <div className="px-4 py-3 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Notifications</h4>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/15 text-violet-600 dark:text-violet-400">
                      {unreadCount} new
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1 text-[11px] font-medium text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
                  >
                    <CheckCheck className="w-3 h-3" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center px-3 pt-2 pb-1 border-b border-slate-100 dark:border-slate-800/40 gap-1 bg-slate-50/50 dark:bg-slate-900/50 text-[11px]">
                {(['all', 'unread', 'alerts'] as const).map((filterKey) => (
                  <button
                    key={filterKey}
                    onClick={() => setNotifFilter(filterKey)}
                    className={`px-2.5 py-1 rounded-lg font-medium capitalize transition-all cursor-pointer ${
                      notifFilter === filterKey
                        ? 'bg-violet-600 text-white shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {filterKey === 'alerts' ? 'Security' : filterKey}
                  </button>
                ))}
              </div>

              {/* Notification List */}
              <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                {notifLoading ? (
                  <div className="py-8 flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="py-10 px-4 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                    <Inbox className="w-8 h-8 opacity-40 text-slate-400" />
                    <span>No notifications found in this view.</span>
                  </div>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={`p-3.5 transition-colors cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                        !item.is_read ? 'bg-violet-500/5 dark:bg-violet-500/10' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 mt-0.5">
                          {getNotificationIcon(item.type, item.category)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h5 className={`text-xs font-semibold truncate ${!item.is_read ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                              {item.title}
                            </h5>
                            <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                              {formatTimeAgo(item.created_at)}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                            {item.body}
                          </p>

                          {/* Action Buttons if present */}
                          {item.action_buttons && item.action_buttons.length > 0 && (
                            <div className="flex items-center gap-2 mt-2">
                              {item.action_buttons.map((btn, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={(e) => handleNotificationClick(item, btn, e)}
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                                >
                                  <span>{btn.label}</span>
                                  {btn.external ? <ExternalLink className="w-2.5 h-2.5" /> : null}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Reactions Picker if enabled */}
                          {item.enable_reactions && (
                            <div className="flex items-center gap-1 mt-2.5 flex-wrap">
                              {Object.entries(REACTION_EMOJIS).map(([key, emoji]) => {
                                const isUserReacted = item.user_reaction === key;
                                const count = item.reactions_summary?.[key]?.count || 0;
                                return (
                                  <button
                                    key={key}
                                    type="button"
                                    onClick={(e) => handleReact(item.id, key, e)}
                                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] transition-all cursor-pointer ${
                                      isUserReacted
                                        ? 'bg-violet-500/20 border border-violet-500/40 text-slate-900 dark:text-white scale-105'
                                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-transparent'
                                    }`}
                                  >
                                    <span>{emoji}</span>
                                    {count > 0 && (
                                      <span className="text-[10px] font-bold opacity-80">{count}</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Unread indicator dot */}
                        {!item.is_read && (
                          <span className="w-2 h-2 rounded-full bg-violet-600 shrink-0 mt-1.5" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="p-2.5 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200/60 dark:border-slate-800/60 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowNotifMenu(false);
                    sessionStorage.setItem('arx_target_profile_tab', 'notifications');
                    window.location.hash = 'notifications';
                    onNavigate?.('/profile');
                    setTimeout(() => {
                      window.dispatchEvent(new CustomEvent('arx:navigate-profile-tab', { detail: 'notifications' }));
                    }, 50);
                  }}
                  className="w-full flex items-center justify-center gap-1 py-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-500 transition-colors cursor-pointer"
                >
                  <span>View All in Profile</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Button & Glassy Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${roleMeta.bgClass} hover:opacity-95 shadow-sm`}
          >
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name}
                className="w-7 h-7 rounded-lg object-cover shadow-sm"
              />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-slate-900 text-slate-100 flex items-center justify-center font-bold text-xs shadow-sm">
                {user?.name?.charAt(0) || 'U'}
              </div>
            )}

            <div className="text-left hidden sm:block">
              <p className="text-xs font-bold leading-tight truncate max-w-[140px] text-slate-900 dark:text-slate-100">
                {user?.name || 'User'}
              </p>
              <span className={`text-[10px] font-semibold leading-none flex items-center gap-1 mt-0.5 ${roleMeta.colorClass}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${roleMeta.dotClass}`} />
                {roleMeta.label}
              </span>
            </div>

            <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-0.5 hidden sm:block" />
          </button>

          {/* Frosted Glass Profile Dropdown */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-3 w-72 backdrop-blur-2xl bg-white/95 dark:bg-slate-900/95 rounded-3xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 border border-slate-200/80 dark:border-slate-800/80 overflow-hidden text-slate-900 dark:text-slate-100">
              {/* Top Banner */}
              <div className="relative h-20 w-full bg-slate-900 dark:bg-slate-950 overflow-hidden">
                {user?.banner_url ? (
                  <img
                    src={user.banner_url}
                    alt="Profile Banner"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <>
                    <div className="absolute -top-6 -left-6 w-32 h-32 bg-violet-600/25 rounded-full blur-xl pointer-events-none" />
                    <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-indigo-600/25 rounded-full blur-xl pointer-events-none" />
                  </>
                )}
              </div>

              {/* Profile Pic Halfway Centered */}
              <div className="relative -mt-9 flex justify-center">
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    className={`w-18 h-18 rounded-full object-cover ring-4 ring-white dark:ring-slate-900 shadow-xl ${roleMeta.avatarRing}`}
                  />
                ) : (
                  <div className={`w-18 h-18 rounded-full bg-slate-800 dark:bg-slate-800 ring-4 ring-white dark:ring-slate-900 shadow-xl flex items-center justify-center text-slate-100 font-bold text-xl select-none ${roleMeta.avatarRing}`}>
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                )}
              </div>

              {/* Centered User Info */}
              <div className="px-5 pt-2 pb-3.5 text-center space-y-1.5 border-b border-slate-200/60 dark:border-slate-800/60">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                  {user?.name}
                </h4>

                {/* Role Badge */}
                <div className="flex justify-center">
                  <span className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-0.5 rounded-full font-semibold border ${roleMeta.badgeClass}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${roleMeta.dotClass}`} />
                    {roleMeta.label}
                  </span>
                </div>

                {/* Spoiled Email (Blurred with Hover Reveal) */}
                <div className="pt-1 group relative flex justify-center">
                  <div
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100/90 dark:bg-slate-800/70 text-[11px] text-slate-600 dark:text-slate-300 font-mono transition-all duration-200 cursor-pointer select-none hover:bg-slate-200 dark:hover:bg-slate-800"
                    title="Hover to reveal email"
                  >
                    <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="filter blur-[3.5px] group-hover:blur-none transition-all duration-200">
                      {user?.email || 'user@example.com'}
                    </span>
                  </div>
                </div>

                {/* Copyable User ID */}
                <div className="pt-0.5 flex justify-center">
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-100/80 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 text-[10px] text-slate-500 dark:text-slate-400 font-mono transition-colors cursor-pointer"
                    title="Click to copy User ID"
                  >
                    <span>ID: {user?.identifier || (user?.id ? `#${user.id}` : '#USR-001')}</span>
                    {copiedId ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" />
                    )}
                    {copiedId && <span className="text-emerald-500 font-sans font-semibold text-[9px]">Copied!</span>}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-3 space-y-2">
                {/* Row 1: Update & Logout */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onNavigate?.('/profile');
                    }}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs shadow-md shadow-violet-500/20 transition-all cursor-pointer"
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>Update</span>
                  </button>

                  <button
                    onClick={() => logout()}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs shadow-md shadow-rose-500/20 transition-all cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                </div>

                {/* Row 2: Admin Panel (if user has permissions) */}
                {(user?.is_super_admin || user?.roles?.some((r: string) => r.toLowerCase().includes('admin'))) && (
                  <a
                    href="/admin"
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium text-xs border border-slate-700/80 dark:border-slate-700 shadow-sm transition-all text-center"
                  >
                    <Shield className="w-3.5 h-3.5 text-rose-400" />
                    <span>Admin Panel</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
