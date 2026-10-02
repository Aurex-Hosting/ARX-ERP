import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { DashboardOverview } from './pages/dashboard/DashboardOverview';
import { ProfilePage } from './pages/profile/ProfilePage';
import { LoginPage } from './pages/auth/LoginPage';
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { PayablesDebtPage } from './pages/modules/PayablesDebtPage';

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

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
    return <LoginPage />;
  }

  if (currentPath === '/login') {
    return (
      <DashboardLayout currentPath="/" onNavigate={navigate}>
        <DashboardOverview />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPath={currentPath} onNavigate={navigate}>
      {currentPath === '/' && <DashboardOverview />}
      {currentPath === '/profile' && <ProfilePage />}
      {currentPath.startsWith('/payables-debt') && <PayablesDebtPage />}
    </DashboardLayout>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
