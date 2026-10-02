import React from 'react';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  KeyRound,
  Box,
  Palette,
  Archive,
  FileText,
  History,
  Activity,
  ShieldAlert,
  Send,
  Mail,
  RefreshCw,
  X,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

interface AdminSidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const { currentLogo, settings } = useTheme();

  const isSuperAdmin = Boolean(user?.is_super_admin);
  const perms = (user?.permissions as string[]) || [];

  const hasItemAccess = (id: string): boolean => {
    if (isSuperAdmin) return true;
    switch (id) {
      case 'overview':
      case 'system':
      case 'health':
        return true;
      case 'notify':
        return perms.some((p) => p.startsWith('notifications.'));
      case 'mail-setup':
        return perms.some((p) => p.startsWith('mail.'));
      case 'users':
        return perms.some((p) => p.startsWith('users.'));
      case 'roles':
        return perms.some((p) => p.startsWith('roles.'));
      case 'api-keys':
        return perms.some((p) => p.startsWith('api.'));
      case 'modules':
        return perms.some((p) => p.startsWith('modules.'));
      case 'themes':
        return perms.some((p) => p.startsWith('themes.'));
      case 'backups':
        return perms.some((p) => p.startsWith('backups.'));
      case 'updates':
        return isSuperAdmin || perms.some((p) => p.startsWith('updates.'));
      case 'audit-logs':
        return perms.some((p) => p.startsWith('audit_logs.'));
      case 'login-history':
        return perms.some((p) => p.startsWith('login_history.'));
      case 'approvals':
        return perms.some((p) => p.startsWith('ai_agents.') || p.startsWith('mcp.'));
      default:
        return true;
    }
  };

  const menuItems = [
    { id: 'overview', label: 'System Overview', icon: LayoutDashboard },
    { id: 'notify', label: 'Notify & Broadcasts', icon: Send },
    { id: 'mail-setup', label: 'Mail Setup (SMTP)', icon: Mail },
    { id: 'users', label: 'Users & Identities', icon: Users },
    { id: 'roles', label: 'Roles & Permissions', icon: ShieldCheck },
    { id: 'api-keys', label: 'Application APIs', icon: KeyRound },
    { id: 'modules', label: 'Modules Manager', icon: Box },
    { id: 'themes', label: 'Theme Manager', icon: Palette },
    { id: 'backups', label: 'Backup & Restore', icon: Archive },
    { id: 'updates', label: 'System Updates', icon: RefreshCw },
    { id: 'audit-logs', label: 'Audit Trail', icon: FileText },
    { id: 'login-history', label: 'Login History', icon: History },
    { id: 'approvals', label: 'AI Approval Queue', icon: ShieldAlert },
    { id: 'system', label: 'System', icon: Activity },
  ];

  const visibleMenuItems = menuItems.filter((item) => hasItemAccess(item.id));

  const handleItemClick = (id: string) => {
    onSelectTab(id);
    onClose();
  };

  return (
    <>
      {/* Mobile & Tablet Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 lg:w-64 bg-slate-50 dark:bg-slate-950 flex flex-col h-screen shrink-0 transform transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Centered Brand Header with Close button on Mobile */}
        <div className="pt-8 pb-6 px-6 flex flex-col items-center justify-center text-center gap-3 relative">
          <button
            onClick={onClose}
            className="lg:hidden absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>

          <img
            src={currentLogo}
            alt={settings.company_name || 'ARX-ERP'}
            className="w-16 h-16 rounded-full shadow-md shrink-0 object-contain"
          />
          <h1 className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white truncate max-w-[200px]">
            {settings.company_name || 'ARX-ERP'}
          </h1>
        </div>

        {/* Navigation List */}
        <div className="flex-1 px-3.5 py-2 overflow-y-auto space-y-2">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-500/25'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-900/60'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </aside>
    </>
  );
};
