export interface User {
  id: number;
  identifier?: string;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  email: string;
  user_type: string;
  is_super_admin: boolean;
  avatar_url?: string | null;
  banner_url?: string | null;
  created_at?: string;
  active_sessions_count?: number;
  roles: string[];
  permissions: string[];
}

export interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  position?: number;
  module: string;
  children?: NavigationItem[];
}

export interface ThemeConfig {
  primary_color: string;
  primary_dark: string;
  accent_color: string;
  default_mode: 'dark' | 'light';
  sidebar_style: 'expanded' | 'compact';
}

export interface NotificationActionButton {
  label: string;
  url: string;
  style?: 'primary' | 'secondary' | 'danger' | 'outline' | 'link' | string;
  external?: boolean;
  action_tab?: string;
  action_subtab?: string;
}

export interface ReactionSummaryItem {
  key: string;
  emoji: string;
  count: number;
  user_reacted?: boolean;
}

export interface NotificationItem {
  id: number;
  broadcast_notification_id?: number | null;
  title: string;
  body: string;
  type: 'info' | 'success' | 'warning' | 'danger' | 'announcement' | 'security' | 'system' | string;
  category: 'login_alert' | 'security_alert' | 'announcement' | 'system' | 'manual' | string;
  action_buttons?: NotificationActionButton[] | null;
  enable_reactions: boolean;
  metadata?: any;
  is_read: boolean;
  read_at: string | null;
  user_reaction?: string | null;
  reactions_summary?: Record<string, ReactionSummaryItem>;
  created_at: string;
}

export interface LoginHistoryItem {
  id: number;
  user_id: number | null;
  email: string;
  status: 'success' | 'failed' | 'locked' | string;
  failure_reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  device_type: 'desktop' | 'mobile' | 'tablet' | 'bot' | string;
  device_fingerprint: string | null;
  browser: string | null;
  browser_version: string | null;
  platform: string | null;
  location: string | null;
  city?: string | null;
  country?: string | null;
  is_active?: boolean;
  is_active_session?: boolean;
  is_revoked: boolean;
  revoked_at: string | null;
  revoked_by: string | null;
  last_active_at: string | null;
  login_at: string;
  user?: {
    id: number;
    identifier?: string;
    name: string;
    email: string;
    user_type: string;
    avatar_url?: string | null;
  } | null;
}

export interface LoginHistoryStats {
  total_count: number;
  active_count: number;
  failed_count: number;
  revoked_count: number;
  older_than_14_days_count: number;
}
