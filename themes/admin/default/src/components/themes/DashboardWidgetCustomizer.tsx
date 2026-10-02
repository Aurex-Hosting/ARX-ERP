import React, { useState, useEffect, useMemo } from 'react';
import {
  User as UserIcon,
  Copy,
  Check,
  ExternalLink,
  Plus,
  Trash2,
  Edit2,
  GripVertical,
  Sparkles,
  Layers,
  ShieldCheck,
  Zap,
  Calendar,
  Upload,
  Save,
  RefreshCw,
  ShieldAlert,
  Globe,
  Activity,
  Cpu,
  Database,
  Lock,
  Code,
  BarChart,
  Server,
  Star,
  Terminal,
  ArrowUp,
  ArrowDown,
  X,
  Monitor,
  Laptop,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { PayablesCalendarWidget } from '../widgets/PayablesCalendarWidget';

export type WidgetSize = '1/4' | '2/4' | '3/4' | '4/4' | '1/3' | '2/3' | '3/3';
export type HeightLevel = '1/2-raw' | '2/2-raw';

export interface BannerButton {
  id: string;
  text: string;
  url: string;
  bg_color: string;
  text_color: string;
  style: 'solid' | 'gradient' | 'outline' | 'glass' | 'pill' | 'glow';
}

export interface BannerSlide {
  id: string;
  bg_image_url: string | null;
  overlay_opacity: number; // 0 to 1
  bg_blur: number; // 0 to 20
  title: string;
  title_use_gradient: boolean;
  title_color: string;
  title_gradient_from?: string;
  title_gradient_to?: string;
  title_gradient_dir?: string;
  subtitle: string;
  subtitle_use_gradient: boolean;
  subtitle_color: string;
  subtitle_gradient_from?: string;
  subtitle_gradient_to?: string;
  subtitle_gradient_dir?: string;
  description: string;
  description_use_gradient: boolean;
  description_color: string;
  description_gradient_from?: string;
  description_gradient_to?: string;
  description_gradient_dir?: string;
  buttons: BannerButton[];
}

export interface BannerWidgetConfig {
  id: string;
  enabled: boolean;
  size: WidgetSize;
  height?: HeightLevel;
  slideshow_enabled: boolean;
  autoplay: boolean;
  autoplay_interval: number;
  slides: BannerSlide[];
}

export interface ProfileWidgetConfig {
  id: string;
  enabled: boolean;
  size: '1/4'; // strictly 1/4 in PC view
  height?: HeightLevel;
  title: string;
  show_joined_date: boolean;
  show_user_id: boolean;
  show_email_spoiler: boolean;
  custom_bg_url: string | null;
}

export interface CustomWidget {
  id: string;
  enabled: boolean;
  size: WidgetSize;
  height?: HeightLevel;
  title: string;
  description: string;
  icon: string;
  badge?: string;
  color?: string;
  link_url?: string;
  link_text?: string;
}

export interface PayablesWidgetConfig {
  id: string;
  enabled: boolean;
  size: WidgetSize;
  height?: HeightLevel;
}

export interface DashboardWidgetsConfig {
  layout: string[];
  profile_widget: ProfileWidgetConfig;
  banner_widget: BannerWidgetConfig;
  custom_widgets: CustomWidget[];
  payables_widget: PayablesWidgetConfig;
}

const DEFAULT_CONFIG: DashboardWidgetsConfig = {
  layout: [
    'widget_banner',
    'widget_profile',
    'custom_api_modular',
    'custom_rbac_security',
    'custom_themeable_arch',
    'widget_payables_calendar',
  ],
  profile_widget: {
    id: 'widget_profile',
    enabled: true,
    size: '1/4',
    height: '2/2-raw',
    title: 'User Profile',
    show_joined_date: true,
    show_user_id: true,
    show_email_spoiler: true,
    custom_bg_url: null,
  },
  banner_widget: {
    id: 'widget_banner',
    enabled: true,
    size: '4/4',
    height: '2/2-raw',
    slideshow_enabled: true,
    autoplay: false,
    autoplay_interval: 5,
    slides: [
      {
        id: 'slide_default_1',
        bg_image_url: null,
        overlay_opacity: 0.25,
        bg_blur: 0,
        title: 'Welcome back',
        title_use_gradient: false,
        title_color: '#0f172a',
        title_gradient_from: '#7c3aed',
        title_gradient_to: '#4f46e5',
        title_gradient_dir: 'to-r',
        subtitle: 'Core Platform Ready',
        subtitle_use_gradient: false,
        subtitle_color: '#7c3aed',
        subtitle_gradient_from: '#7c3aed',
        subtitle_gradient_to: '#ec4899',
        subtitle_gradient_dir: 'to-r',
        description:
          'This is your clean baseline overview. As you install modules (CRM, Economy, Inventory, POS), their custom widgets and dashboards will automatically populate here.',
        description_use_gradient: false,
        description_color: '#475569',
        description_gradient_from: '#334155',
        description_gradient_to: '#64748b',
        description_gradient_dir: 'to-r',
        buttons: [
          {
            id: 'btn_1',
            text: 'Explore Modules',
            url: '/admin/modules',
            bg_color: '#7c3aed',
            text_color: '#ffffff',
            style: 'solid',
          },
        ],
      },
    ],
  },
  custom_widgets: [
    {
      id: 'custom_api_modular',
      enabled: true,
      size: '1/4',
      height: '2/2-raw',
      title: 'API-First Modular Engine',
      description: 'All features run as isolated modules. Core code remains immutable and safe during platform updates.',
      icon: 'Layers',
      badge: 'Architecture',
      color: '#7c3aed',
      link_url: '',
      link_text: '',
    },
    {
      id: 'custom_rbac_security',
      enabled: true,
      size: '1/4',
      height: '2/2-raw',
      title: 'Granular RBAC Security',
      description: 'Every module registers its own scoped permissions. Users only see and access authorized resources.',
      icon: 'ShieldCheck',
      badge: 'Security',
      color: '#3b82f6',
      link_url: '',
      link_text: '',
    },
    {
      id: 'custom_themeable_arch',
      enabled: true,
      size: '1/4',
      height: '2/2-raw',
      title: 'Themeable Architecture',
      description: 'Swap and customize frontend themes independently for the Dashboard and Admin surfaces.',
      icon: 'Zap',
      badge: 'Theming',
      color: '#10b981',
      link_url: '',
      link_text: '',
    },
  ],
  payables_widget: {
    id: 'widget_payables_calendar',
    enabled: true,
    size: '2/4',
    height: '2/2-raw',
  },
};

const AVAILABLE_ICONS: Record<string, React.FC<{ className?: string }>> = {
  Layers,
  ShieldCheck,
  Zap,
  Sparkles,
  Activity,
  Cpu,
  Database,
  Globe,
  Lock,
  Code,
  BarChart,
  Server,
  Star,
  Terminal,
};

interface DashboardWidgetCustomizerProps {
  canManage: boolean;
}

export const DashboardWidgetCustomizer: React.FC<DashboardWidgetCustomizerProps> = ({ canManage }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<DashboardWidgetsConfig>(DEFAULT_CONFIG);
  const [originalConfigJson, setOriginalConfigJson] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Staged files for banner slides and profile background
  const [stagedProfileBg, setStagedProfileBg] = useState<{ file: File; previewUrl: string } | null>(null);
  const [stagedSlideBgs, setStagedSlideBgs] = useState<Record<string, { file: File; previewUrl: string }>>({});

  // Active configuration modal / drawer
  const [editingWidget, setEditingWidget] = useState<
    'profile' | 'banner' | 'payables' | { type: 'custom'; id: string } | null
  >(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  // Drag and Drop state
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
  const [dragOverWidgetId, setDragOverWidgetId] = useState<string | null>(null);

  // Profile Widget interactive test states
  const [copiedId, setCopiedId] = useState(false);
  const [spoiledHovered, setSpoiledHovered] = useState(false);

  // Load config on mount
  const fetchConfig = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.get('/admin/theme/dashboard-widgets');
      if (res.data?.config) {
        setConfig(res.data.config);
        setOriginalConfigJson(JSON.stringify(res.data.config));
      } else {
        setConfig(DEFAULT_CONFIG);
        setOriginalConfigJson(JSON.stringify(DEFAULT_CONFIG));
      }
    } catch (err: any) {
      console.error('Failed to load dashboard widgets config:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to load configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const hasUnsavedChanges =
    JSON.stringify(config) !== originalConfigJson ||
    stagedProfileBg !== null ||
    Object.keys(stagedSlideBgs).length > 0;

  // Save handler
  const handleSave = async () => {
    if (!canManage) {
      alert('You do not have permission to manage dashboard widgets.');
      return;
    }
    setSaving(true);
    setSaveSuccess(false);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('config', JSON.stringify(config));

      if (stagedProfileBg) {
        formData.append('profile_bg_file', stagedProfileBg.file);
      }

      Object.entries(stagedSlideBgs).forEach(([slideId, staged]) => {
        formData.append(`slide_bg_file_${slideId}`, staged.file);
      });

      const res = await api.post('/admin/theme/dashboard-widgets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.config) {
        setConfig(res.data.config);
        setOriginalConfigJson(JSON.stringify(res.data.config));
      }

      // Cleanup object URLs
      if (stagedProfileBg) URL.revokeObjectURL(stagedProfileBg.previewUrl);
      Object.values(stagedSlideBgs).forEach((s) => URL.revokeObjectURL(s.previewUrl));
      setStagedProfileBg(null);
      setStagedSlideBgs({});

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to save dashboard widgets:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  // Reset to original
  const handleReset = () => {
    if (confirm('Are you sure you want to discard your unsaved changes?')) {
      if (originalConfigJson) {
        setConfig(JSON.parse(originalConfigJson));
      } else {
        setConfig(DEFAULT_CONFIG);
      }
      if (stagedProfileBg) URL.revokeObjectURL(stagedProfileBg.previewUrl);
      Object.values(stagedSlideBgs).forEach((s) => URL.revokeObjectURL(s.previewUrl));
      setStagedProfileBg(null);
      setStagedSlideBgs({});
    }
  };

  // Reorder layout array
  const moveWidget = (id: string, direction: 'up' | 'down') => {
    setConfig((prev) => {
      const layout = [...prev.layout];
      const index = layout.indexOf(id);
      if (index === -1) return prev;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= layout.length) return prev;
      const temp = layout[index];
      layout[index] = layout[targetIndex];
      layout[targetIndex] = temp;
      return { ...prev, layout };
    });
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedWidgetId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedWidgetId !== id) {
      setDragOverWidgetId(id);
    }
  };

  const handleDragEnd = () => {
    setDraggedWidgetId(null);
    setDragOverWidgetId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = draggedWidgetId || e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId) {
      setDraggedWidgetId(null);
      setDragOverWidgetId(null);
      return;
    }

    setConfig((prev) => {
      const layout = [...prev.layout];
      const sourceIndex = layout.indexOf(sourceId);
      const targetIndex = layout.indexOf(targetId);
      if (sourceIndex === -1 || targetIndex === -1) return prev;

      layout.splice(sourceIndex, 1);
      layout.splice(targetIndex, 0, sourceId);
      return { ...prev, layout };
    });

    setDraggedWidgetId(null);
    setDragOverWidgetId(null);
  };

  // Custom Widgets CRUD
  const handleAddCustomWidget = () => {
    const newId = `custom_${Date.now()}`;
    const newWidget: CustomWidget = {
      id: newId,
      enabled: true,
      size: '1/4',
      title: 'New Custom Widget',
      description: 'Add description and highlights for this custom module card.',
      icon: 'Layers',
      badge: 'Module',
      color: '#6366f1',
      link_url: '',
      link_text: '',
    };

    setConfig((prev) => ({
      ...prev,
      custom_widgets: [...prev.custom_widgets, newWidget],
      layout: [...prev.layout, newId],
    }));

    setEditingWidget({ type: 'custom', id: newId });
  };

  const handleDeleteCustomWidget = (id: string) => {
    if (!confirm('Are you sure you want to delete this custom widget?')) return;
    setConfig((prev) => ({
      ...prev,
      custom_widgets: prev.custom_widgets.filter((w) => w.id !== id),
      layout: prev.layout.filter((i) => i !== id),
    }));
    if (typeof editingWidget === 'object' && editingWidget?.id === id) {
      setEditingWidget(null);
    }
  };

  // Helper to get size class for the 4-column PC view grid (4 slots per row)
  const getSizeSpanClass = (size: WidgetSize) => {
    switch (size) {
      case '4/4':
      case '3/3':
        return 'col-span-1 sm:col-span-2 lg:col-span-4';
      case '3/4':
        return 'col-span-1 sm:col-span-2 lg:col-span-3';
      case '2/4':
      case '2/3':
        return 'col-span-1 sm:col-span-2 lg:col-span-2';
      case '1/4':
      case '1/3':
      default:
        return 'col-span-1';
    }
  };

  const [isLg, setIsLg] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );

  useEffect(() => {
    const handleResize = () => {
      setIsLg(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 2D Android Widget Grid Packer: calculates exact column and row coordinates so two 1/2-raw widgets stack in 1 column
  const gridPositions = useMemo(() => {
    const positions = new Map<string, { col: number; row: number; colSpan: number; rowSpan: number }>();
    const occupied: boolean[][] = [];
    const cols = 4;

    const isFree = (r: number, c: number, rSpan: number, cSpan: number): boolean => {
      if (c + cSpan > cols) return false;
      for (let row = r; row < r + rSpan; row++) {
        for (let col = c; col < c + cSpan; col++) {
          if (occupied[row]?.[col]) return false;
        }
      }
      return true;
    };

    const markOccupied = (r: number, c: number, rSpan: number, cSpan: number) => {
      for (let row = r; row < r + rSpan; row++) {
        if (!occupied[row]) occupied[row] = [];
        for (let col = c; col < c + cSpan; col++) {
          occupied[row][col] = true;
        }
      }
    };

    for (const widgetId of config.layout) {
      let size: WidgetSize = '1/4';
      let height: HeightLevel = '2/2-raw';

      if (widgetId === 'widget_banner') {
        size = config.banner_widget.size;
        height = config.banner_widget.height || '2/2-raw';
      } else if (widgetId === 'widget_profile') {
        size = '1/4';
        height = config.profile_widget.height || '2/2-raw';
      } else if (widgetId === 'widget_payables_calendar') {
        size = config.payables_widget.size;
        height = config.payables_widget.height || '2/2-raw';
      } else {
        const cw = config.custom_widgets.find((w) => w.id === widgetId);
        if (cw) {
          size = cw.size;
          height = cw.height || '2/2-raw';
        }
      }

      const colSpan =
        size === '4/4' || size === '3/3' ? 4 :
        size === '3/4' ? 3 :
        size === '2/4' || size === '2/3' ? 2 : 1;

      const rowSpan = height === '1/2-raw' ? 1 : 2;

      let placed = false;

      // Half-row widgets (1/2-raw): stack in bottom slot (blockStart + 1) of any row block where top slot is occupied
      if (rowSpan === 1) {
        const maxRows = Math.max(occupied.length, 2);
        for (let blockStart = 0; blockStart < maxRows; blockStart += 2) {
          for (let c = 0; c <= cols - colSpan; c++) {
            let topOccupied = true;
            for (let col = c; col < c + colSpan; col++) {
              if (!occupied[blockStart]?.[col]) {
                topOccupied = false;
                break;
              }
            }
            if (topOccupied && isFree(blockStart + 1, c, 1, colSpan)) {
              positions.set(widgetId, { col: c, row: blockStart + 1, colSpan, rowSpan: 1 });
              markOccupied(blockStart + 1, c, 1, colSpan);
              placed = true;
              break;
            }
          }
          if (placed) break;
        }
      }

      // Standard placement: find earliest slot
      if (!placed) {
        let r = 0;
        while (!placed) {
          const checkR = (rowSpan === 2 && r % 2 !== 0) ? r + 1 : r;
          for (let c = 0; c <= cols - colSpan; c++) {
            if (isFree(checkR, c, rowSpan, colSpan)) {
              positions.set(widgetId, { col: c, row: checkR, colSpan, rowSpan });
              markOccupied(checkR, c, rowSpan, colSpan);
              placed = true;
              break;
            }
          }
          r += (rowSpan === 2 ? 2 : 1);
        }
      }
    }

    return positions;
  }, [config]);

  if (loading) {
    return (
      <div className="p-12 text-center space-y-4">
        <RefreshCw className="w-8 h-8 text-violet-600 animate-spin mx-auto" />
        <p className="text-sm text-slate-500">Loading Dashboard Overview layout & widgets...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Mobile Screen Blocker Notice (< 1024px) */}
      <div className="block lg:hidden py-8 px-4">
        <div className="max-w-md mx-auto p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl text-center space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-violet-500/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center mx-auto shadow-inner relative">
            <Monitor className="w-10 h-10" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-xs">
              <Laptop className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Please open with pc or laptop to continue
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Dashboard Overview widget customization requires a desktop or laptop display to configure, resize, and preview the multi-column 2D grid layout in real time.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/80 text-[11px] font-medium text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
              <Monitor className="w-3.5 h-3.5 text-violet-500" />
              <span>Requires Screen Width &ge; 1024px (PC / Laptop)</span>
            </span>
          </div>
        </div>
      </div>

      {/* Desktop & Laptop Customizer Section (Hidden on mobile < 1024px) */}
      <div className="hidden lg:block space-y-6">
        {/* Top Banner & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Overview Page Widget Customization</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400">
              Android-Style Drag Slots
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Drag widgets in real time to rearrange positions. Configure strict slot widths (1/4, 2/4, 3/4, 4/4 - 4 per row), slideshows, profile card, and custom cards.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <button
              onClick={handleReset}
              disabled={saving}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-xl transition-all cursor-pointer"
            >
              Reset
            </button>
          )}

          <button
            onClick={handleAddCustomWidget}
            disabled={!canManage}
            className="px-3.5 py-2 text-xs font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-900/50 rounded-xl hover:bg-violet-100 dark:hover:bg-violet-900/60 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Custom Widget</span>
          </button>

          <button
            onClick={handleSave}
            disabled={!canManage || !hasUnsavedChanges || saving}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              saveSuccess
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                : hasUnsavedChanges
                ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-500/25 ring-2 ring-violet-400/30'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
            }`}
          >
            {saving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : saveSuccess ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{saveSuccess ? 'Changes Saved!' : saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Permission alert if read-only */}
      {!canManage && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>
            <strong>Read-Only Access:</strong> You can inspect the overview layout and widgets, but lack permission to modify them (<code className="font-mono text-[11px]">themes.dashboard.manage</code>).
          </span>
        </div>
      )}

      {/* Unsaved changes notification banner */}
      {hasUnsavedChanges && (
        <div className="flex items-center justify-between p-3.5 px-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs">
          <div className="flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span>You have staged widget layout or configuration changes that have not been saved yet.</span>
          </div>
          <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">Click &ldquo;Save Changes&rdquo; to persist</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ANDROID HOME WIDGETS REAL-TIME DRAG & DROP LAYOUT GRID                    */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>
            Live Dashboard Layout Preview (4 slots per row in PC view). Drag cards by the handle or anywhere on the header to reorder in real time:
          </span>
          <span className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
            {config.layout.length} Active Slots
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 p-4 rounded-3xl bg-slate-100/60 dark:bg-slate-950/40 border border-dashed border-slate-300 dark:border-slate-800 lg:[grid-auto-rows:200px] min-h-[420px]">
          {config.layout.map((widgetId, index) => {
            // Find widget details
            let widgetType: 'banner' | 'profile' | 'payables' | 'custom' = 'custom';
            let title = '';
            let subtitle = '';
            let size: WidgetSize = '1/4';
            let height: HeightLevel = '2/2-raw';
            let enabled = true;
            let iconComponent = <Layers className="w-4 h-4" />;

            if (widgetId === 'widget_banner') {
              widgetType = 'banner';
              title = 'Announcement Banner & Slideshow';
              subtitle = `${config.banner_widget.slides.length} slide(s) • ${config.banner_widget.slideshow_enabled ? 'Slideshow Active' : 'Static'}`;
              size = config.banner_widget.size;
              height = config.banner_widget.height || '2/2-raw';
              enabled = config.banner_widget.enabled;
              iconComponent = <Sparkles className="w-4 h-4 text-violet-500" />;
            } else if (widgetId === 'widget_profile') {
              widgetType = 'profile';
              title = config.profile_widget.title || 'User Profile Card';
              subtitle = 'Avatar, Spoiled Email, User ID & Joined Date';
              size = '1/4'; // strictly 1/4
              height = config.profile_widget.height || '2/2-raw';
              enabled = config.profile_widget.enabled;
              iconComponent = <UserIcon className="w-4 h-4 text-emerald-500" />;
            } else if (widgetId === 'widget_payables_calendar') {
              widgetType = 'payables';
              title = 'Liabilities & Payables Calendar';
              subtitle = 'Live Month Calendar & Alerts';
              size = config.payables_widget.size;
              height = config.payables_widget.height || '2/2-raw';
              enabled = config.payables_widget.enabled;
              iconComponent = <Calendar className="w-4 h-4 text-blue-500" />;
            } else {
              // Custom Widget
              const customItem = config.custom_widgets.find((w) => w.id === widgetId);
              if (customItem) {
                widgetType = 'custom';
                title = customItem.title;
                subtitle = customItem.badge || 'Custom Widget Card';
                size = customItem.size;
                height = customItem.height || '2/2-raw';
                enabled = customItem.enabled;
                const IconComp = AVAILABLE_ICONS[customItem.icon] || Layers;
                iconComponent = <IconComp className="w-4 h-4" />;
              } else {
                return null;
              }
            }

            const isDragging = draggedWidgetId === widgetId;
            const isDragOver = dragOverWidgetId === widgetId;
            const pos = isLg ? gridPositions.get(widgetId) : null;
            const isHalfRow = height === '1/2-raw';

            return (
              <div
                key={widgetId}
                draggable={canManage}
                onDragStart={(e) => handleDragStart(e, widgetId)}
                onDragOver={(e) => handleDragOver(e, widgetId)}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(e, widgetId)}
                style={pos ? {
                  gridColumn: `${pos.col + 1} / span ${pos.colSpan}`,
                  gridRow: `${pos.row + 1} / span ${pos.rowSpan}`,
                } : undefined}
                className={`transition-all duration-200 select-none ${
                  pos ? 'h-full' : getSizeSpanClass(size)
                } ${isHalfRow ? 'min-h-[190px]' : 'min-h-[400px]'} ${
                  isDragging ? 'opacity-30 scale-95' : 'opacity-100'
                } ${
                  isDragOver
                    ? 'ring-2 ring-violet-500 ring-offset-2 dark:ring-offset-slate-900 scale-[1.01]'
                    : ''
                }`}
              >
                <div
                  className={`h-full rounded-2xl bg-white dark:bg-slate-900 border ${
                    enabled
                      ? 'border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md'
                      : 'border-slate-200/40 dark:border-slate-800/60 opacity-60 bg-slate-50/50 dark:bg-slate-900/50'
                  } ${isHalfRow ? 'p-3' : 'p-4'} flex flex-col justify-between transition-all overflow-hidden`}
                >
                  {/* Card Header & Drag Handle */}
                  <div className={`flex items-center justify-between gap-2 ${isHalfRow ? 'mb-1 pb-1' : 'mb-3 pb-3'} border-b border-slate-100 dark:border-slate-800/80`}>
                    <div className="flex items-center gap-2">
                      {canManage && (
                        <div
                          className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 -ml-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Drag to rearrange position"
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>
                      )}
                      <div className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {iconComponent}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1 flex items-center gap-1.5">
                          <span>{title}</span>
                          {!enabled && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-500 font-normal">
                              Disabled
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                          {subtitle}
                        </div>
                      </div>
                    </div>

                    {/* Size & Height Badges */}
                    <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                          size === '4/4' || size === '3/3'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            : size === '3/4'
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                            : size === '2/4' || size === '2/3'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {size === '1/4' && widgetType === 'profile' ? '1/4 col' : `${size} col`}
                      </span>
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                          height === '2/2-raw'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                        }`}
                      >
                        {height}
                      </span>

                      {/* Reorder arrows */}
                      {canManage && (
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => moveWidget(widgetId, 'up')}
                            disabled={index === 0}
                            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-20 cursor-pointer"
                            title="Move left/up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => moveWidget(widgetId, 'down')}
                            disabled={index === config.layout.length - 1}
                            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-20 cursor-pointer"
                            title="Move right/down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Mini Body Preview */}
                  <div className={`${isHalfRow ? 'py-0.5' : 'py-2'} text-xs text-slate-600 dark:text-slate-300`}>
                    {widgetType === 'profile' && (
                      isHalfRow ? (
                        <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs">
                          <div className="w-7 h-7 rounded-full bg-violet-600 text-white font-bold flex items-center justify-center text-[11px] shrink-0">
                            {user?.name?.charAt(0) || 'U'}
                          </div>
                          <div className="min-w-0 flex-1 text-[11px] leading-tight">
                            <span className="font-semibold text-slate-900 dark:text-white truncate block">
                              {user?.first_name || user?.name || 'Administrator'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ID: {user?.identifier || 'USR-0001'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center">
                          <div className="w-12 h-12 rounded-full bg-violet-600 text-white font-bold flex items-center justify-center text-sm mx-auto shadow-sm">
                            {user?.name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white text-xs leading-none">
                              {user?.first_name || user?.name || 'Administrator'} {user?.last_name || ''}
                            </div>
                            <div className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 mt-1">
                              {user?.is_super_admin ? 'Super Administrator' : 'Administrator'}
                            </div>
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5 pt-1">
                            <span>Email : {config.profile_widget.show_email_spoiler ? '••••••' : user?.email}</span>
                            <span>|</span>
                            <span>UserID : {user?.identifier || 'USR-0001'}</span>
                          </div>
                        </div>
                      )
                    )}

                    {widgetType === 'banner' && (
                      <div className="space-y-0.5 p-2 rounded-xl bg-gradient-to-r from-violet-500/10 via-indigo-500/10 to-transparent border border-violet-500/20">
                        <div className="font-bold text-slate-900 dark:text-white text-xs line-clamp-1">
                          {config.banner_widget.slides[0]?.title || 'Welcome Banner'}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                          {config.banner_widget.slides[0]?.description || 'Customizable slides & gradient colors'}
                        </div>
                      </div>
                    )}

                    {widgetType === 'payables' && (
                      <div className="space-y-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-[11px]">
                        <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-semibold">
                          <span>Live Monthly Calendar</span>
                          <span className="text-[10px] text-violet-600 dark:text-violet-400 font-mono">
                            {config.payables_widget.size}
                          </span>
                        </div>
                        {!isHalfRow && (
                          <p className="text-slate-400 text-[10px]">
                            {config.payables_widget.size === '1/4'
                              ? 'Small compact month calendar'
                              : config.payables_widget.size === '2/4'
                              ? 'Medium width calendar view'
                              : 'Detailed dual-pane stream & upcoming dues'}
                          </p>
                        )}
                      </div>
                    )}

                    {widgetType === 'custom' && (
                      <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                        <p className={`text-[11px] text-slate-600 dark:text-slate-400 ${isHalfRow ? 'line-clamp-1' : 'line-clamp-2'}`}>
                          {config.custom_widgets.find((w) => w.id === widgetId)?.description || ''}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Card Actions Footer */}
                  <div className={`${isHalfRow ? 'pt-2 mt-1' : 'pt-3 mt-2'} border-t border-slate-100 dark:border-slate-800/80 ${isHalfRow ? 'space-y-1.5' : 'space-y-2'}`}>
                    {/* Primary Row: Status Toggle on Left, Action Buttons on Right */}
                    <div className="flex items-center justify-between gap-2">
                      {/* Enable/Disable Toggle */}
                      <button
                        onClick={() => {
                          if (!canManage) return;
                          if (widgetType === 'profile') {
                            setConfig((prev) => ({
                              ...prev,
                              profile_widget: { ...prev.profile_widget, enabled: !prev.profile_widget.enabled },
                            }));
                          } else if (widgetType === 'banner') {
                            setConfig((prev) => ({
                              ...prev,
                              banner_widget: { ...prev.banner_widget, enabled: !prev.banner_widget.enabled },
                            }));
                          } else if (widgetType === 'payables') {
                            setConfig((prev) => ({
                              ...prev,
                              payables_widget: { ...prev.payables_widget, enabled: !prev.payables_widget.enabled },
                            }));
                          } else {
                            setConfig((prev) => ({
                              ...prev,
                              custom_widgets: prev.custom_widgets.map((cw) =>
                                cw.id === widgetId ? { ...cw, enabled: !cw.enabled } : cw
                              ),
                            }));
                          }
                        }}
                        disabled={!canManage}
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-lg cursor-pointer transition-all ${
                          enabled
                            ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                            : 'text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {enabled ? 'Active' : 'Hidden'}
                      </button>

                      {/* Customize & Delete Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            if (widgetType === 'profile') setEditingWidget('profile');
                            else if (widgetType === 'banner') setEditingWidget('banner');
                            else if (widgetType === 'payables') setEditingWidget('payables');
                            else setEditingWidget({ type: 'custom', id: widgetId });
                          }}
                          className="px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Customize</span>
                        </button>

                        {widgetType === 'custom' && canManage && (
                          <button
                            onClick={() => handleDeleteCustomWidget(widgetId)}
                            className="p-1 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer transition-all"
                            title="Delete custom widget"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Secondary Row: Dimension Selectors (Col & Row) */}
                    {canManage && (
                      <div className="grid grid-cols-2 gap-2 pt-0.5">
                        {/* Width Column Selector */}
                        {widgetType === 'profile' ? (
                          <div className="w-full min-w-0 flex items-center justify-between px-2 py-1 rounded-lg text-[11px] font-mono font-medium bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-slate-500 dark:text-slate-400">
                            <span>Col: 1/4</span>
                            <span className="text-[9px] uppercase tracking-wider text-slate-400">Lock</span>
                          </div>
                        ) : (
                          <select
                            value={size}
                            onChange={(e) => {
                              const newSize = e.target.value as WidgetSize;
                              if (widgetType === 'banner') {
                                setConfig((prev) => ({
                                  ...prev,
                                  banner_widget: { ...prev.banner_widget, size: newSize },
                                }));
                              } else if (widgetType === 'payables') {
                                setConfig((prev) => ({
                                  ...prev,
                                  payables_widget: { ...prev.payables_widget, size: newSize },
                                }));
                              } else {
                                setConfig((prev) => ({
                                  ...prev,
                                  custom_widgets: prev.custom_widgets.map((cw) =>
                                    cw.id === widgetId ? { ...cw, size: newSize } : cw
                                  ),
                                }));
                              }
                            }}
                            className="w-full min-w-0 px-2 py-1 rounded-lg text-[11px] font-mono font-medium bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 cursor-pointer focus:outline-none focus:ring-1 focus:ring-violet-500 truncate"
                            title="Width Columns"
                          >
                            <option value="1/4" className="dark:bg-slate-900">Col: 1/4</option>
                            <option value="2/4" className="dark:bg-slate-900">Col: 2/4</option>
                            <option value="3/4" className="dark:bg-slate-900">Col: 3/4</option>
                            <option value="4/4" className="dark:bg-slate-900">Col: 4/4</option>
                          </select>
                        )}

                        {/* Height Row Selector */}
                        <select
                          value={height}
                          onChange={(e) => {
                            const newHeight = e.target.value as HeightLevel;
                            if (widgetType === 'profile') {
                              setConfig((prev) => ({
                                ...prev,
                                profile_widget: { ...prev.profile_widget, height: newHeight },
                              }));
                            } else if (widgetType === 'banner') {
                              setConfig((prev) => ({
                                ...prev,
                                banner_widget: { ...prev.banner_widget, height: newHeight },
                              }));
                            } else if (widgetType === 'payables') {
                              setConfig((prev) => ({
                                ...prev,
                                payables_widget: { ...prev.payables_widget, height: newHeight },
                              }));
                            } else {
                              setConfig((prev) => ({
                                ...prev,
                                custom_widgets: prev.custom_widgets.map((cw) =>
                                  cw.id === widgetId ? { ...cw, height: newHeight } : cw
                                ),
                              }));
                            }
                          }}
                          className="w-full min-w-0 px-2 py-1 rounded-lg text-[11px] font-mono font-medium bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 cursor-pointer focus:outline-none focus:ring-1 focus:ring-violet-500 truncate"
                          title="Height Level (Rows)"
                        >
                          <option value="2/2-raw" className="dark:bg-slate-900">Row: 2/2 Full</option>
                          <option value="1/2-raw" className="dark:bg-slate-900">Row: 1/2 Half</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL / DRAWER: PROFILE WIDGET CUSTOMIZER                                 */}
      {/* ========================================================================= */}
      {editingWidget === 'profile' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-200/60 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Profile Widget Customization</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Configures the 1/4 PC view User Profile card with spoiled email, copyable User ID, and profile link.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingWidget(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Strict Width Notice */}
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between">
                <span>
                  <strong>Strict Width:</strong> The Profile widget occupies exactly <strong>1/4</strong> width in PC view (single column, 4 slots per row) as required.
                </span>
                <span className="font-mono text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                  1/4 PC Width
                </span>
              </div>

              {/* Height Level Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Select Height Level (Rows):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      id: '2/2-raw' as HeightLevel,
                      label: 'Full Row Height (2/2-raw)',
                      badge: 'Baseline (~394px)',
                      desc: 'Standard enlarged profile card with large circular avatar, background artwork, and full spacing matching overview cards',
                    },
                    {
                      id: '1/2-raw' as HeightLevel,
                      label: 'Half Row Height (1/2-raw)',
                      badge: 'Compact (~190px)',
                      desc: 'Compact single half-row layout with horizontal avatar and quick details for tight dashboard rows',
                    },
                  ].map((hl) => {
                    const isSelected = (config.profile_widget.height || '2/2-raw') === hl.id;
                    return (
                      <button
                        type="button"
                        key={hl.id}
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            profile_widget: {
                              ...prev.profile_widget,
                              height: hl.id,
                            },
                          }))
                        }
                        className={`p-3.5 rounded-2xl text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-violet-50 dark:bg-violet-950/30 ring-2 ring-violet-500 shadow-sm border border-violet-500/20'
                            : 'bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200/60 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {hl.label}
                          </span>
                          {isSelected ? (
                            <Check className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                          ) : (
                            <span className="text-[10px] font-mono font-medium text-slate-400 bg-slate-200/50 dark:bg-slate-700/50 px-1.5 py-0.5 rounded">
                              {hl.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {hl.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Live Preview ({config.profile_widget.height || '2/2-raw'}):
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {(config.profile_widget.height || '2/2-raw') === '2/2-raw' ? 'Full height (~394px)' : 'Half row height (~190px)'}
                  </span>
                </div>

                {(config.profile_widget.height || '2/2-raw') === '1/2-raw' ? (
                  <div className="max-w-md mx-auto min-h-[190px] rounded-3xl bg-white dark:bg-[#0c101b] shadow-md flex flex-col justify-between relative p-4 overflow-hidden">
                    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
                      <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-violet-600/[0.06] blur-2xl" />
                    </div>
                    <div className="relative z-10 flex items-center gap-3.5">
                      <div className="w-14 h-14 rounded-full border-2 border-white dark:border-[#0c101b] overflow-hidden bg-violet-600 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-md">
                        {user?.avatar_url ? (
                          <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                        ) : (
                          <span>{user?.name?.charAt(0) || 'A'}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-base font-bold text-slate-900 dark:text-white truncate">
                          {user?.first_name || user?.name || 'Administrator'} {user?.last_name || ''}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 truncate">
                          <span>UserID: <strong className="font-mono text-slate-700 dark:text-slate-300">{user?.identifier || `USR-${user?.id || '001'}`}</strong></span>
                          <span>•</span>
                          <span className="text-emerald-500 font-semibold">{user?.active_sessions_count || 1} active</span>
                        </div>
                        {config.profile_widget.show_email_spoiler && (
                          <div
                            onMouseEnter={() => setSpoiledHovered(true)}
                            onMouseLeave={() => setSpoiledHovered(false)}
                            className={`text-[10px] cursor-pointer transition-all mt-0.5 font-mono ${
                              spoiledHovered ? 'filter-none text-slate-800 dark:text-slate-200' : 'filter blur-[3px] text-slate-400 select-none'
                            }`}
                          >
                            {user?.email || 'admin@arx-erp.local'}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="relative z-10 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">
                        {config.profile_widget.show_joined_date ? `Joined: ${user?.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Oct 1, 2026'}` : 'Overview Profile'}
                      </span>
                      <button
                        type="button"
                        className="py-1 px-3 rounded-lg text-[11px] font-semibold bg-violet-600 text-white flex items-center gap-1 shadow-xs"
                      >
                        <span>Profile</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-sm mx-auto min-h-[394px] rounded-3xl overflow-hidden bg-white dark:bg-[#0c101b] shadow-md flex flex-col justify-between relative">
                    {/* Subtle Sleek Ambient Glow */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
                      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-48 h-32 rounded-full bg-violet-600/[0.07] dark:bg-violet-500/[0.08] blur-2xl" />
                      <div className="absolute -bottom-8 -right-8 w-36 h-36 rounded-full bg-indigo-600/[0.04] dark:bg-indigo-500/[0.05] blur-2xl" />
                    </div>

                    {/* Main Content */}
                    <div className="relative z-10">
                      {/* Background Cover - Darker fallback when no banner (increased height h-28) */}
                      <div
                        className="h-28 w-full bg-cover bg-center relative border-b border-slate-200/40 dark:border-slate-800/40"
                        style={{
                          backgroundImage: stagedProfileBg
                            ? `url(${stagedProfileBg.previewUrl})`
                            : config.profile_widget.custom_bg_url
                            ? `url(${config.profile_widget.custom_bg_url})`
                            : 'linear-gradient(135deg, #090d16 0%, #15102a 50%, #0d121f 100%)',
                        }}
                      >
                        <div className="absolute inset-0 bg-black/40" />
                      </div>

                      {/* Profile Body */}
                      <div className="px-5 pb-2 -mt-11 relative space-y-3.5">
                        {/* Centered Circular Avatar */}
                        <div className="flex justify-center">
                          <div className="w-22 h-22 rounded-full border-4 border-white dark:border-slate-900 overflow-hidden bg-violet-600 text-white font-bold text-xl flex items-center justify-center shadow-lg">
                            {user?.avatar_url ? (
                              <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                            ) : (
                              <span>{user?.name?.charAt(0) || 'A'}</span>
                            )}
                          </div>
                        </div>

                        {/* Centered Larger Name (Role removed) */}
                        <div className="text-center pt-0.5">
                          <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                            {user?.first_name || user?.name || 'Administrator'} {user?.last_name || ''}
                          </h4>
                        </div>

                        {/* Plain Text Email Spoiled and User ID on Side (NO rounded boxes) */}
                        <div className="flex items-center justify-center flex-wrap gap-x-2.5 gap-y-1 text-xs text-slate-600 dark:text-slate-400 pt-0.5">
                          {config.profile_widget.show_email_spoiler && (
                            <span className="inline-flex items-center gap-1">
                              <span className="text-slate-500 font-medium">Email :</span>
                              <span
                                onMouseEnter={() => setSpoiledHovered(true)}
                                onMouseLeave={() => setSpoiledHovered(false)}
                                className={`cursor-pointer transition-all duration-300 font-mono ${
                                  spoiledHovered
                                    ? 'filter-none text-slate-900 dark:text-white'
                                    : 'filter blur-[4px] select-none text-slate-400'
                                }`}
                                title="Hover to reveal email"
                              >
                                {user?.email || 'admin@arx-erp.local'}
                              </span>
                            </span>
                          )}

                          {config.profile_widget.show_email_spoiler && config.profile_widget.show_user_id && (
                            <span className="text-slate-300 dark:text-slate-700 select-none">|</span>
                          )}

                          {config.profile_widget.show_user_id && (
                            <span className="inline-flex items-center gap-1">
                              <span className="text-slate-500 font-medium">UserID :</span>
                              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                                {user?.identifier || `USR-${user?.id || '001'}`}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(user?.identifier || `USR-${user?.id || '001'}`);
                                  setCopiedId(true);
                                  setTimeout(() => setCopiedId(false), 2000);
                                }}
                                className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                                title="Copy User ID"
                              >
                                {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </span>
                          )}
                        </div>

                        {/* Active Login Sessions count & Joined Date */}
                        <div className="flex items-center justify-center flex-wrap gap-x-2.5 gap-y-1 text-xs text-slate-600 dark:text-slate-400 pt-0.5">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-slate-500 font-medium">Active Sessions :</span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                              {user?.active_sessions_count || 1}
                            </span>
                          </span>

                          {config.profile_widget.show_joined_date && (
                            <>
                              <span className="text-slate-300 dark:text-slate-700 select-none">|</span>
                              <span className="inline-flex items-center gap-1">
                                <span className="text-slate-500 font-medium">Joined :</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {user?.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Oct 1, 2026'}
                                </span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* View Profile Button */}
                    <div className="p-5 pt-2 relative z-10">
                      <button
                        type="button"
                        className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-violet-600 text-white flex items-center justify-center gap-1.5 shadow-sm shadow-violet-500/20"
                      >
                        <span>View Profile</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Form Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Widget Title
                  </label>
                  <input
                    type="text"
                    value={config.profile_widget.title}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        profile_widget: { ...prev.profile_widget, title: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Cover Image Upload / URL */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Custom Cover Background Image
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload File</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const previewUrl = URL.createObjectURL(file);
                          setStagedProfileBg({ file, previewUrl });
                        }}
                      />
                    </label>
                    {(stagedProfileBg || config.profile_widget.custom_bg_url) && (
                      <button
                        type="button"
                        onClick={() => {
                          if (stagedProfileBg) URL.revokeObjectURL(stagedProfileBg.previewUrl);
                          setStagedProfileBg(null);
                          setConfig((prev) => ({
                            ...prev,
                            profile_widget: { ...prev.profile_widget, custom_bg_url: null },
                          }));
                        }}
                        className="px-2.5 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.profile_widget.show_email_spoiler}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        profile_widget: { ...prev.profile_widget, show_email_spoiler: e.target.checked },
                      }))
                    }
                    className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Email Spoiled Hover to Show
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Conceals the email with a blur effect until hovered, preserving privacy in shared/screen environments.
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.profile_widget.show_user_id}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        profile_widget: { ...prev.profile_widget, show_user_id: e.target.checked },
                      }))
                    }
                    className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Show User ID with 1-Click Copy
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Renders the immutable identifier (USR-XXX) with a copy-to-clipboard button.
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.profile_widget.show_joined_date}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        profile_widget: { ...prev.profile_widget, show_joined_date: e.target.checked },
                      }))
                    }
                    className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Show Joined Date
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Displays member registration date.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200/60 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setEditingWidget(null)}
                className="px-4 py-2 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow cursor-pointer"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL / DRAWER: ANNOUNCEMENT BANNER & SLIDESHOW CUSTOMIZER                */}
      {/* ========================================================================= */}
      {editingWidget === 'banner' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-200/60 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Announcement Banner & Slideshow</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Customize background blur, overlay opacity, gradient typography, and action buttons.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingWidget(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Banner Size & Height Dimensions */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Widget Width (Columns in PC view)
                  </label>
                  <select
                    value={config.banner_widget.size}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        banner_widget: { ...prev.banner_widget, size: e.target.value as WidgetSize },
                      }))
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="1/4">1/4 (1 Column - Compact)</option>
                    <option value="2/4">2/4 (2 Columns - Half Width)</option>
                    <option value="3/4">3/4 (3 Columns - Wide)</option>
                    <option value="4/4">4/4 (4 Columns - Full Row)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Widget Height Level (Rows)
                  </label>
                  <select
                    value={config.banner_widget.height || '2/2-raw'}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        banner_widget: { ...prev.banner_widget, height: e.target.value as HeightLevel },
                      }))
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="2/2-raw">2/2-raw (Full Height - Standard Baseline ~394px)</option>
                    <option value="1/2-raw">1/2-raw (Half Height - Compact ~190px)</option>
                  </select>
                </div>
              </div>

              {/* Slideshow General Options */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.banner_widget.slideshow_enabled}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          banner_widget: { ...prev.banner_widget, slideshow_enabled: e.target.checked },
                        }))
                      }
                      className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">
                        Enable Slideshow Option
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Supports multiple slides with carousel navigation and automated slide rotation.
                      </p>
                    </div>
                  </label>

                  {/* Add Slide Button */}
                  <button
                    onClick={() => {
                      const newSlideId = `slide_${Date.now()}`;
                      const newSlide: BannerSlide = {
                        id: newSlideId,
                        bg_image_url: null,
                        overlay_opacity: 0.3,
                        bg_blur: 0,
                        title: 'New Announcement Slide',
                        title_use_gradient: true,
                        title_color: '#ffffff',
                        title_gradient_from: '#8b5cf6',
                        title_gradient_to: '#ec4899',
                        title_gradient_dir: 'to-r',
                        subtitle: 'Update Notice',
                        subtitle_use_gradient: false,
                        subtitle_color: '#8b5cf6',
                        description: 'Enter your announcement details here.',
                        description_use_gradient: false,
                        description_color: '#64748b',
                        buttons: [
                          {
                            id: `btn_${Date.now()}`,
                            text: 'Learn More',
                            url: '/',
                            bg_color: '#8b5cf6',
                            text_color: '#ffffff',
                            style: 'solid',
                          },
                        ],
                      };
                      setConfig((prev) => ({
                        ...prev,
                        banner_widget: {
                          ...prev.banner_widget,
                          slides: [...prev.banner_widget.slides, newSlide],
                        },
                      }));
                      setActiveSlideIndex(config.banner_widget.slides.length);
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-violet-600 bg-white dark:bg-slate-900 border border-violet-200 dark:border-violet-800 rounded-xl hover:bg-violet-50 cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Slide</span>
                  </button>
                </div>

                {/* Slides Selector Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                  {config.banner_widget.slides.map((s, idx) => (
                    <div
                      key={s.id}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                        activeSlideIndex === idx
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                      onClick={() => setActiveSlideIndex(idx)}
                    >
                      <span>Slide {idx + 1}</span>
                      {config.banner_widget.slides.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Delete this slide?')) {
                              setConfig((prev) => ({
                                ...prev,
                                banner_widget: {
                                  ...prev.banner_widget,
                                  slides: prev.banner_widget.slides.filter((_, i) => i !== idx),
                                },
                              }));
                              setActiveSlideIndex(Math.max(0, idx - 1));
                            }
                          }}
                          className="hover:text-rose-300 p-0.5 rounded cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Current Active Slide Editor */}
              {(() => {
                const currentSlide = config.banner_widget.slides[activeSlideIndex] || config.banner_widget.slides[0];
                if (!currentSlide) return null;

                const stagedBg = stagedSlideBgs[currentSlide.id];
                const activeBgUrl = stagedBg ? stagedBg.previewUrl : currentSlide.bg_image_url;

                const updateCurrentSlide = (fields: Partial<BannerSlide>) => {
                  setConfig((prev) => {
                    const slides = [...prev.banner_widget.slides];
                    slides[activeSlideIndex] = { ...slides[activeSlideIndex], ...fields };
                    return {
                      ...prev,
                      banner_widget: { ...prev.banner_widget, slides },
                    };
                  });
                };

                return (
                  <div className="space-y-6">
                    {/* Live Slide Preview */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Slide {activeSlideIndex + 1} Live Preview:
                      </label>
                      <div
                        className="relative overflow-hidden rounded-3xl p-6 md:p-8 min-h-[220px] flex flex-col justify-center shadow-md bg-cover bg-center transition-all"
                        style={{
                          backgroundImage: activeBgUrl
                            ? `url(${activeBgUrl})`
                            : 'linear-gradient(to right, #ffffff, #f8fafc, #ede9fe)',
                        }}
                      >
                        {/* Overlay & Blur Layer */}
                        <div
                          className="absolute inset-0 bg-black transition-opacity"
                          style={{
                            opacity: currentSlide.overlay_opacity,
                            backdropFilter: currentSlide.bg_blur ? `blur(${currentSlide.bg_blur}px)` : undefined,
                            WebkitBackdropFilter: currentSlide.bg_blur ? `blur(${currentSlide.bg_blur}px)` : undefined,
                          }}
                        />

                        {/* Content */}
                        <div className="relative z-10 space-y-2 max-w-xl">
                          {/* Subtitle / Badge */}
                          {currentSlide.subtitle && (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs">
                              <span
                                style={{
                                  color: currentSlide.subtitle_use_gradient ? undefined : currentSlide.subtitle_color,
                                  backgroundImage: currentSlide.subtitle_use_gradient
                                    ? `linear-gradient(${currentSlide.subtitle_gradient_dir || 'to right'}, ${
                                        currentSlide.subtitle_gradient_from || '#7c3aed'
                                      }, ${currentSlide.subtitle_gradient_to || '#ec4899'})`
                                    : undefined,
                                }}
                                className={
                                  currentSlide.subtitle_use_gradient ? 'bg-clip-text text-transparent' : undefined
                                }
                              >
                                {currentSlide.subtitle}
                              </span>
                            </div>
                          )}

                          {/* Title */}
                          <h2
                            className="text-2xl md:text-3xl font-extrabold tracking-tight"
                            style={{
                              color: currentSlide.title_use_gradient ? undefined : currentSlide.title_color,
                              backgroundImage: currentSlide.title_use_gradient
                                ? `linear-gradient(${currentSlide.title_gradient_dir || 'to right'}, ${
                                    currentSlide.title_gradient_from || '#7c3aed'
                                  }, ${currentSlide.title_gradient_to || '#4f46e5'})`
                                : undefined,
                            }}
                          >
                            <span className={currentSlide.title_use_gradient ? 'bg-clip-text text-transparent' : ''}>
                              {currentSlide.title}
                            </span>
                          </h2>

                          {/* Description */}
                          <p
                            className="text-xs md:text-sm leading-relaxed"
                            style={{
                              color: currentSlide.description_use_gradient ? undefined : currentSlide.description_color,
                              backgroundImage: currentSlide.description_use_gradient
                                ? `linear-gradient(${currentSlide.description_gradient_dir || 'to right'}, ${
                                    currentSlide.description_gradient_from || '#334155'
                                  }, ${currentSlide.description_gradient_to || '#64748b'})`
                                : undefined,
                            }}
                          >
                            <span
                              className={currentSlide.description_use_gradient ? 'bg-clip-text text-transparent' : ''}
                            >
                              {currentSlide.description}
                            </span>
                          </p>

                          {/* Action Buttons */}
                          {currentSlide.buttons.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 pt-2">
                              {currentSlide.buttons.map((btn) => (
                                <button
                                  key={btn.id}
                                  type="button"
                                  className={`px-4 py-2 text-xs font-semibold transition-all ${
                                    btn.style === 'pill'
                                      ? 'rounded-full'
                                      : btn.style === 'glass'
                                      ? 'rounded-xl backdrop-blur-md border border-white/30'
                                      : btn.style === 'outline'
                                      ? 'rounded-xl border'
                                      : btn.style === 'glow'
                                      ? 'rounded-xl shadow-lg shadow-violet-500/50'
                                      : 'rounded-xl shadow-sm'
                                  }`}
                                  style={{
                                    backgroundColor: btn.style === 'outline' ? 'transparent' : btn.bg_color,
                                    borderColor: btn.style === 'outline' ? btn.bg_color : undefined,
                                    color: btn.text_color,
                                  }}
                                >
                                  {btn.text}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Background Settings: Image, Overlay, Blur */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                      {/* Image Upload */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Slide Background Image
                        </label>
                        <div className="flex items-center gap-2">
                          <label className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer flex items-center gap-1.5">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload Image</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const previewUrl = URL.createObjectURL(file);
                                setStagedSlideBgs((prev) => ({
                                  ...prev,
                                  [currentSlide.id]: { file, previewUrl },
                                }));
                              }}
                            />
                          </label>
                          {(activeBgUrl) && (
                            <button
                              type="button"
                              onClick={() => {
                                if (stagedBg) URL.revokeObjectURL(stagedBg.previewUrl);
                                setStagedSlideBgs((prev) => {
                                  const next = { ...prev };
                                  delete next[currentSlide.id];
                                  return next;
                                });
                                updateCurrentSlide({ bg_image_url: null });
                              }}
                              className="text-xs text-rose-500 hover:underline cursor-pointer"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Overlay Opacity Slider */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Overlay Opacity
                          </label>
                          <span className="font-mono text-xs text-slate-500">
                            {Math.round(currentSlide.overlay_opacity * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={currentSlide.overlay_opacity}
                          onChange={(e) => updateCurrentSlide({ overlay_opacity: parseFloat(e.target.value) })}
                          className="w-full accent-violet-600"
                        />
                      </div>

                      {/* Background Blur Slider */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Background Blur
                          </label>
                          <span className="font-mono text-xs text-slate-500">{currentSlide.bg_blur}px</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="20"
                          step="2"
                          value={currentSlide.bg_blur}
                          onChange={(e) => updateCurrentSlide({ bg_blur: parseInt(e.target.value, 10) })}
                          className="w-full accent-violet-600"
                        />
                      </div>
                    </div>

                    {/* Title & Typography Customization (Solid vs Gradient) */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                          Title Typography & Colors
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500">Color Type:</span>
                          <button
                            type="button"
                            onClick={() => updateCurrentSlide({ title_use_gradient: !currentSlide.title_use_gradient })}
                            className={`px-2.5 py-0.5 rounded text-xs font-semibold cursor-pointer transition-all ${
                              currentSlide.title_use_gradient
                                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {currentSlide.title_use_gradient ? 'Linear Gradient' : 'Solid Color'}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                            Title Text
                          </label>
                          <input
                            type="text"
                            value={currentSlide.title}
                            onChange={(e) => updateCurrentSlide({ title: e.target.value })}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                          />
                        </div>

                        {currentSlide.title_use_gradient ? (
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                Gradient From
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={currentSlide.title_gradient_from || '#7c3aed'}
                                  onChange={(e) => updateCurrentSlide({ title_gradient_from: e.target.value })}
                                  className="w-8 h-8 rounded border-none cursor-pointer"
                                />
                                <input
                                  type="text"
                                  value={currentSlide.title_gradient_from || '#7c3aed'}
                                  onChange={(e) => updateCurrentSlide({ title_gradient_from: e.target.value })}
                                  className="w-full px-2 py-1 text-xs font-mono rounded border border-slate-300 dark:border-slate-700"
                                />
                              </div>
                            </div>
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                Gradient To
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={currentSlide.title_gradient_to || '#4f46e5'}
                                  onChange={(e) => updateCurrentSlide({ title_gradient_to: e.target.value })}
                                  className="w-8 h-8 rounded border-none cursor-pointer"
                                />
                                <input
                                  type="text"
                                  value={currentSlide.title_gradient_to || '#4f46e5'}
                                  onChange={(e) => updateCurrentSlide({ title_gradient_to: e.target.value })}
                                  className="w-full px-2 py-1 text-xs font-mono rounded border border-slate-300 dark:border-slate-700"
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                              Solid Title Color
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={currentSlide.title_color}
                                onChange={(e) => updateCurrentSlide({ title_color: e.target.value })}
                                className="w-8 h-8 rounded border-none cursor-pointer"
                              />
                              <input
                                type="text"
                                value={currentSlide.title_color}
                                onChange={(e) => updateCurrentSlide({ title_color: e.target.value })}
                                className="w-full px-2 py-1 text-xs font-mono rounded border border-slate-300 dark:border-slate-700"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Subtitle & Typography Customization */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                          Subtitle Badge Typography & Colors
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500">Color Type:</span>
                          <button
                            type="button"
                            onClick={() => updateCurrentSlide({ subtitle_use_gradient: !currentSlide.subtitle_use_gradient })}
                            className={`px-2.5 py-0.5 rounded text-xs font-semibold cursor-pointer transition-all ${
                              currentSlide.subtitle_use_gradient
                                ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {currentSlide.subtitle_use_gradient ? 'Linear Gradient' : 'Solid Color'}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                            Subtitle Text
                          </label>
                          <input
                            type="text"
                            value={currentSlide.subtitle}
                            onChange={(e) => updateCurrentSlide({ subtitle: e.target.value })}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          />
                        </div>

                        {currentSlide.subtitle_use_gradient ? (
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                Gradient From
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={currentSlide.subtitle_gradient_from || '#7c3aed'}
                                  onChange={(e) => updateCurrentSlide({ subtitle_gradient_from: e.target.value })}
                                  className="w-8 h-8 rounded border-none cursor-pointer"
                                />
                                <input
                                  type="text"
                                  value={currentSlide.subtitle_gradient_from || '#7c3aed'}
                                  onChange={(e) => updateCurrentSlide({ subtitle_gradient_from: e.target.value })}
                                  className="w-full px-2 py-1 text-xs font-mono rounded border border-slate-300 dark:border-slate-700"
                                />
                              </div>
                            </div>
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                Gradient To
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={currentSlide.subtitle_gradient_to || '#ec4899'}
                                  onChange={(e) => updateCurrentSlide({ subtitle_gradient_to: e.target.value })}
                                  className="w-8 h-8 rounded border-none cursor-pointer"
                                />
                                <input
                                  type="text"
                                  value={currentSlide.subtitle_gradient_to || '#ec4899'}
                                  onChange={(e) => updateCurrentSlide({ subtitle_gradient_to: e.target.value })}
                                  className="w-full px-2 py-1 text-xs font-mono rounded border border-slate-300 dark:border-slate-700"
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                              Solid Color
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={currentSlide.subtitle_color}
                                onChange={(e) => updateCurrentSlide({ subtitle_color: e.target.value })}
                                className="w-8 h-8 rounded border-none cursor-pointer"
                              />
                              <input
                                type="text"
                                value={currentSlide.subtitle_color}
                                onChange={(e) => updateCurrentSlide({ subtitle_color: e.target.value })}
                                className="w-full px-2 py-1 text-xs font-mono rounded border border-slate-300 dark:border-slate-700"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Description Customization */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                          Description Typography & Colors
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500">Color Type:</span>
                          <button
                            type="button"
                            onClick={() => updateCurrentSlide({ description_use_gradient: !currentSlide.description_use_gradient })}
                            className={`px-2.5 py-0.5 rounded text-xs font-semibold cursor-pointer transition-all ${
                              currentSlide.description_use_gradient
                                ? 'bg-gradient-to-r from-slate-600 to-slate-400 text-white'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {currentSlide.description_use_gradient ? 'Linear Gradient' : 'Solid Color'}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                            Description Text
                          </label>
                          <textarea
                            rows={2}
                            value={currentSlide.description}
                            onChange={(e) => updateCurrentSlide({ description: e.target.value })}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          />
                        </div>

                        {currentSlide.description_use_gradient ? (
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                Gradient From
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={currentSlide.description_gradient_from || '#334155'}
                                  onChange={(e) => updateCurrentSlide({ description_gradient_from: e.target.value })}
                                  className="w-8 h-8 rounded border-none cursor-pointer"
                                />
                                <input
                                  type="text"
                                  value={currentSlide.description_gradient_from || '#334155'}
                                  onChange={(e) => updateCurrentSlide({ description_gradient_from: e.target.value })}
                                  className="w-full px-2 py-1 text-xs font-mono rounded border border-slate-300 dark:border-slate-700"
                                />
                              </div>
                            </div>
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                Gradient To
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={currentSlide.description_gradient_to || '#64748b'}
                                  onChange={(e) => updateCurrentSlide({ description_gradient_to: e.target.value })}
                                  className="w-8 h-8 rounded border-none cursor-pointer"
                                />
                                <input
                                  type="text"
                                  value={currentSlide.description_gradient_to || '#64748b'}
                                  onChange={(e) => updateCurrentSlide({ description_gradient_to: e.target.value })}
                                  className="w-full px-2 py-1 text-xs font-mono rounded border border-slate-300 dark:border-slate-700"
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                              Solid Color
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={currentSlide.description_color}
                                onChange={(e) => updateCurrentSlide({ description_color: e.target.value })}
                                className="w-8 h-8 rounded border-none cursor-pointer"
                              />
                              <input
                                type="text"
                                value={currentSlide.description_color}
                                onChange={(e) => updateCurrentSlide({ description_color: e.target.value })}
                                className="w-full max-w-xs px-2 py-1 text-xs font-mono rounded border border-slate-300 dark:border-slate-700"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons Customizer */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                          Action Buttons & Styles
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            const newBtn: BannerButton = {
                              id: `btn_${Date.now()}`,
                              text: 'Explore',
                              url: '/admin',
                              bg_color: '#7c3aed',
                              text_color: '#ffffff',
                              style: 'solid',
                            };
                            updateCurrentSlide({ buttons: [...currentSlide.buttons, newBtn] });
                          }}
                          className="px-2.5 py-1 text-xs font-medium text-violet-600 bg-violet-50 dark:bg-violet-950/40 rounded-lg hover:bg-violet-100 cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Button</span>
                        </button>
                      </div>

                      <div className="space-y-4">
                        {currentSlide.buttons.map((btn, bIdx) => (
                          <div
                            key={btn.id}
                            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                Button #{bIdx + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  updateCurrentSlide({
                                    buttons: currentSlide.buttons.filter((_, i) => i !== bIdx),
                                  });
                                }}
                                className="text-xs text-rose-500 hover:text-rose-600 p-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                              <div>
                                <label className="block text-[11px] font-medium text-slate-500 mb-1">Button Text</label>
                                <input
                                  type="text"
                                  value={btn.text}
                                  onChange={(e) => {
                                    const updated = [...currentSlide.buttons];
                                    updated[bIdx] = { ...updated[bIdx], text: e.target.value };
                                    updateCurrentSlide({ buttons: updated });
                                  }}
                                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-medium text-slate-500 mb-1">Target Link</label>
                                <input
                                  type="text"
                                  value={btn.url}
                                  onChange={(e) => {
                                    const updated = [...currentSlide.buttons];
                                    updated[bIdx] = { ...updated[bIdx], url: e.target.value };
                                    updateCurrentSlide({ buttons: updated });
                                  }}
                                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-medium text-slate-500 mb-1">Button Style</label>
                                <select
                                  value={btn.style}
                                  onChange={(e) => {
                                    const updated = [...currentSlide.buttons];
                                    updated[bIdx] = { ...updated[bIdx], style: e.target.value as any };
                                    updateCurrentSlide({ buttons: updated });
                                  }}
                                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer"
                                >
                                  <option value="solid">Solid Fill</option>
                                  <option value="gradient">Gradient Fill</option>
                                  <option value="outline">Outline Border</option>
                                  <option value="glass">Glass Frosted</option>
                                  <option value="pill">Pill Shape</option>
                                  <option value="glow">Neon Glow</option>
                                </select>
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="flex-1">
                                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Bg Color</label>
                                  <input
                                    type="color"
                                    value={btn.bg_color}
                                    onChange={(e) => {
                                      const updated = [...currentSlide.buttons];
                                      updated[bIdx] = { ...updated[bIdx], bg_color: e.target.value };
                                      updateCurrentSlide({ buttons: updated });
                                    }}
                                    className="w-full h-8 rounded border cursor-pointer"
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Text Color</label>
                                  <input
                                    type="color"
                                    value={btn.text_color}
                                    onChange={(e) => {
                                      const updated = [...currentSlide.buttons];
                                      updated[bIdx] = { ...updated[bIdx], text_color: e.target.value };
                                      updateCurrentSlide({ buttons: updated });
                                    }}
                                    className="w-full h-8 rounded border cursor-pointer"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="p-4 border-t border-slate-200/60 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setEditingWidget(null)}
                className="px-4 py-2 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow cursor-pointer"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL / DRAWER: CUSTOM WIDGET EDITOR                                      */}
      {/* ========================================================================= */}
      {typeof editingWidget === 'object' && editingWidget?.type === 'custom' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            {(() => {
              const widgetId = editingWidget.id;
              const widget = config.custom_widgets.find((w) => w.id === widgetId);
              if (!widget) return null;

              const updateWidget = (fields: Partial<CustomWidget>) => {
                setConfig((prev) => ({
                  ...prev,
                  custom_widgets: prev.custom_widgets.map((w) => (w.id === widgetId ? { ...w, ...fields } : w)),
                }));
              };

              const IconComponent = AVAILABLE_ICONS[widget.icon] || Layers;

              return (
                <>
                  <div className="flex items-center justify-between p-5 border-b border-slate-200/60 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="p-2 rounded-xl text-white shadow-sm"
                        style={{ backgroundColor: widget.color || '#6366f1' }}
                      >
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Custom Widget</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Configure title, icon, accent color, and size for this overview card.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setEditingWidget(null)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-6 overflow-y-auto space-y-4">
                    {/* Live Preview of Custom Card */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Live Preview ({widget.height || '2/2-raw'})</span>
                        <span className="font-mono text-[11px]">
                          {(widget.height || '2/2-raw') === '2/2-raw' ? 'Full height standard baseline' : 'Compact half row'}
                        </span>
                      </div>
                      <div className={`rounded-2xl bg-white dark:bg-slate-800 shadow-sm flex flex-col justify-between transition-all ${
                        (widget.height || '2/2-raw') === '2/2-raw' ? 'p-6 min-h-[190px] space-y-4' : 'p-4 min-h-[120px] space-y-2'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div
                            className={`rounded-xl flex items-center justify-center text-white shadow-sm ${
                              (widget.height || '2/2-raw') === '2/2-raw' ? 'w-12 h-12' : 'w-9 h-9'
                            }`}
                            style={{ backgroundColor: widget.color || '#6366f1' }}
                          >
                            <IconComponent className={(widget.height || '2/2-raw') === '2/2-raw' ? 'w-6 h-6' : 'w-4 h-4'} />
                          </div>
                          {widget.badge && (
                            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              {widget.badge}
                            </span>
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">{widget.title}</h4>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-1 line-clamp-3">
                            {widget.description}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Widget Title
                        </label>
                        <input
                          type="text"
                          value={widget.title}
                          onChange={(e) => updateWidget({ title: e.target.value })}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Subtitle / Badge
                        </label>
                        <input
                          type="text"
                          value={widget.badge || ''}
                          onChange={(e) => updateWidget({ badge: e.target.value })}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Description
                      </label>
                      <textarea
                        rows={3}
                        value={widget.description}
                        onChange={(e) => updateWidget({ description: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>

                    {/* Icon Selection */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Select Icon
                      </label>
                      <div className="grid grid-cols-7 gap-2">
                        {Object.keys(AVAILABLE_ICONS).map((iconName) => {
                          const IconItem = AVAILABLE_ICONS[iconName];
                          const isSelected = widget.icon === iconName;
                          return (
                            <button
                              key={iconName}
                              type="button"
                              onClick={() => updateWidget({ icon: iconName })}
                              className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400 shadow-xs'
                                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              <IconItem className="w-4 h-4" />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Size Selector */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Widget Width (PC Slots)
                        </label>
                        <select
                          value={widget.size}
                          onChange={(e) => updateWidget({ size: e.target.value as WidgetSize })}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
                        >
                          <option value="1/4">1/4 (1 Column - Compact)</option>
                          <option value="2/4">2/4 (2 Columns - Half Width)</option>
                          <option value="3/4">3/4 (3 Columns - Wide)</option>
                          <option value="4/4">4/4 (4 Columns - Full Row)</option>
                        </select>
                      </div>

                      {/* Height Level Selector */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Height Level (Rows)
                        </label>
                        <select
                          value={widget.height || '2/2-raw'}
                          onChange={(e) => updateWidget({ height: e.target.value as HeightLevel })}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
                        >
                          <option value="2/2-raw">2/2-raw (Full Height)</option>
                          <option value="1/2-raw">1/2-raw (Half Height)</option>
                        </select>
                      </div>

                      {/* Accent Color */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Accent Color
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={widget.color || '#6366f1'}
                            onChange={(e) => updateWidget({ color: e.target.value })}
                            className="w-9 h-9 rounded-xl border-none cursor-pointer"
                          />
                          <input
                            type="text"
                            value={widget.color || '#6366f1'}
                            onChange={(e) => updateWidget({ color: e.target.value })}
                            className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border-t border-slate-200/60 dark:border-slate-800 flex justify-between">
                    <button
                      type="button"
                      onClick={() => handleDeleteCustomWidget(widgetId)}
                      className="px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Widget</span>
                    </button>
                    <button
                      onClick={() => setEditingWidget(null)}
                      className="px-4 py-2 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow cursor-pointer"
                    >
                      Apply Changes
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL / DRAWER: PAYABLES CALENDAR WIDGET                                  */}
      {/* ========================================================================= */}
      {editingWidget === 'payables' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-200/60 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Liabilities & Payables Calendar Widget
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Configure live calendar size slot, stream preview, and visibility on the Overview dashboard.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingWidget(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Enable Toggle Card */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Enable on Overview Page
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    When active, renders the monthly liabilities calendar module directly on the user overview dashboard.
                  </div>
                </div>
                <div
                  onClick={() =>
                    setConfig((prev) => ({
                      ...prev,
                      payables_widget: {
                        ...prev.payables_widget,
                        enabled: !prev.payables_widget.enabled,
                      },
                    }))
                  }
                  className="flex items-center gap-2.5 cursor-pointer select-none"
                >
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {config.payables_widget.enabled ? 'Module Enabled' : 'Module Disabled'}
                  </span>
                  <div
                    className={`w-10 h-6 rounded-full transition-colors flex items-center p-0.5 ${
                      config.payables_widget.enabled
                        ? 'bg-violet-600 justify-end'
                        : 'bg-slate-300 dark:bg-slate-700 justify-start'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-white shadow-xs" />
                  </div>
                </div>
              </div>

              {/* Widget Size Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2.5">
                  Select Widget Size (PC View Slots):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    {
                      id: '1/4' as WidgetSize,
                      label: 'Small (1/4)',
                      badge: '1 Column',
                      desc: 'Compact month calendar (1/4 width in PC view)',
                    },
                    {
                      id: '2/4' as WidgetSize,
                      label: 'Medium (2/4)',
                      badge: '2 Columns',
                      desc: 'Little bit wider calendar, same view (2/4 width in PC view)',
                    },
                    {
                      id: '3/4' as WidgetSize,
                      label: 'Detailed (3/4)',
                      badge: '3 Columns',
                      desc: 'Dual-pane split upcoming dues stream (3/4 width in PC view)',
                    },
                    {
                      id: '4/4' as WidgetSize,
                      label: 'Full Width (4/4)',
                      badge: 'Full Row',
                      desc: 'Full width (4/4) with dual-pane split upcoming dues stream',
                    },
                  ].map((sz) => {
                    const isSelected = config.payables_widget.size === sz.id;
                    return (
                      <button
                        type="button"
                        key={sz.id}
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            payables_widget: {
                              ...prev.payables_widget,
                              size: sz.id,
                            },
                          }))
                        }
                        className={`p-4 rounded-2xl text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-violet-50 dark:bg-violet-950/30 ring-2 ring-violet-500 shadow-sm border border-violet-500/20'
                            : 'bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200/60 dark:border-slate-800'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {sz.label}
                            </span>
                            {isSelected ? (
                              <Check className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                            ) : (
                              <span className="text-[10px] font-mono font-medium text-slate-400 bg-slate-200/50 dark:bg-slate-700/50 px-1.5 py-0.5 rounded">
                                {sz.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            {sz.desc}
                          </p>
                        </div>
                        <div className="pt-3 mt-1 flex items-center justify-between text-[10px]">
                          <span
                            className={`font-semibold ${
                              isSelected
                                ? 'text-violet-600 dark:text-violet-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {isSelected ? 'Active Selection' : 'Click to select'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Widget Height Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2.5">
                  Select Widget Height (Row Levels):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      id: '2/2-raw' as HeightLevel,
                      label: 'Full Row Height (2/2-raw)',
                      badge: 'Baseline (~394px)',
                      desc: 'Standard full height matching the Profile Widget height baseline across the row',
                    },
                    {
                      id: '1/2-raw' as HeightLevel,
                      label: 'Half Row Height (1/2-raw)',
                      badge: 'Compact (~190px)',
                      desc: 'Compact half-row height for tight dashboard row layouts',
                    },
                  ].map((hl) => {
                    const isSelected = (config.payables_widget.height || '2/2-raw') === hl.id;
                    return (
                      <button
                        type="button"
                        key={hl.id}
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            payables_widget: {
                              ...prev.payables_widget,
                              height: hl.id,
                            },
                          }))
                        }
                        className={`p-4 rounded-2xl text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-violet-50 dark:bg-violet-950/30 ring-2 ring-violet-500 shadow-sm border border-violet-500/20'
                            : 'bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200/60 dark:border-slate-800'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {hl.label}
                            </span>
                            {isSelected ? (
                              <Check className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                            ) : (
                              <span className="text-[10px] font-mono font-medium text-slate-400 bg-slate-200/50 dark:bg-slate-700/50 px-1.5 py-0.5 rounded">
                                {hl.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            {hl.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Month Widget Preview */}
              <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-violet-500" />
                    Live Month Widget Preview ({config.payables_widget.size} • {config.payables_widget.height || '2/2-raw'})
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {config.payables_widget.size === '1/4'
                      ? '1/4 width in PC view (Compact month calendar)'
                      : config.payables_widget.size === '2/4'
                      ? '2/4 width in PC view (Medium calendar view)'
                      : config.payables_widget.size === '3/4'
                      ? '3/4 width with dual-pane split upcoming dues stream'
                      : 'Full width (4/4) with dual-pane split upcoming dues stream'}
                  </span>
                </div>

                <div className="pt-2 flex justify-start">
                  <div
                    className={
                      config.payables_widget.size === '1/4'
                        ? 'w-full lg:w-1/4 min-w-[280px]'
                        : config.payables_widget.size === '2/4'
                        ? 'w-full lg:w-1/2 min-w-[340px]'
                        : config.payables_widget.size === '3/4'
                        ? 'w-full lg:w-3/4'
                        : 'w-full'
                    }
                  >
                    <PayablesCalendarWidget
                      size={config.payables_widget.size}
                      height={config.payables_widget.height || '2/2-raw'}
                      preview={true}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Changes apply immediately. Click Save Changes at top right to persist.
              </span>
              <button
                onClick={() => setEditingWidget(null)}
                className="px-5 py-2 text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow cursor-pointer transition-all"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
