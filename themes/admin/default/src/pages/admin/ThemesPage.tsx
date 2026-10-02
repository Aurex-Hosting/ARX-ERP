import React, { useEffect, useState, useRef } from 'react';
import {
  CheckCircle2,
  Palette,
  Settings,
  Upload,
  Trash2,
  Save,
  Check,
  Building,
  Copyright,
  Compass,
  RefreshCw,
  Link as LinkIcon,
  ExternalLink,
  Plus,
  ArrowUp,
  ArrowDown,
  Globe,
  ShieldAlert,
  LayoutDashboard,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme, QuickLinkItem } from '../../context/ThemeContext';
import { ThemeItem } from '../../types';
import { DashboardWidgetCustomizer } from '../../components/themes/DashboardWidgetCustomizer';
import logoDarkSvg from '../../assets/logo-dark.svg';
import logoLightSvg from '../../assets/logo-light.svg';

export const ThemesPage: React.FC = () => {
  const { user } = useAuth();
  const { refreshSettings } = useTheme();

  // Permission Checks
  const isSuperAdmin = Boolean(user?.is_super_admin);
  const userPermissions = (user?.permissions as string[]) || [];

  const hasPerm = (p: string) => isSuperAdmin || userPermissions.includes(p);

  const canViewCatalog = hasPerm('themes.view') || hasPerm('themes.manage');
  const canManageCatalog = hasPerm('themes.manage');

  const canViewGeneral = hasPerm('themes.general.view') || hasPerm('themes.general.manage') || hasPerm('themes.manage');
  const canManageGeneral = hasPerm('themes.general.manage') || hasPerm('themes.manage');

  const canViewQuickLinks = hasPerm('themes.quick_links.view') || hasPerm('themes.quick_links.manage') || hasPerm('themes.manage');
  const canManageQuickLinks = hasPerm('themes.quick_links.manage') || hasPerm('themes.manage');

  const canViewDashboard = hasPerm('themes.dashboard.view') || hasPerm('themes.dashboard.manage') || hasPerm('themes.manage');
  const canManageDashboard = hasPerm('themes.dashboard.manage') || hasPerm('themes.manage');

  const hasAnyAccess = canViewCatalog || canViewGeneral || canViewQuickLinks || canViewDashboard;

  // Top Section Tabs: 'catalog' | 'general' | 'quick_links' | 'dashboard'
  const [activeSection, setActiveSection] = useState<'catalog' | 'general' | 'quick_links' | 'dashboard'>(() => {
    if (canViewCatalog) return 'catalog';
    if (canViewGeneral) return 'general';
    if (canViewQuickLinks) return 'quick_links';
    if (canViewDashboard) return 'dashboard';
    return 'catalog';
  });

  // --- Themes Catalog State ---
  const [dashboardThemes, setDashboardThemes] = useState<ThemeItem[]>([]);
  const [adminThemes, setAdminThemes] = useState<ThemeItem[]>([]);
  const [activeDash, setActiveDash] = useState<string>('default');
  const [activeAdmin, setActiveAdmin] = useState<string>('default');
  const [filterArea, setFilterArea] = useState<string>('all');
  const [catalogLoading, setCatalogLoading] = useState(true);

  // --- General Settings State ---
  const [companyName, setCompanyName] = useState<string>('');
  const [copyrightText, setCopyrightText] = useState<string>('');
  const [siteTitleDashboard, setSiteTitleDashboard] = useState<string>('');
  const [siteTitleAdmin, setSiteTitleAdmin] = useState<string>('');

  // Persisted Server Asset URLs
  const [logoDarkUrl, setLogoDarkUrl] = useState<string | null>(null);
  const [logoLightUrl, setLogoLightUrl] = useState<string | null>(null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [authBgDarkUrl, setAuthBgDarkUrl] = useState<string | null>(null);
  const [authBgLightUrl, setAuthBgLightUrl] = useState<string | null>(null);

  // --- Quick Links State ---
  const [topbarLinks, setTopbarLinks] = useState<QuickLinkItem[]>([]);
  const [loginLinks, setLoginLinks] = useState<QuickLinkItem[]>([]);
  const [stagedTopbarIcons, setStagedTopbarIcons] = useState<Record<string, { file: File; previewUrl: string } | null>>({});
  const [stagedLoginIcons, setStagedLoginIcons] = useState<Record<string, { file: File; previewUrl: string } | null>>({});
  const [savingQuickLinks, setSavingQuickLinks] = useState(false);
  const [savedQuickLinksSuccess, setSavedQuickLinksSuccess] = useState(false);

  // Staged Files & Previews (Held locally until user clicks Save)
  type AssetKey = 'logo_dark' | 'logo_light' | 'favicon' | 'auth_bg_dark' | 'auth_bg_light';

  const [stagedFiles, setStagedFiles] = useState<Record<AssetKey, File | null>>({
    logo_dark: null,
    logo_light: null,
    favicon: null,
    auth_bg_dark: null,
    auth_bg_light: null,
  });

  const [stagedPreviews, setStagedPreviews] = useState<Record<AssetKey, string | null>>({
    logo_dark: null,
    logo_light: null,
    favicon: null,
    auth_bg_dark: null,
    auth_bg_light: null,
  });

  const [deletedAssetKeys, setDeletedAssetKeys] = useState<AssetKey[]>([]);

  const [savingSettings, setSavingSettings] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Hidden File Inputs
  const logoDarkInputRef = useRef<HTMLInputElement>(null);
  const logoLightInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const authBgDarkInputRef = useRef<HTMLInputElement>(null);
  const authBgLightInputRef = useRef<HTMLInputElement>(null);

  // Fetch Themes Catalog
  const fetchThemes = async () => {
    try {
      const [dashRes, adminRes] = await Promise.all([
        api.get('/admin/themes?area=dashboard'),
        api.get('/admin/themes?area=admin'),
      ]);
      setDashboardThemes(dashRes.data.themes || []);
      setActiveDash(dashRes.data.active_theme || 'default');
      setAdminThemes(adminRes.data.themes || []);
      setActiveAdmin(adminRes.data.active_theme || 'default');
    } catch (err) {
      console.error('Failed to load themes:', err);
    } finally {
      setCatalogLoading(false);
    }
  };

  // Fetch General Settings
  const fetchGeneralSettings = async () => {
    try {
      const res = await api.get('/admin/theme/general-settings');
      if (res.data?.settings) {
        const s = res.data.settings;
        setCompanyName(s.company_name || 'ARX-ERP');
        setCopyrightText(s.copyright_text || `© ${new Date().getFullYear()} ${s.company_name || 'ARX-ERP'}. All rights reserved.`);
        setSiteTitleDashboard(s.site_title_dashboard || `${s.company_name || 'ARX-ERP'} - Dashboard`);
        setSiteTitleAdmin(s.site_title_admin || `${s.company_name || 'ARX-ERP'} - Admin Portal`);
        setLogoDarkUrl(s.logo_dark || null);
        setLogoLightUrl(s.logo_light || null);
        setFaviconUrl(s.favicon || null);
        setAuthBgDarkUrl(s.auth_bg_dark || null);
        let rawTopbar = s.quick_links_topbar;
        if (typeof rawTopbar === 'string') {
          try { rawTopbar = JSON.parse(rawTopbar); } catch { rawTopbar = []; }
        }
        let rawLogin = s.quick_links_login;
        if (typeof rawLogin === 'string') {
          try { rawLogin = JSON.parse(rawLogin); } catch { rawLogin = []; }
        }

        setTopbarLinks(Array.isArray(rawTopbar) ? rawTopbar : []);
        setLoginLinks(Array.isArray(rawLogin) ? rawLogin : []);
      }
    } catch (err) {
      console.error('Failed to load general settings:', err);
    }
  };

  useEffect(() => {
    if (activeSection === 'catalog' && !canViewCatalog) {
      if (canViewGeneral) {
        setActiveSection('general');
      } else if (canViewQuickLinks) {
        setActiveSection('quick_links');
      } else if (canViewDashboard) {
        setActiveSection('dashboard');
      }
    } else if (activeSection === 'general' && !canViewGeneral) {
      if (canViewCatalog) {
        setActiveSection('catalog');
      } else if (canViewQuickLinks) {
        setActiveSection('quick_links');
      } else if (canViewDashboard) {
        setActiveSection('dashboard');
      }
    } else if (activeSection === 'quick_links' && !canViewQuickLinks) {
      if (canViewCatalog) {
        setActiveSection('catalog');
      } else if (canViewGeneral) {
        setActiveSection('general');
      } else if (canViewDashboard) {
        setActiveSection('dashboard');
      }
    } else if (activeSection === 'dashboard' && !canViewDashboard) {
      if (canViewCatalog) {
        setActiveSection('catalog');
      } else if (canViewGeneral) {
        setActiveSection('general');
      } else if (canViewQuickLinks) {
        setActiveSection('quick_links');
      }
    }
  }, [canViewCatalog, canViewGeneral, canViewQuickLinks, canViewDashboard, activeSection]);

  useEffect(() => {
    if (canViewCatalog) {
      fetchThemes();
    }
    if (canViewGeneral || canViewQuickLinks) {
      fetchGeneralSettings();
    }
  }, [canViewCatalog, canViewGeneral, canViewQuickLinks]);

  // Theme Activation
  const handleActivate = async (area: 'dashboard' | 'admin', slug: string) => {
    if (!canManageCatalog) {
      alert('You do not have permission to activate themes.');
      return;
    }
    try {
      await api.post(`/admin/themes/${slug}/activate`, { area });
      await fetchThemes();
      alert(`Theme '${slug}' activated for ${area}!`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to activate theme');
    }
  };

  // Stage a selected file locally (Instant UI preview, NO automatic server dispatch)
  const handleStageFile = (assetKey: AssetKey, file: File) => {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);

    setStagedFiles((prev) => ({ ...prev, [assetKey]: file }));
    setStagedPreviews((prev) => ({ ...prev, [assetKey]: previewUrl }));
    setDeletedAssetKeys((prev) => prev.filter((k) => k !== assetKey));
  };

  // Stage removal of an asset locally (Reverts preview, flags for deletion upon Save)
  const handleStageDelete = (assetKey: AssetKey) => {
    if (stagedPreviews[assetKey]) {
      URL.revokeObjectURL(stagedPreviews[assetKey]!);
    }

    setStagedFiles((prev) => ({ ...prev, [assetKey]: null }));
    setStagedPreviews((prev) => ({ ...prev, [assetKey]: null }));

    if (!deletedAssetKeys.includes(assetKey)) {
      setDeletedAssetKeys((prev) => [...prev, assetKey]);
    }
  };

  // Save All General Settings & Staged Assets atomically
  const handleSaveGeneralSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canManageGeneral) {
      alert('You do not have permission to modify general branding settings.');
      return;
    }
    setSavingSettings(true);
    setSavedSuccess(false);

    try {
      const formData = new FormData();
      formData.append('company_name', companyName);
      formData.append('copyright_text', copyrightText);
      formData.append('site_title_dashboard', siteTitleDashboard);
      formData.append('site_title_admin', siteTitleAdmin);

      // Append staged files
      (Object.keys(stagedFiles) as AssetKey[]).forEach((key) => {
        const file = stagedFiles[key];
        if (file) {
          formData.append(key, file);
        }
      });

      // Append deleted asset keys
      if (deletedAssetKeys.length > 0) {
        formData.append('remove_assets', deletedAssetKeys.join(','));
      }

      const res = await api.post('/admin/theme/general-settings', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.settings) {
        const s = res.data.settings;
        setCompanyName(s.company_name);
        setCopyrightText(s.copyright_text);
        setSiteTitleDashboard(s.site_title_dashboard);
        setSiteTitleAdmin(s.site_title_admin);
        setLogoDarkUrl(s.logo_dark || null);
        setLogoLightUrl(s.logo_light || null);
        setFaviconUrl(s.favicon || null);
        setAuthBgDarkUrl(s.auth_bg_dark || null);
        setAuthBgLightUrl(s.auth_bg_light || null);
        setTopbarLinks(s.quick_links_topbar || []);
        setLoginLinks(s.quick_links_login || []);
      }

      // Clear staged states
      setStagedFiles({
        logo_dark: null,
        logo_light: null,
        favicon: null,
        auth_bg_dark: null,
        auth_bg_light: null,
      });
      setStagedPreviews({
        logo_dark: null,
        logo_light: null,
        favicon: null,
        auth_bg_dark: null,
        auth_bg_light: null,
      });
      setDeletedAssetKeys([]);

      await refreshSettings();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update general settings');
    } finally {
      setSavingSettings(false);
    }
  };

  // --- Quick Links Handlers ---
  const handleAddTopbarLink = () => {
    setTopbarLinks((prev) => [
      ...prev,
      {
        id: `top_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: '',
        url: '',
        icon_url: null,
      },
    ]);
  };

  const handleUpdateTopbarLink = (index: number, field: keyof QuickLinkItem, value: string) => {
    setTopbarLinks((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleStageTopbarIcon = (id: string, file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setStagedTopbarIcons((prev) => ({
      ...prev,
      [id]: { file, previewUrl },
    }));
  };

  const handleRemoveTopbarIcon = (index: number, id: string) => {
    if (stagedTopbarIcons[id]?.previewUrl) {
      URL.revokeObjectURL(stagedTopbarIcons[id]!.previewUrl);
    }
    setStagedTopbarIcons((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setTopbarLinks((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], icon_url: null };
      return copy;
    });
  };

  const handleDeleteTopbarLink = (index: number, id: string) => {
    if (stagedTopbarIcons[id]?.previewUrl) {
      URL.revokeObjectURL(stagedTopbarIcons[id]!.previewUrl);
    }
    setStagedTopbarIcons((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setTopbarLinks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveTopbarLink = (index: number, direction: 'up' | 'down') => {
    setTopbarLinks((prev) => {
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[newIndex];
      copy[newIndex] = temp;
      return copy;
    });
  };

  // Login Quick Links Handlers
  const handleAddLoginLink = () => {
    setLoginLinks((prev) => [
      ...prev,
      {
        id: `login_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: '',
        url: '',
        icon_url: null,
      },
    ]);
  };

  const handleUpdateLoginLink = (index: number, field: keyof QuickLinkItem, value: string) => {
    setLoginLinks((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleStageLoginIcon = (id: string, file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setStagedLoginIcons((prev) => ({
      ...prev,
      [id]: { file, previewUrl },
    }));
  };

  const handleRemoveLoginIcon = (index: number, id: string) => {
    if (stagedLoginIcons[id]?.previewUrl) {
      URL.revokeObjectURL(stagedLoginIcons[id]!.previewUrl);
    }
    setStagedLoginIcons((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setLoginLinks((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], icon_url: null };
      return copy;
    });
  };

  const handleDeleteLoginLink = (index: number, id: string) => {
    if (stagedLoginIcons[id]?.previewUrl) {
      URL.revokeObjectURL(stagedLoginIcons[id]!.previewUrl);
    }
    setStagedLoginIcons((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setLoginLinks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveLoginLink = (index: number, direction: 'up' | 'down') => {
    setLoginLinks((prev) => {
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[newIndex];
      copy[newIndex] = temp;
      return copy;
    });
  };

  // Save Quick Links atomically
  const handleSaveQuickLinks = async () => {
    if (!canManageQuickLinks) {
      alert('You do not have permission to modify quick links.');
      return;
    }
    setSavingQuickLinks(true);
    setSavedQuickLinksSuccess(false);

    try {
      const formData = new FormData();
      formData.append('quick_links_topbar', JSON.stringify(topbarLinks));
      formData.append('quick_links_login', JSON.stringify(loginLinks));

      // Append staged topbar icon files
      Object.keys(stagedTopbarIcons).forEach((id) => {
        const item = stagedTopbarIcons[id];
        if (item?.file) {
          formData.append(`quick_link_icon_topbar_${id}`, item.file);
        }
      });

      // Append staged login icon files
      Object.keys(stagedLoginIcons).forEach((id) => {
        const item = stagedLoginIcons[id];
        if (item?.file) {
          formData.append(`quick_link_icon_login_${id}`, item.file);
        }
      });

      const res = await api.post('/admin/theme/general-settings', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.settings) {
        setTopbarLinks(res.data.settings.quick_links_topbar || []);
        setLoginLinks(res.data.settings.quick_links_login || []);
      }

      setStagedTopbarIcons({});
      setStagedLoginIcons({});

      await refreshSettings();
      setSavedQuickLinksSuccess(true);
      setTimeout(() => setSavedQuickLinksSuccess(false), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save quick links');
    } finally {
      setSavingQuickLinks(false);
    }
  };

  // Helper to compute effective display asset for previewing
  const getEffectiveAssetUrl = (assetKey: AssetKey, serverUrl: string | null): string | null => {
    if (stagedPreviews[assetKey]) return stagedPreviews[assetKey];
    if (deletedAssetKeys.includes(assetKey)) return null;
    return serverUrl;
  };

  // Helper to check if asset has staged changes
  const hasStagedChanges = (assetKey: AssetKey): boolean => {
    return Boolean(stagedFiles[assetKey]) || deletedAssetKeys.includes(assetKey);
  };

  // Combine and filter themes
  const allThemes: (ThemeItem & { is_active: boolean; area_target: 'dashboard' | 'admin' })[] = [
    ...dashboardThemes.map((t) => ({
      ...t,
      area_target: 'dashboard' as const,
      is_active: activeDash === t.slug,
    })),
    ...adminThemes.map((t) => ({
      ...t,
      area_target: 'admin' as const,
      is_active: activeAdmin === t.slug,
    })),
  ];

  const filteredThemes = allThemes.filter((t) => {
    if (filterArea === 'all') return true;
    return t.area_target === filterArea;
  });

  const effectiveLogoDark = getEffectiveAssetUrl('logo_dark', logoDarkUrl);
  const effectiveLogoLight = getEffectiveAssetUrl('logo_light', logoLightUrl);
  const effectiveFavicon = getEffectiveAssetUrl('favicon', faviconUrl);
  const effectiveAuthBgDark = getEffectiveAssetUrl('auth_bg_dark', authBgDarkUrl);
  const effectiveAuthBgLight = getEffectiveAssetUrl('auth_bg_light', authBgLightUrl);

  const hasAnyStagedUploads = (Object.values(stagedFiles) as (File | null)[]).some(Boolean) || deletedAssetKeys.length > 0;
  const hasAnyStagedQuickLinks =
    Object.values(stagedTopbarIcons).some(Boolean) || Object.values(stagedLoginIcons).some(Boolean);

  if (!hasAnyAccess) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 rounded-3xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200/60 dark:border-slate-800 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Access Denied</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
          You do not have permission to access Theme Manager, General Settings, or Quick Links.
          Contact your system administrator to assign the required permissions.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      {/* Header & Section Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Theme Manager</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure system brand identity, dark/light logos, background art, quick links, and area presentation themes.
          </p>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-800">
          {canViewCatalog && (
            <button
              onClick={() => setActiveSection('catalog')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeSection === 'catalog'
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Themes Catalog</span>
            </button>
          )}
          {canViewGeneral && (
            <button
              onClick={() => setActiveSection('general')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeSection === 'general'
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>General Settings</span>
              {hasAnyStagedUploads && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>
          )}
          {canViewQuickLinks && (
            <button
              onClick={() => setActiveSection('quick_links')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeSection === 'quick_links'
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Quick Links</span>
              {hasAnyStagedQuickLinks && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>
          )}
          {canViewDashboard && (
            <button
              onClick={() => setActiveSection('dashboard')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeSection === 'dashboard'
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: THEMES CATALOG                                                 */}
      {/* ========================================================================= */}
      {activeSection === 'catalog' && canViewCatalog && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {!canManageCatalog && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>
                <strong>Read-Only Access:</strong> You have permission to view themes, but lack permission to activate or switch themes (<code className="font-mono text-[11px]">themes.manage</code>).
              </span>
            </div>
          )}

          {/* Filter Badges */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Filter available themes by target presentation area:
            </div>
            <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 rounded-xl shadow-sm">
              {['all', 'dashboard', 'admin'].map((area) => (
                <button
                  key={area}
                  onClick={() => setFilterArea(area)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap transition-all cursor-pointer ${
                    filterArea === area
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {area}
                </button>
              ))}
            </div>
          </div>

          {/* Catalog Grid */}
          {catalogLoading ? (
            <div className="p-12 text-center text-slate-400 text-sm">Loading themes catalog...</div>
          ) : filteredThemes.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 shadow-sm text-slate-400 text-sm">
              No themes found in {filterArea}.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredThemes.map((theme) => {
                return (
                  <div
                    key={`${theme.area_target}-${theme.slug}`}
                    className="p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between transition-colors duration-200"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
                            <Palette className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm text-slate-900 dark:text-white">{theme.name}</h3>
                            <p className="text-[11px] font-mono text-slate-400 mt-0.5">slug: {theme.slug} • v{theme.version}</p>
                          </div>
                        </div>

                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-violet-600 dark:text-violet-400">
                          {theme.area_target}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 capitalize">
                        Presentation engine: {theme.engine}
                      </p>
                    </div>

                    <div className="pt-4 flex items-center justify-between">
                      <div>
                        {theme.is_active ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Active Theme
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Available</span>
                        )}
                      </div>

                      {!theme.is_active && (
                        <button
                          onClick={() => handleActivate(theme.area_target, theme.slug)}
                          disabled={!canManageCatalog}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-md transition-all ${
                            canManageCatalog
                              ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-500/20 cursor-pointer'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-60'
                          }`}
                          title={canManageCatalog ? undefined : 'Permission required: themes.manage'}
                        >
                          Activate Theme
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: GENERAL SETTINGS                                               */}
      {/* ========================================================================= */}
      {activeSection === 'general' && canViewGeneral && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {!canManageGeneral && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>
                <strong>Read-Only Access:</strong> You have permission to view general branding settings, but lack permission to modify them (<code className="font-mono text-[11px]">themes.general.manage</code>).
              </span>
            </div>
          )}

          {/* Top Save Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200/60 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">General Branding Configuration</h2>
                {hasAnyStagedUploads && canManageGeneral && (
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-400/30 animate-pulse">
                    Unsaved Changes
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Uploads and text changes are held locally until you click Save General Settings.
              </p>
            </div>

            {canManageGeneral && (
              <button
                onClick={() => handleSaveGeneralSettings()}
                disabled={savingSettings}
                className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-violet-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Saved Successfully!</span>
                  </>
                ) : savingSettings ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving & Applying...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save General Settings</span>
                  </>
                )}
              </button>
            )}
          </div>

          <form onSubmit={handleSaveGeneralSettings} className="space-y-6">
            {/* Grid 1: Company Identity & Copyright */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Company Name Card */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm space-y-4 border border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center gap-3 pb-1">
                  <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400">
                    <Building className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Company Name</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Global enterprise and application identity</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Company / Organization Name
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="ARX-ERP"
                    required
                    disabled={!canManageGeneral}
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Replaces application name across all sidebars, headers, notifications, and mail footers.
                  </p>
                </div>
              </div>

              {/* Copyright Text Card */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm space-y-4 border border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center gap-3 pb-1">
                  <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400">
                    <Copyright className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Copyright Notice</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Legal footer displayed across login cards and emails</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Custom Copyright Text
                  </label>
                  <input
                    type="text"
                    value={copyrightText}
                    onChange={(e) => setCopyrightText(e.target.value)}
                    placeholder={`© ${new Date().getFullYear()} ARX-ERP. All rights reserved.`}
                    disabled={!canManageGeneral}
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Displayed at the bottom of the liquid glass login page and system notifications.
                  </p>
                </div>
              </div>
            </div>

            {/* Grid 2: Dark & Light Logos and Favicon */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm space-y-6 border border-slate-200/60 dark:border-slate-800">
              <div>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Brand Logos & Favicon</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select dedicated SVG/PNG logos for Dark Mode, Light Mode, and browser tab Favicon. Changes take effect upon clicking Save.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. Dark Mode Logo */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Logo (Dark Mode)</span>
                    {stagedFiles.logo_dark ? (
                      <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-400/30">
                        Pending Save
                      </span>
                    ) : deletedAssetKeys.includes('logo_dark') ? (
                      <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-500/15 px-2 py-0.5 rounded-full border border-rose-400/30">
                        Will Revert
                      </span>
                    ) : logoDarkUrl ? (
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-400">Default</span>
                    )}
                  </div>

                  {/* Dark Preview Box */}
                  <div className="h-28 rounded-xl bg-slate-950 flex items-center justify-center p-3 border border-slate-800 relative overflow-hidden group">
                    <img
                      src={effectiveLogoDark || logoDarkSvg}
                      alt="Logo Dark Mode"
                      className="max-h-16 max-w-full object-contain drop-shadow-md"
                    />
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Used on dark mode sidebar, headers, and dark login background.
                  </p>

                  {canManageGeneral && (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        ref={logoDarkInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleStageFile('logo_dark', e.target.files[0]);
                            e.target.value = '';
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => logoDarkInputRef.current?.click()}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{stagedFiles.logo_dark ? 'Change File' : 'Select Logo'}</span>
                      </button>
                      {(effectiveLogoDark || hasStagedChanges('logo_dark')) && (
                        <button
                          type="button"
                          onClick={() => handleStageDelete('logo_dark')}
                          title="Revert to Default"
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Light Mode Logo */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Logo (Light Mode)</span>
                    {stagedFiles.logo_light ? (
                      <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-400/30">
                        Pending Save
                      </span>
                    ) : deletedAssetKeys.includes('logo_light') ? (
                      <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-500/15 px-2 py-0.5 rounded-full border border-rose-400/30">
                        Will Revert
                      </span>
                    ) : logoLightUrl ? (
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-400">Default</span>
                    )}
                  </div>

                  {/* Light Preview Box */}
                  <div className="h-28 rounded-xl bg-slate-100 flex items-center justify-center p-3 border border-slate-300 relative overflow-hidden group">
                    <img
                      src={effectiveLogoLight || logoLightSvg}
                      alt="Logo Light Mode"
                      className="max-h-16 max-w-full object-contain drop-shadow-sm"
                    />
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Used on light mode sidebar, headers, and light login background.
                  </p>

                  {canManageGeneral && (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        ref={logoLightInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleStageFile('logo_light', e.target.files[0]);
                            e.target.value = '';
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => logoLightInputRef.current?.click()}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{stagedFiles.logo_light ? 'Change File' : 'Select Logo'}</span>
                      </button>
                      {(effectiveLogoLight || hasStagedChanges('logo_light')) && (
                        <button
                          type="button"
                          onClick={() => handleStageDelete('logo_light')}
                          title="Revert to Default"
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. Favicon */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Browser Favicon</span>
                    {stagedFiles.favicon ? (
                      <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-400/30">
                        Pending Save
                      </span>
                    ) : deletedAssetKeys.includes('favicon') ? (
                      <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-500/15 px-2 py-0.5 rounded-full border border-rose-400/30">
                        Will Revert
                      </span>
                    ) : faviconUrl ? (
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-400">Default</span>
                    )}
                  </div>

                  {/* Favicon Preview Box */}
                  <div className="h-28 rounded-xl bg-slate-200/70 dark:bg-slate-950 flex items-center justify-center gap-3 p-3 border border-slate-300 dark:border-slate-800">
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-900 shadow-xs border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                      <img
                        src={effectiveFavicon || logoLightSvg}
                        alt="Favicon Preview 32"
                        className="w-8 h-8 object-contain"
                      />
                    </div>
                    <div className="p-1.5 rounded-md bg-white dark:bg-slate-900 shadow-xs border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                      <img
                        src={effectiveFavicon || logoLightSvg}
                        alt="Favicon Preview 16"
                        className="w-5 h-5 object-contain"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Browser tab icon (.ico, .png, .svg recommended).
                  </p>

                  {canManageGeneral && (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        ref={faviconInputRef}
                        type="file"
                        accept="image/x-icon,image/vnd.microsoft.icon,image/png,image/svg+xml,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleStageFile('favicon', e.target.files[0]);
                            e.target.value = '';
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => faviconInputRef.current?.click()}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{stagedFiles.favicon ? 'Change File' : 'Select Favicon'}</span>
                      </button>
                      {(effectiveFavicon || hasStagedChanges('favicon')) && (
                        <button
                          type="button"
                          onClick={() => handleStageDelete('favicon')}
                          title="Revert to Default"
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Grid 3: Login Page Background Images */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm space-y-6 border border-slate-200/60 dark:border-slate-800">
              <div>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Login Page Background Images</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select custom background wallpapers for Dark Mode and Light Mode login screens. Changes take effect upon clicking Save.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Dark Mode Background */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Dark Mode Background Wallpaper</span>
                    {stagedFiles.auth_bg_dark ? (
                      <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-400/30">
                        Pending Save
                      </span>
                    ) : deletedAssetKeys.includes('auth_bg_dark') ? (
                      <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-500/15 px-2 py-0.5 rounded-full border border-rose-400/30">
                        Will Revert
                      </span>
                    ) : authBgDarkUrl ? (
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-400">Default</span>
                    )}
                  </div>

                  <div
                    className="h-36 rounded-xl bg-cover bg-center relative overflow-hidden border border-slate-700 flex items-center justify-center"
                    style={{
                      backgroundImage: `url(${effectiveAuthBgDark || '/images/auth-bg.jpg'})`,
                    }}
                  >
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center">
                      <span className="px-3 py-1 rounded-full bg-black/60 text-white text-[11px] font-semibold backdrop-blur-md">
                        Dark Wallpaper Preview
                      </span>
                    </div>
                  </div>

                  {canManageGeneral && (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        ref={authBgDarkInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleStageFile('auth_bg_dark', e.target.files[0]);
                            e.target.value = '';
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => authBgDarkInputRef.current?.click()}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{stagedFiles.auth_bg_dark ? 'Change File' : 'Select Wallpaper'}</span>
                      </button>
                      {(effectiveAuthBgDark || hasStagedChanges('auth_bg_dark')) && (
                        <button
                          type="button"
                          onClick={() => handleStageDelete('auth_bg_dark')}
                          title="Revert to Default"
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Light Mode Background */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Light Mode Background Wallpaper</span>
                    {stagedFiles.auth_bg_light ? (
                      <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-400/30">
                        Pending Save
                      </span>
                    ) : deletedAssetKeys.includes('auth_bg_light') ? (
                      <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-500/15 px-2 py-0.5 rounded-full border border-rose-400/30">
                        Will Revert
                      </span>
                    ) : authBgLightUrl ? (
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-400">Default</span>
                    )}
                  </div>

                  <div
                    className="h-36 rounded-xl bg-cover bg-center relative overflow-hidden border border-slate-300 flex items-center justify-center"
                    style={{
                      backgroundImage: `url(${effectiveAuthBgLight || '/images/auth-bg-light.jpg'})`,
                    }}
                  >
                    <div className="absolute inset-0 bg-white/30 backdrop-blur-xs flex items-center justify-center">
                      <span className="px-3 py-1 rounded-full bg-white/80 text-slate-900 text-[11px] font-semibold backdrop-blur-md shadow-xs">
                        Light Wallpaper Preview
                      </span>
                    </div>
                  </div>

                  {canManageGeneral && (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        ref={authBgLightInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleStageFile('auth_bg_light', e.target.files[0]);
                            e.target.value = '';
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => authBgLightInputRef.current?.click()}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{stagedFiles.auth_bg_light ? 'Change File' : 'Select Wallpaper'}</span>
                      </button>
                      {(effectiveAuthBgLight || hasStagedChanges('auth_bg_light')) && (
                        <button
                          type="button"
                          onClick={() => handleStageDelete('auth_bg_light')}
                          title="Revert to Default"
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Grid 4: Browser Tab Titles */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm space-y-4 border border-slate-200/60 dark:border-slate-800">
              <div className="flex items-center gap-3 pb-1">
                <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Browser Tab Titles</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Dynamic HTML document titles rendered on browser tabs
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Dashboard Area Site Title
                  </label>
                  <input
                    type="text"
                    value={siteTitleDashboard}
                    onChange={(e) => setSiteTitleDashboard(e.target.value)}
                    placeholder="ARX-ERP - Dashboard"
                    disabled={!canManageGeneral}
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Displayed on the browser tab when users browse the main customer/user dashboard.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Admin Area Site Title
                  </label>
                  <input
                    type="text"
                    value={siteTitleAdmin}
                    onChange={(e) => setSiteTitleAdmin(e.target.value)}
                    placeholder="ARX-ERP - Admin Portal"
                    disabled={!canManageGeneral}
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Displayed on the browser tab when administrators manage system settings and users.
                  </p>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: QUICK LINKS                                                    */}
      {/* ========================================================================= */}
      {activeSection === 'quick_links' && canViewQuickLinks && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {!canManageQuickLinks && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>
                <strong>Read-Only Access:</strong> You have permission to view quick links, but lack permission to modify them (<code className="font-mono text-[11px]">themes.quick_links.manage</code>).
              </span>
            </div>
          )}

          {/* Top Save Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200/60 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Quick Links Configuration</h2>
                {hasAnyStagedQuickLinks && canManageQuickLinks && (
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-400/30 animate-pulse">
                    Unsaved Icons
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage shortcuts and external links for Top Navigation Bars and Login Pages. All quick links open in a new tab (<code className="text-[11px] font-mono">target="_blank"</code>).
              </p>
            </div>

            {canManageQuickLinks && (
              <button
                onClick={handleSaveQuickLinks}
                disabled={savingQuickLinks}
                className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-violet-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {savedQuickLinksSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Quick Links Saved!</span>
                  </>
                ) : savingQuickLinks ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving & Applying...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Quick Links</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* 1. Top Bar Quick Links Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm space-y-5 border border-slate-200/60 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Top Bar Quick Links</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    External navigation links displayed in the application header (Always opens in new tab)
                  </p>
                </div>
              </div>

              {canManageQuickLinks && (
                <button
                  type="button"
                  onClick={handleAddTopbarLink}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-violet-600/10 hover:bg-violet-600/20 text-violet-600 dark:text-violet-400 font-semibold text-xs transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Quick Link</span>
                </button>
              )}
            </div>

            {topbarLinks.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                <Globe className="w-8 h-8 text-slate-400 mx-auto opacity-50" />
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">No top bar quick links configured yet.</p>
                {canManageQuickLinks && (
                  <button
                    type="button"
                    onClick={handleAddTopbarLink}
                    className="px-3.5 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold shadow-xs hover:bg-violet-700 cursor-pointer"
                  >
                    + Add First Top Bar Link
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {topbarLinks.map((link, index) => {
                  const effectiveIcon = stagedTopbarIcons[link.id]?.previewUrl || link.icon_url;
                  return (
                    <div
                      key={link.id}
                      className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex flex-col md:flex-row md:items-center gap-4 transition-all"
                    >
                      {/* Drag / Index Badge */}
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center font-mono font-bold text-[10px] shrink-0">
                          #{index + 1}
                        </span>
                      </div>

                      {/* Icon / SVG Picker */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center p-2 relative group overflow-hidden shadow-xs shrink-0">
                          {effectiveIcon ? (
                            <img
                              src={effectiveIcon}
                              alt={link.name || 'Icon'}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <ExternalLink className="w-5 h-5 text-slate-400" />
                          )}
                        </div>

                        {canManageQuickLinks && (
                          <div className="space-y-1">
                            <label
                              htmlFor={`topbar_icon_${link.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 shadow-xs cursor-pointer transition-colors"
                            >
                              <Upload className="w-3 h-3 text-violet-500" />
                              <span>{effectiveIcon ? 'Change Icon' : 'Upload Icon / SVG'}</span>
                            </label>
                            <input
                              id={`topbar_icon_${link.id}`}
                              type="file"
                              accept="image/png,image/jpeg,image/svg+xml,image/webp"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files?.[0]) {
                                  handleStageTopbarIcon(link.id, e.target.files[0]);
                                  e.target.value = '';
                                }
                              }}
                            />
                            {effectiveIcon && (
                              <div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTopbarIcon(index, link.id)}
                                  className="text-[10px] font-medium text-rose-500 hover:underline cursor-pointer"
                                >
                                  Remove Icon
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Link Name Input */}
                      <div className="flex-1 min-w-[140px]">
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Link Name
                        </label>
                        <input
                          type="text"
                          value={link.name}
                          onChange={(e) => handleUpdateTopbarLink(index, 'name', e.target.value)}
                          placeholder="e.g. Documentation, Helpdesk"
                          disabled={!canManageQuickLinks}
                          className="w-full bg-white dark:bg-slate-900 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                      </div>

                      {/* URL Input */}
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                          <span>Target URL</span>
                          <span className="text-[10px] text-violet-600 dark:text-violet-400 font-mono font-normal">_blank (New Tab)</span>
                        </label>
                        <input
                          type="url"
                          value={link.url}
                          onChange={(e) => handleUpdateTopbarLink(index, 'url', e.target.value)}
                          placeholder="https://example.com/help"
                          disabled={!canManageQuickLinks}
                          className="w-full bg-white dark:bg-slate-900 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/30 font-mono disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                      </div>

                      {/* Actions: Reorder & Delete */}
                      {canManageQuickLinks && (
                        <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center pt-2 md:pt-4">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleMoveTopbarLink(index, 'up')}
                            title="Move Up"
                            className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-xs"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={index === topbarLinks.length - 1}
                            onClick={() => handleMoveTopbarLink(index, 'down')}
                            title="Move Down"
                            className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-xs"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTopbarLink(index, link.id)}
                            title="Delete Quick Link"
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Login Page Quick Links Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm space-y-5 border border-slate-200/60 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
                  <LinkIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Login Page Quick Links</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Helpful portal links displayed on the liquid glass login page (Always opens in new tab)
                  </p>
                </div>
              </div>

              {canManageQuickLinks && (
                <button
                  type="button"
                  onClick={handleAddLoginLink}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-violet-600/10 hover:bg-violet-600/20 text-violet-600 dark:text-violet-400 font-semibold text-xs transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Quick Link</span>
                </button>
              )}
            </div>

            {loginLinks.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                <LinkIcon className="w-8 h-8 text-slate-400 mx-auto opacity-50" />
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">No login page quick links configured yet.</p>
                {canManageQuickLinks && (
                  <button
                    type="button"
                    onClick={handleAddLoginLink}
                    className="px-3.5 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold shadow-xs hover:bg-violet-700 cursor-pointer"
                  >
                    + Add First Login Link
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {loginLinks.map((link, index) => {
                  const effectiveIcon = stagedLoginIcons[link.id]?.previewUrl || link.icon_url;
                  return (
                    <div
                      key={link.id}
                      className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex flex-col md:flex-row md:items-center gap-4 transition-all"
                    >
                      {/* Drag / Index Badge */}
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center font-mono font-bold text-[10px] shrink-0">
                          #{index + 1}
                        </span>
                      </div>

                      {/* Icon / SVG Picker */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center p-2 relative group overflow-hidden shadow-xs shrink-0">
                          {effectiveIcon ? (
                            <img
                              src={effectiveIcon}
                              alt={link.name || 'Icon'}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <ExternalLink className="w-5 h-5 text-slate-400" />
                          )}
                        </div>

                        {canManageQuickLinks && (
                          <div className="space-y-1">
                            <label
                              htmlFor={`login_icon_${link.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 shadow-xs cursor-pointer transition-colors"
                            >
                              <Upload className="w-3 h-3 text-violet-500" />
                              <span>{effectiveIcon ? 'Change Icon' : 'Upload Icon / SVG'}</span>
                            </label>
                            <input
                              id={`login_icon_${link.id}`}
                              type="file"
                              accept="image/png,image/jpeg,image/svg+xml,image/webp"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files?.[0]) {
                                  handleStageLoginIcon(link.id, e.target.files[0]);
                                  e.target.value = '';
                                }
                              }}
                            />
                            {effectiveIcon && (
                              <div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLoginIcon(index, link.id)}
                                  className="text-[10px] font-medium text-rose-500 hover:underline cursor-pointer"
                                >
                                  Remove Icon
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Link Name Input */}
                      <div className="flex-1 min-w-[140px]">
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Link Name
                        </label>
                        <input
                          type="text"
                          value={link.name}
                          onChange={(e) => handleUpdateLoginLink(index, 'name', e.target.value)}
                          placeholder="e.g. Terms of Service, Support"
                          disabled={!canManageQuickLinks}
                          className="w-full bg-white dark:bg-slate-900 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                      </div>

                      {/* URL Input */}
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                          <span>Target URL</span>
                          <span className="text-[10px] text-violet-600 dark:text-violet-400 font-mono font-normal">_blank (New Tab)</span>
                        </label>
                        <input
                          type="url"
                          value={link.url}
                          onChange={(e) => handleUpdateLoginLink(index, 'url', e.target.value)}
                          placeholder="https://example.com/terms"
                          disabled={!canManageQuickLinks}
                          className="w-full bg-white dark:bg-slate-900 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/30 font-mono disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                      </div>

                      {/* Actions: Reorder & Delete */}
                      {canManageQuickLinks && (
                        <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center pt-2 md:pt-4">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleMoveLoginLink(index, 'up')}
                            title="Move Up"
                            className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-xs"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={index === loginLinks.length - 1}
                            onClick={() => handleMoveLoginLink(index, 'down')}
                            title="Move Down"
                            className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-xs"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLoginLink(index, link.id)}
                            title="Delete Quick Link"
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: DASHBOARD OVERVIEW WIDGET CUSTOMIZATION                        */}
      {/* ========================================================================= */}
      {activeSection === 'dashboard' && canViewDashboard && (
        <DashboardWidgetCustomizer canManage={canManageDashboard} />
      )}
    </div>
  );
};
