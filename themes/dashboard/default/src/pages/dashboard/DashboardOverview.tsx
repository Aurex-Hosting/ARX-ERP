import React, { useEffect, useState, useMemo } from 'react';
import { PayablesCalendarWidget, WidgetSize as CalendarWidgetSize } from '../../components/widgets/PayablesCalendarWidget';
import { ProfileWidget } from '../../components/widgets/ProfileWidget';
import { AnnouncementBannerWidget, BannerSlide } from '../../components/widgets/AnnouncementBannerWidget';
import { CustomOverviewWidget } from '../../components/widgets/CustomOverviewWidget';
import api from '../../services/api';

export type SlotSize = '1/4' | '2/4' | '3/4' | '4/4' | '1/3' | '2/3' | '3/3';
export type HeightLevel = '1/2-raw' | '2/2-raw' | '1/2' | '2/2';

export interface DashboardWidgetsConfig {
  layout: string[];
  profile_widget: {
    id: string;
    enabled: boolean;
    size: '1/4';
    height?: HeightLevel;
    title: string;
    show_joined_date: boolean;
    show_user_id: boolean;
    show_email_spoiler: boolean;
    custom_bg_url: string | null;
  };
  banner_widget: {
    id: string;
    enabled: boolean;
    size: SlotSize;
    height?: HeightLevel;
    slideshow_enabled: boolean;
    autoplay: boolean;
    autoplay_interval: number;
    slides: BannerSlide[];
  };
  custom_widgets: Array<{
    id: string;
    enabled: boolean;
    size: SlotSize;
    height?: HeightLevel;
    title: string;
    description: string;
    icon: string;
    badge?: string;
    color?: string;
    link_url?: string;
    link_text?: string;
  }>;
  payables_widget: {
    id: string;
    enabled: boolean;
    size: SlotSize;
    height?: HeightLevel;
  };
  modules_active?: Record<string, boolean>;
}

const CACHE_KEY = 'arx_dashboard_widgets_config';

const DEFAULT_CONFIG: DashboardWidgetsConfig = {
  layout: [
    'widget_profile',
    'widget_banner',
    'custom_api_modular',
    'custom_rbac_security',
    'custom_themeable_arch',
    'widget_payables_calendar',
  ],
  modules_active: {
    'payables-debt': true,
  },
  profile_widget: {
    id: 'widget_profile',
    enabled: true,
    size: '1/4',
    height: '2/2-raw',
    title: 'Profile',
    show_joined_date: true,
    show_user_id: true,
    show_email_spoiler: true,
    custom_bg_url: null,
  },
  banner_widget: {
    id: 'widget_banner',
    enabled: true,
    size: '3/4',
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
      height: '1/2-raw',
      title: 'API-First Modular Engine',
      description: 'All features run as isolated modules. Core code remains immutable and safe during platform updates.',
      icon: 'Layers',
      badge: 'Architecture',
      color: '#7c3aed',
    },
    {
      id: 'custom_rbac_security',
      enabled: true,
      size: '1/4',
      height: '1/2-raw',
      title: 'Granular RBAC Security',
      description: 'Every module registers its own scoped permissions. Users only see and access authorized resources.',
      icon: 'ShieldCheck',
      badge: 'Security',
      color: '#3b82f6',
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
    },
  ],
  payables_widget: {
    id: 'widget_payables_calendar',
    enabled: true,
    size: '2/4',
    height: '2/2-raw',
  },
};

const getInitialConfig = (): DashboardWidgetsConfig => {
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.layout && Array.isArray(parsed.layout)) {
          // If payables module is explicitly marked false (inactive), remove widget from initial view
          if (parsed.modules_active?.['payables-debt'] === false) {
            parsed.layout = parsed.layout.filter((id: string) => id !== 'widget_payables_calendar');
            if (parsed.payables_widget) {
              parsed.payables_widget.enabled = false;
            }
          }
          return parsed;
        }
      }
    } catch {
      // fallback
    }
  }
  return DEFAULT_CONFIG;
};

