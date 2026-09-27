import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import logoDarkSvg from '../assets/logo-dark.svg';
import logoLightSvg from '../assets/logo-light.svg';

export type ThemeMode = 'dark' | 'light';

export interface QuickLinkItem {
  id: string;
  name: string;
  url: string;
  icon_url: string | null;
}

export interface GeneralSettings {
  company_name: string;
  logo_dark: string | null;
  logo_light: string | null;
  favicon: string | null;
  copyright_text: string;
  auth_bg_dark: string | null;
  auth_bg_light: string | null;
  site_title_dashboard: string;
  site_title_admin: string;
  quick_links_topbar: QuickLinkItem[];
  quick_links_login: QuickLinkItem[];
}

export interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  settings: GeneralSettings;
  currentLogo: string;
  refreshSettings: () => Promise<void>;
}

const defaultSettings: GeneralSettings = {
  company_name: 'ARX-ERP',
  logo_dark: null,
  logo_light: null,
  favicon: null,
  copyright_text: `© ${new Date().getFullYear()} ARX-ERP. All rights reserved.`,
  auth_bg_dark: null,
  auth_bg_light: null,
  site_title_dashboard: 'ARX-ERP - Dashboard',
  site_title_admin: 'ARX-ERP - Admin Portal',
  quick_links_topbar: [],
  quick_links_login: [],
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('arx_theme_mode') as ThemeMode;
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    // Auto-detect system preference on first visit
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  const [settings, setSettings] = useState<GeneralSettings>(() => {
    try {
      const cached = localStorage.getItem('arx_general_settings');
      if (cached) {
        return { ...defaultSettings, ...JSON.parse(cached) };
      }
    } catch {
      // Ignore JSON parse errors
    }
    return defaultSettings;
  });

  const refreshSettings = useCallback(async () => {
    try {
      const res = await api.get('/general-settings');
      if (res.data?.settings) {
        const fetched = res.data.settings;
        setSettings((prev) => {
          const updated = { ...prev, ...fetched };
          try {
            localStorage.setItem('arx_general_settings', JSON.stringify(updated));
          } catch {
            // Ignore storage errors
          }
          return updated;
        });
      }
    } catch (err) {
      console.warn('Failed to load general branding settings:', err);
    }
  }, []);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  useEffect(() => {
    const root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('arx_theme_mode', mode);
  }, [mode]);

  // Favicon dynamic update
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const faviconUrl = settings.favicon || '/logo.svg';
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = faviconUrl;
  }, [settings.favicon]);

  // Site title dynamic update (Admin area)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (settings.site_title_admin) {
      document.title = settings.site_title_admin;
    }
  }, [settings.site_title_admin]);

  // Sync with OS system color scheme changes if user hasn't explicitly set a custom theme preference yet
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const saved = localStorage.getItem('arx_theme_mode');
      if (!saved) {
        setMode(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = () => {
    setMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (newMode: ThemeMode) => {
    setMode(newMode);
  };

  // Compute active logo based on light/dark mode and uploaded custom logos
  const currentLogo = mode === 'dark'
    ? (settings.logo_dark || logoDarkSvg)
    : (settings.logo_light || logoLightSvg);

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme, setTheme, settings, currentLogo, refreshSettings }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
