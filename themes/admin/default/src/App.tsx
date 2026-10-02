import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AdminLayout } from './components/layout/AdminLayout';
import { OverviewPage } from './pages/admin/OverviewPage';
import { UsersPage } from './pages/admin/UsersPage';
import { RolesPage } from './pages/admin/RolesPage';
import { ApiKeysPage } from './pages/admin/ApiKeysPage';
import { ModulesPage } from './pages/admin/ModulesPage';
import { ThemesPage } from './pages/admin/ThemesPage';
import { BackupsPage } from './pages/admin/BackupsPage';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';
import { LoginHistoryPage } from './pages/admin/LoginHistoryPage';
import { ApprovalsPage } from './pages/admin/ApprovalsPage';
import { SystemPage } from './pages/admin/SystemPage';
import { ProfilePage } from './pages/admin/ProfilePage';
import { NotifyPage } from './pages/admin/NotifyPage';
import { MailSetupPage } from './pages/admin/MailSetupPage';
import { UpdatesPage } from './pages/admin/UpdatesPage';
import { LoginPage } from './pages/auth/LoginPage';
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';

const AdminAppContent: React.FC = () => {
  const { user, isLoading, login } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>(() => {
    const hash = window.location.hash.replace('#', '');
    const validTabs = [
      'overview', 'notify', 'mail-setup', 'users', 'roles',
      'api-keys', 'modules', 'themes', 'backups', 'updates', 'audit-logs',
      'login-history', 'approvals', 'system', 'health', 'profile'
    ];
    return validTabs.includes(hash) ? hash : 'overview';
  });

  // Check URL pathname for direct public cryptographic action landing pages
  const pathname = window.location.pathname;

  if (pathname === '/verify-email' || window.location.search.includes('token') && pathname.includes('verify')) {
    return <VerifyEmailPage />;
  }

  if (pathname === '/reset-password' || window.location.search.includes('token') && pathname.includes('reset')) {
    return <ResetPasswordPage />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <LoginPage
        onLoginSuccess={(loggedInUser, token) => {
          login(token, loggedInUser);
        }}
      />
    );
  }

  return (
    <AdminLayout currentTab={currentTab} onSelectTab={setCurrentTab}>
      {currentTab === 'overview' && <OverviewPage onNavigateTab={setCurrentTab} />}
      {currentTab === 'notify' && <NotifyPage />}
      {currentTab === 'mail-setup' && <MailSetupPage />}
      {currentTab === 'users' && <UsersPage />}
      {currentTab === 'roles' && <RolesPage />}
      {currentTab === 'api-keys' && <ApiKeysPage />}
      {currentTab === 'modules' && <ModulesPage />}
      {currentTab === 'themes' && <ThemesPage />}
      {currentTab === 'backups' && <BackupsPage />}
      {currentTab === 'updates' && <UpdatesPage onNavigateTab={setCurrentTab} />}
      {currentTab === 'audit-logs' && <AuditLogsPage />}
      {currentTab === 'login-history' && <LoginHistoryPage />}
      {currentTab === 'approvals' && <ApprovalsPage />}
      {(currentTab === 'system' || currentTab === 'health') && <SystemPage />}
      {currentTab === 'profile' && <ProfilePage />}
    </AdminLayout>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AdminAppContent />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
