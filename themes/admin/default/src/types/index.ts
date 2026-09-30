export interface User {
  id: number;
  identifier?: string;
  name: string;
  email: string;
  user_type: string;
  is_super_admin: boolean;
  avatar_url?: string | null;
  banner_url?: string | null;
  roles: string[];
  permissions: string[];
}

export interface UserListItem {
  id: number;
  identifier: string;
  name: string;
  email: string;
  user_type: 'user' | 'ai_agent' | string;
  is_active: boolean;
  email_verified_at?: string | null;
  avatar_url: string | null;
  two_factor_enabled?: boolean;
  is_locked?: boolean;
  locked_until?: string | null;
  locked_reason?: string | null;
  roles: { id: number; name: string }[];
  permissions?: { id: number; name: string }[];
  created_at: string;
  updated_at?: string;
}

export interface TrashedUserItem {
  id: number;
  identifier: string;
  name: string;
  email: string;
  user_type: 'user' | 'ai_agent' | string;
  is_active: boolean;
  roles: { id: number; name: string }[];
  deleted_at: string;
  expires_at: string;
  days_remaining: number;
}

export interface RoleItem {
  id: number;
  name: string;
  display_name?: string;
  description?: string;
  color?: string;
  is_system: boolean;
  users_count: number;
  permissions: string[];
  created_at?: string;
}

export interface PermissionGroup {
  key: string;
  label: string;
  permissions: {
    id: number;
    name: string;
    action_label?: string;
    route_slug?: string;
  }[];
}

export interface ModuleItem {
  slug: string;
  name: string;
  area: string;
  version: string;
  description: string;
  author: any;
  dependencies: string[];
  permissions: string[];
  is_installed: boolean;
  is_enabled: boolean;
  installed_at: string | null;
  manifest: any;
}

export interface ThemeItem {
  slug: string;
  name: string;
  area: string;
  version: string;
  engine: string;
  author: any;
  config: any;
}

export interface AuditLogItem {
  id: number;
  request_id?: string | null;
  user_id: number | null;
  user_type: string;
  user_identifier?: string | null;
  action: string;
  model_type: string | null;
  model_id: number | null;
  model_identifier?: string | null;
  description?: string | null;
  old_values: any;
  new_values: any;
  ip_address: string | null;
  user_agent: string | null;
  metadata: any;
  created_at: string;
  user?: {
    id: number;
    identifier?: string;
    name: string;
    email: string;
    user_type: string;
  };
}

export interface ApprovalItem {
  id: number;
  agent_id: number;
  tool_name: string;
  parameters: any;
  status: string;
  reviewed_by: number | null;
  reviewed_at: string | null;
  review_notes: string | null;
  execution_result: any;
  created_at: string;
  agent?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface ApiKeyItem {
  id: number;
  name: string;
  key_id: string;
  secret_preview: string;
  permissions: string[];
  allowed_endpoints: string[];
  rate_limit: number;
  ip_restriction_type: 'none' | 'whitelist' | 'blacklist';
  ip_addresses: string[];
  expires_at: string | null;
  expires_at_formatted: string;
  is_expired: boolean;
  last_used_at: string | null;
  last_used_at_formatted: string;
  last_used_ip: string | null;
  total_requests: number;
  is_active: boolean;
  status: 'active' | 'inactive' | 'expired';
  user?: {
    id: number;
    name: string;
    email: string;
  };
  created_at: string;
  created_at_formatted?: string;
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

export interface BroadcastNotificationItem {
  id: number;
  title: string;
  body: string;
  type: 'info' | 'success' | 'warning' | 'danger' | 'announcement' | 'security' | 'system' | string;
  action_buttons?: NotificationActionButton[] | null;
  enable_reactions: boolean;
  target_type: 'all' | 'users' | 'roles' | 'all_except_users' | 'all_except_roles';
  target_user_ids?: number[] | null;
  target_role_ids?: (number | string)[] | null;
  excluded_user_ids?: number[] | null;
  excluded_role_ids?: (number | string)[] | null;
  send_email?: boolean;
  email_subject?: string | null;
  email_body_html?: string | null;
  email_action_label?: string | null;
  email_action_url?: string | null;
  scheduled_at?: string | null;
  repeat_interval?: 'none' | 'daily' | 'weekly' | 'monthly' | null;
  status: 'draft' | 'scheduled' | 'sent' | 'cancelled';
  recipients_count: number;
  read_count?: number;
  read_rate?: number;
  total_reactions?: number;
  reactions_summary?: Record<string, ReactionSummaryItem>;
  sent_at?: string | null;
  created_at: string;
  creator?: {
    id: number;
    name: string;
    email: string;
    avatar_url?: string | null;
  } | null;
}