export const DashboardOverview: React.FC = () => {
  const [config, setConfig] = useState<DashboardWidgetsConfig>(getInitialConfig);

  useEffect(() => {
    const fetchWidgetsConfig = async () => {
      try {
        const res = await api.get('/theme/dashboard-widgets');
        if (res.data?.config) {
          const incoming = res.data.config;
          const incomingStr = JSON.stringify(incoming);
          setConfig((prev) => {
            if (JSON.stringify(prev) !== incomingStr) {
              return incoming;
            }
            return prev;
          });
          try {
            localStorage.setItem(CACHE_KEY, incomingStr);
          } catch {
            // ignore
          }
        }
      } catch (err) {
        console.warn('Failed to load customized dashboard widgets layout, using defaults.', err);
      }
    };

    fetchWidgetsConfig();
  }, []);

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
      let size: SlotSize = '1/4';
      let height: HeightLevel = '2/2-raw';
      let enabled = true;

      if (widgetId === 'widget_banner') {
        size = config.banner_widget.size;
        height = config.banner_widget.height || '2/2-raw';
        enabled = config.banner_widget.enabled;
      } else if (widgetId === 'widget_profile') {
        size = '1/4';
        height = config.profile_widget.height || '2/2-raw';
        enabled = config.profile_widget.enabled;
      } else if (widgetId === 'widget_payables_calendar') {
        size = config.payables_widget.size;
        height = config.payables_widget.height || '2/2-raw';
        enabled = config.payables_widget.enabled && config.modules_active?.['payables-debt'] !== false;
      } else {
        const cw = config.custom_widgets.find((w) => w.id === widgetId);
        if (cw) {
          size = cw.size;
          height = cw.height || '2/2-raw';
          enabled = cw.enabled;
        } else {
          continue;
        }
      }

      if (!enabled) continue;

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

  const getColSpanClass = (size: SlotSize) => {
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

  const mapToCalendarSize = (size: SlotSize): CalendarWidgetSize => {
    switch (size) {
      case '1/4':
      case '1/3':
        return 'small';
      case '2/4':
      case '2/3':
        return 'medium';
      case '3/4':
      case '4/4':
      case '3/3':
      default:
        return 'large';
    }
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      {/* 4-Column PC View Android Home Style Widget Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:[grid-auto-rows:200px]">
        {config.layout.map((widgetId) => {
          const pos = isLg ? gridPositions.get(widgetId) : null;

          // 1. Announcement Banner & Slideshow
          if (widgetId === 'widget_banner') {
            if (!config.banner_widget.enabled) return null;
            return (
              <div
                key={widgetId}
                style={pos ? {
                  gridColumn: `${pos.col + 1} / span ${pos.colSpan}`,
                  gridRow: `${pos.row + 1} / span ${pos.rowSpan}`,
                } : undefined}
                className={pos ? 'h-full' : getColSpanClass(config.banner_widget.size)}
              >
                <AnnouncementBannerWidget
                  slideshowEnabled={config.banner_widget.slideshow_enabled}
                  autoplay={config.banner_widget.autoplay}
                  autoplayInterval={config.banner_widget.autoplay_interval}
                  slides={config.banner_widget.slides}
                  height={config.banner_widget.height || '2/2-raw'}
                  onButtonClick={(url) => {
                    window.location.href = url;
                  }}
                />
              </div>
            );
          }

          // 2. Profile Widget (Strictly 1/4 in PC view)
          if (widgetId === 'widget_profile') {
            if (!config.profile_widget.enabled) return null;
            return (
              <div
                key={widgetId}
                style={pos ? {
                  gridColumn: `${pos.col + 1} / span ${pos.colSpan}`,
                  gridRow: `${pos.row + 1} / span ${pos.rowSpan}`,
                } : undefined}
                className={pos ? 'h-full' : 'col-span-1'}
              >
                <ProfileWidget
                  title={config.profile_widget.title}
                  showJoinedDate={config.profile_widget.show_joined_date}
                  showUserId={config.profile_widget.show_user_id}
                  showEmailSpoiler={config.profile_widget.show_email_spoiler}
                  customBgUrl={config.profile_widget.custom_bg_url}
                  height={config.profile_widget.height || '2/2-raw'}
                  onNavigateToProfile={() => {
                    window.location.href = '/profile';
                  }}
                />
              </div>
            );
          }

          // 3. Liabilities & Debt Calendar Widget
          if (widgetId === 'widget_payables_calendar') {
            if (!config.payables_widget.enabled || config.modules_active?.['payables-debt'] === false) return null;
            return (
              <div
                key={widgetId}
                style={pos ? {
                  gridColumn: `${pos.col + 1} / span ${pos.colSpan}`,
                  gridRow: `${pos.row + 1} / span ${pos.rowSpan}`,
                } : undefined}
                className={pos ? 'h-full' : getColSpanClass(config.payables_widget.size)}
              >
                <PayablesCalendarWidget
                  size={mapToCalendarSize(config.payables_widget.size)}
                  height={config.payables_widget.height || '2/2-raw'}
                  onNavigateToPayables={() => {
                    window.location.href = '/payables-debt';
                  }}
                />
              </div>
            );
          }

          // 4. Custom Widgets
          const customItem = config.custom_widgets.find((w) => w.id === widgetId);
          if (customItem && customItem.enabled) {
            return (
              <div
                key={widgetId}
                style={pos ? {
                  gridColumn: `${pos.col + 1} / span ${pos.colSpan}`,
                  gridRow: `${pos.row + 1} / span ${pos.rowSpan}`,
                } : undefined}
                className={pos ? 'h-full' : getColSpanClass(customItem.size)}
              >
                <CustomOverviewWidget
                  title={customItem.title}
                  description={customItem.description}
                  icon={customItem.icon}
                  badge={customItem.badge}
                  color={customItem.color}
                  linkUrl={customItem.link_url}
                  linkText={customItem.link_text}
                  height={customItem.height || '2/2-raw'}
                />
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
};
