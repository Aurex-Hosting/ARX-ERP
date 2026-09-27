import React, { useState } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';

interface AdminLayoutProps {
  children: React.ReactNode;
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, currentTab, onSelectTab }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors duration-200">
      <AdminSidebar
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <AdminHeader
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onSelectTab={onSelectTab}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-slate-100/60 dark:bg-slate-950 transition-colors duration-200">
          {children}
        </main>
      </div>
    </div>
  );
};
