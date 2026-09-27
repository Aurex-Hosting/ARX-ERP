import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Layers, Box, Settings, Users, ChevronRight, X } from 'lucide-react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { NavigationItem } from '../../types';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const getIcon = (name: string) => {
  switch (name) {
    case 'dashboard':
    case 'home':
      return <LayoutDashboard className="w-5 h-5 shrink-0" />;
    case 'users':
      return <Users className="w-5 h-5 shrink-0" />;
    case 'settings':
      return <Settings className="w-5 h-5 shrink-0" />;
    case 'layers':
      return <Layers className="w-5 h-5 shrink-0" />;
    default:
      return <Box className="w-5 h-5 shrink-0" />;
  }
};

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  onNavigate,
  isOpen,
  onClose,
}) => {
  const { currentLogo, settings } = useTheme();
  const [navItems, setNavItems] = useState<NavigationItem[]>([]);

  useEffect(() => {
    const fetchNavigation = async () => {
      try {
        const response = await api.get('/navigation?area=dashboard');
        setNavItems(response.data.items || []);
      } catch (err) {
        console.error('Failed to load navigation:', err);
      }
    };

    fetchNavigation();
  }, []);

  const handleNavigate = (path: string) => {
    onNavigate(path);
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
        className={`fixed inset-y-0 left-0 z-50 w-72 lg:w-64 bg-slate-50 dark:bg-slate-950 flex flex-col h-full transform transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
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
          <button
            onClick={() => handleNavigate('/')}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              currentPath === '/'
                ? 'bg-violet-600 text-white shadow-md shadow-violet-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-900/60'
            }`}
          >
            <LayoutDashboard className={`w-5 h-5 shrink-0 ${currentPath === '/' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
            <span className="truncate">Overview</span>
          </button>

          {/* Dynamic Modules Navigation */}
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.route)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                currentPath === item.route
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-500/25'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center gap-3.5 truncate">
                {getIcon(item.icon)}
                <span className="truncate">{item.label}</span>
              </div>
              <ChevronRight className="w-4 h-4 shrink-0 opacity-40" />
            </button>
          ))}
        </div>
      </aside>
    </>
  );
};
