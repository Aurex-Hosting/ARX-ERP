import React, { useEffect, useMemo, useState } from 'react';
import {
  CreditCard,
  FileText,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  DollarSign,
  Calendar,
  Building2,
  Plus,
  X,
  Layers,
  ShieldCheck,
  Check,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
  ExternalLink,
  FileClock,
  Settings,
  Mail,
  Bell,
  Users,
  LayoutTemplate,
  Trash2,
  RotateCcw,
  Upload,
  Receipt,
  FolderArchive,
} from 'lucide-react';
import api from '../../services/api';
import type {
  WidgetSize,
  WidgetDesign,
} from '../../components/widgets/PayablesCalendarWidget';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'LKR', 'INR'] as const;
type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

interface NotificationConfigData {
  id?: number;
  audience_type:
    | 'all_users'
    | 'specific_roles'
    | 'all_except_roles'
    | 'all_except_users'
    | 'selected_users_and_roles'
    | 'selected_roles_except_users';
  selected_user_ids: number[];
  selected_role_ids: number[];
  excluded_user_ids: number[];
  excluded_role_ids: number[];
  notify_due_soon_days: number;
  notify_overdue: boolean;
  enable_in_app: boolean;
  enable_email: boolean;
  widget_calendar_enabled?: boolean;
  widget_calendar_size?: WidgetSize;
  widget_calendar_design?: WidgetDesign;
}

interface RoleItem {
  id: number;
  name: string;
}

interface UserItem {
  id: number;
  name: string;
  email: string;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

interface CalendarEvent {
  id: number;
  payable_id: number;
  installment_number: number;
  due_date: string;
  base_amount: number;
  interest_amount: number;
  penalty_amount: number;
  total_due: number;
  status: 'scheduled' | 'due_soon' | 'overdue' | 'paid' | 'cancelled';
  timing: 'upcoming' | 'passed' | 'today';
  is_passed: boolean;
  is_today: boolean;
  days_diff: number;
  paid_at: string | null;
  proof_document_id?: number | null;
  proof_document?: {
    id: number;
    file_name: string;
    document_type: string;
    file_size?: number;
  } | null;
  payable: {
    id: number;
    title: string;
    type: 'invoice' | 'subscription' | 'loan';
    loan_type?: 'single_time' | 'long_time' | null;
    vendor_name: string;
    category?: string;
    currency: string;
    status: string;
    reference_no?: string | null;
    payment_url?: string | null;
    payment_urls?: Array<{ label?: string; url: string }> | null;
  };
}

interface SummaryTotals {
  total_count: number;
  pending_count: number;
  due_soon_count: number;
  overdue_count: number;
  paid_count: number;
  cancelled_count: number;
  total_liability: string | number;
  total_paid: string | number;
}

interface PayableItem {
  id: number;
  type: 'invoice' | 'subscription' | 'loan';
  loan_type?: 'single_time' | 'long_time' | null;
  title: string;
  vendor_name: string;
  category: string;
  currency: string;
  total_amount: string | number;
  amount_paid: string | number;
  outstanding_balance?: number;
  status: 'pending' | 'due_soon' | 'overdue' | 'paid' | 'cancelled';
  payment_url?: string | null;
  payment_urls?: Array<{ label?: string; url: string }> | null;
  start_date: string | null;
  target_due_date?: string | null;
  end_date: string | null;
  is_recurring?: boolean;
  frequency?: string | null;
  interval_count?: number;
  interval_unit?: 'days' | 'months' | 'years';
  plan_tier?: string | null;
  principal_amount?: string | number | null;
  interest_rate?: string | number | null;
  calculation_method?: string | null;
  tenure_months?: number | null;
  created_at: string;
}

interface ByType {
  type: string;
  count: number;
  total_amount: string | number;
}

interface HistoricalDocument {
  id: number;
  payable_id: number;
  installment_id?: number | null;
  original_filename: string;
  stored_filename: string;
  file_size: number;
  file_size_human?: string;
  mime_type: string;
  document_type: 'receipt' | 'bank_slip' | 'transfer_confirmation' | 'other';
  uploaded_by?: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

interface HistoricalInstallment {
  id: number;
  payable_id: number;
  installment_number: number;
  due_date: string;
  base_amount: string | number;
  interest_amount: string | number;
  penalty_amount: string | number;
  total_due: string | number;
  status: 'scheduled' | 'due_soon' | 'overdue' | 'paid' | 'cancelled';
  paid_at: string | null;
  proof_document_id?: number | null;
  proof_document?: HistoricalDocument | null;
}

interface RecycleBinItem {
  id: number;
  item_type: 'payable' | 'document' | 'installment';
  type?: string;
  title?: string;
  original_filename?: string;
  stored_filename?: string;
  installment_number?: number;
  vendor_name?: string;
  category?: string;
  currency?: string;
  total_amount?: string | number;
  amount_paid?: string | number;
  total_due?: string | number;
  status?: string;
  document_type?: string;
  file_size?: number;
  deleted_at: string;
  days_remaining: number;
  payable?: {
    id: number;
    title: string;
    vendor_name?: string;
    type?: string;
  } | null;
}

interface CustomCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  sublabel?: string;
  id?: string;
}

const CustomCheckbox: React.FC<CustomCheckboxProps> = ({ checked, onChange, label, sublabel, id }) => (
  <div
    role="checkbox"
    aria-checked={checked}
    tabIndex={0}
    onClick={() => onChange(!checked)}
    onKeyDown={(e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onChange(!checked);
      }
    }}
    id={id}
    className="flex items-start gap-3 cursor-pointer select-none group py-1"
  >
    <div
      className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 ${
        checked
          ? 'bg-violet-600 border-violet-600 text-white shadow-xs ring-2 ring-violet-500/20'
          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 group-hover:border-violet-500 group-hover:bg-violet-500/5'
      }`}
    >
      {checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
    </div>
    <div className="flex-1 min-w-0">
      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
        {label}
      </span>
      {sublabel && <p className="text-[11px] text-slate-400 mt-0.5">{sublabel}</p>}
    </div>
  </div>
);

export const PayablesDebtPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [summaryTotals, setSummaryTotals] = useState<SummaryTotals | null>(null);
  const [byType, setByType] = useState<ByType[]>([]);
  const [recentItems, setRecentItems] = useState<PayableItem[]>([]);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'calendar' | 'invoices' | 'subscriptions' | 'loans' | 'settings' | 'create' | 'recycle-bin'
  >('overview');
  const [previousTab, setPreviousTab] = useState<
    'overview' | 'calendar' | 'invoices' | 'subscriptions' | 'loans' | 'settings' | 'recycle-bin'
  >('overview');
  const [filteredItems, setFilteredItems] = useState<PayableItem[]>([]);
  const [filterLoading, setFilterLoading] = useState(false);

  // New Payable State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const openCreatePage = (startDate?: string) => {
    if (activeTab !== 'create') {
      setPreviousTab(activeTab);
    }
    if (startDate) {
      setFormStartDate(startDate);
    }
    setActiveTab('create');
  };

  // Form State
  const [formType, setFormType] = useState<'invoice' | 'subscription' | 'loan'>('invoice');
  const [formTitle, setFormTitle] = useState('');
  const [formVendor, setFormVendor] = useState('');
  const [formCategory, setFormCategory] = useState('General');
  const [formReference, setFormReference] = useState('');
  const [formCurrency, setFormCurrency] = useState<SupportedCurrency>('USD');
  const [formTotalAmount, setFormTotalAmount] = useState('');
  const [formPaymentUrl, setFormPaymentUrl] = useState('');
  const [formPaymentUrls, setFormPaymentUrls] = useState<Array<{ label: string; url: string }>>([]);

  // Flexible Interval & Recurring Settings
  const [formIsRecurring, setFormIsRecurring] = useState(false);
  const [formIntervalCount, setFormIntervalCount] = useState<number>(1);
  const [formIntervalUnit, setFormIntervalUnit] = useState<'days' | 'months' | 'years'>('months');
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [formEndDate, setFormEndDate] = useState('');
  const [formRepeatIndefinitely, setFormRepeatIndefinitely] = useState(false);
  const [formPregenerationDays, setFormPregenerationDays] = useState(7);

  // Subscription Specific
  const [formPlanTier, setFormPlanTier] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState('');
  const [formNoticePeriod, setFormNoticePeriod] = useState(14);

  // Loan Specific
  const [formLoanType, setFormLoanType] = useState<'single_time' | 'long_time'>('single_time');
  const [formPrincipal, setFormPrincipal] = useState('');
  const [formInterestRate, setFormInterestRate] = useState('');
  const [formTargetDueDate, setFormTargetDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [formInterestFrequency, setFormInterestFrequency] = useState<'daily' | 'monthly' | 'yearly'>('yearly');
  const [formCalcMethod, setFormCalcMethod] = useState<'flat' | 'simple' | 'compounding'>('flat');
  const [formTenureMonths, setFormTenureMonths] = useState(12);
  const [formGracePeriod, setFormGracePeriod] = useState(0);
  const [formPenaltyType, setFormPenaltyType] = useState<'fixed_fee' | 'daily_percentage'>('fixed_fee');
  const [formPenaltyRate, setFormPenaltyRate] = useState('0');
  const [formPaymentDay, setFormPaymentDay] = useState(1);

  // Live Exchange Rates State
  const [rates, setRates] = useState<Record<string, number>>({});
  const [ratesLoading, setRatesLoading] = useState(false);
  const [showConverter, setShowConverter] = useState(false);
  const [calcAmount, setCalcAmount] = useState('100');
  const [calcFromCurrency, setCalcFromCurrency] = useState<SupportedCurrency>('USD');
  const [calcToCurrency, setCalcToCurrency] = useState<SupportedCurrency>('LKR');

  // Mark as Paid Modal State
  const [payTargetItem, setPayTargetItem] = useState<PayableItem | null>(null);
  const [payTargetInstallment, setPayTargetInstallment] = useState<CalendarEvent | null>(null);
  const [payProofFile, setPayProofFile] = useState<File | null>(null);
  const [payDocType, setPayDocType] = useState<'receipt' | 'bank_slip' | 'transfer_confirmation' | 'other'>('receipt');
  const [isPaying, setIsPaying] = useState(false);

  // Cancel Confirmation Modal State
  const [cancelTargetItem, setCancelTargetItem] = useState<PayableItem | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Recycle Bin State
  const [recycleBinData, setRecycleBinData] = useState<{
    payables: RecycleBinItem[];
    documents: RecycleBinItem[];
    installments: RecycleBinItem[];
  }>({ payables: [], documents: [], installments: [] });
  const [recycleBinLoading, setRecycleBinLoading] = useState(false);
  const [recycleBinCount, setRecycleBinCount] = useState(0);
  const [recycleBinFilter, setRecycleBinFilter] = useState<'all' | 'payables' | 'documents' | 'installments'>('all');
  const [restoreTarget, setRestoreTarget] = useState<RecycleBinItem | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [forceDeleteTarget, setForceDeleteTarget] = useState<RecycleBinItem | null>(null);
  const [isForceDeleting, setIsForceDeleting] = useState(false);
  const [showEmptyBinModal, setShowEmptyBinModal] = useState(false);
  const [isEmptyingBin, setIsEmptyingBin] = useState(false);

  // Delete Payable to Recycle Bin Dialog State
  const [deletePayableTarget, setDeletePayableTarget] = useState<PayableItem | null>(null);
  const [isDeletingPayable, setIsDeletingPayable] = useState(false);

  // History & Receipts Vault Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyTargetItem, setHistoryTargetItem] = useState<PayableItem | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyInstallments, setHistoryInstallments] = useState<HistoricalInstallment[]>([]);
  const [historyDocuments, setHistoryDocuments] = useState<HistoricalDocument[]>([]);
  const [historyActiveTab, setHistoryActiveTab] = useState<'documents' | 'installments' | 'upload'>('documents');
  const [streamingDocId, setStreamingDocId] = useState<number | null>(null);

  // Replace / Change Upload State
  const [replaceTargetDoc, setReplaceTargetDoc] = useState<HistoricalDocument | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replaceDocType, setReplaceDocType] = useState<'receipt' | 'bank_slip' | 'transfer_confirmation' | 'other'>('receipt');
  const [isReplacingDoc, setIsReplacingDoc] = useState(false);

  // Upload New Receipt in History Modal State
  const [newUploadFile, setNewUploadFile] = useState<File | null>(null);
  const [newUploadDocType, setNewUploadDocType] = useState<'receipt' | 'bank_slip' | 'transfer_confirmation' | 'other'>('receipt');
  const [isUploadingNewDoc, setIsUploadingNewDoc] = useState(false);

  // Delete Installment to Bin State
  const [deleteInstallmentTarget, setDeleteInstallmentTarget] = useState<HistoricalInstallment | null>(null);
  const [isDeletingInstallment, setIsDeletingInstallment] = useState(false);

  // Calendar State
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [calendarFilterTiming, setCalendarFilterTiming] = useState<'all' | 'upcoming' | 'passed' | 'paid'>('all');
  const [calendarFilterType, setCalendarFilterType] = useState<'all' | 'invoice' | 'subscription' | 'loan'>('all');
  const [selectedDayEvents, setSelectedDayEvents] = useState<CalendarEvent[]>([]);
  const [selectedDayDateString, setSelectedDayDateString] = useState<string | null>(null);
  const [showDayModal, setShowDayModal] = useState(false);

  // Settings & Notification Config State
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [notifConfig, setNotifConfig] = useState<NotificationConfigData>({
    audience_type: 'all_users',
    selected_user_ids: [],
    selected_role_ids: [],
    excluded_user_ids: [],
    excluded_role_ids: [],
    notify_due_soon_days: 7,
    notify_overdue: true,
    enable_in_app: true,
    enable_email: false,
    widget_calendar_enabled: true,
    widget_calendar_size: 'medium',
    widget_calendar_design: 'modern_glass',
  });
  const [availableRoles, setAvailableRoles] = useState<RoleItem[]>([]);
  const [availableUsers, setAvailableUsers] = useState<UserItem[]>([]);
  const [recipientPreview, setRecipientPreview] = useState<{ count: number; recipients: UserItem[] } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [showRecipientsList, setShowRecipientsList] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [mailHookEnabled, setMailHookEnabled] = useState(false);

  useEffect(() => {
    fetchSummary();
    fetchRecent();
    fetchRates();
    fetchCalendarEvents(calendarDate);
    fetchRecycleBinCount();
  }, []);

  useEffect(() => {
    if (activeTab === 'calendar') {
      fetchCalendarEvents(calendarDate);
    } else if (activeTab === 'settings') {
      fetchNotificationConfig();
    } else if (activeTab === 'recycle-bin') {
      fetchRecycleBin();
    } else if (activeTab !== 'overview' && activeTab !== 'create') {
      const type = activeTab === 'invoices' ? 'invoice' : activeTab === 'subscriptions' ? 'subscription' : 'loan';
      fetchByType(type);
    }
  }, [activeTab, calendarDate]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const fetchSummary = async () => {
    try {
      const res = await api.get('/payables-debt/summary');
      setSummaryTotals(res.data.totals);
      setByType(res.data.by_type || []);
    } catch (err) {
      console.error('Failed to load summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecent = async () => {
    try {
      const res = await api.get('/payables-debt?per_page=10&sort=created_at&direction=desc');
      setRecentItems(res.data.data || []);
    } catch (err) {
      console.error('Failed to load recent items:', err);
    }
  };

  const fetchByType = async (type: string) => {
    setFilterLoading(true);
    try {
      const res = await api.get(`/payables-debt?type=${type}&per_page=20&sort=created_at&direction=desc`);
      setFilteredItems(res.data.data || []);
    } catch (err) {
      console.error('Failed to load filtered items:', err);
    } finally {
      setFilterLoading(false);
    }
  };

  const fetchRates = async () => {
    setRatesLoading(true);
    try {
      const res = await api.get('/payables-debt/currency/rates?base=USD');
      setRates(res.data.rates || {});
    } catch (err) {
      console.error('Failed to load currency rates:', err);
    } finally {
      setRatesLoading(false);
    }
  };

  const fetchCalendarEvents = async (date: Date = calendarDate) => {
    setCalendarLoading(true);
    try {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const res = await api.get(`/payables-debt/calendar/events?year=${year}&month=${month}`);
      setCalendarEvents(res.data.data || []);
    } catch (err) {
      console.error('Failed to load calendar events:', err);
    } finally {
      setCalendarLoading(false);
    }
  };

  const fetchNotificationConfig = async () => {
    setSettingsLoading(true);
    try {
      const res = await api.get('/payables-debt/notifications/config');
      const isSmtpHookEnabled = Boolean(res.data.mail_hook_enabled);
      setMailHookEnabled(isSmtpHookEnabled);
      if (res.data.data) {
        setNotifConfig({
          ...res.data.data,
          selected_user_ids: res.data.data.selected_user_ids || [],
          selected_role_ids: res.data.data.selected_role_ids || [],
          excluded_user_ids: res.data.data.excluded_user_ids || [],
          excluded_role_ids: res.data.data.excluded_role_ids || [],
          enable_email: isSmtpHookEnabled ? Boolean(res.data.data.enable_email) : false,
          widget_calendar_enabled: Boolean(res.data.data.widget_calendar_enabled ?? true),
          widget_calendar_size: res.data.data.widget_calendar_size || 'medium',
          widget_calendar_design: res.data.data.widget_calendar_design || 'modern_glass',
        });
      }
      if (res.data.available_roles) setAvailableRoles(res.data.available_roles);
      if (res.data.available_users) setAvailableUsers(res.data.available_users);
      fetchRecipientPreview();
    } catch (err) {
      console.error('Failed to load notification settings:', err);
    } finally {
      setSettingsLoading(false);
    }
  };

  const fetchRecipientPreview = async () => {
    setLoadingPreview(true);
    try {
      const res = await api.get('/payables-debt/notifications/preview-recipients');
      setRecipientPreview(res.data);
    } catch (err) {
      console.error('Failed to load recipient preview:', err);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSaveNotificationConfig = async () => {
    setSettingsSaving(true);
    try {
      const payload = {
        ...notifConfig,
        enable_email: mailHookEnabled ? notifConfig.enable_email : false,
      };
      const res = await api.put('/payables-debt/notifications/config', payload);
      if (res.data.mail_hook_enabled !== undefined) {
        setMailHookEnabled(Boolean(res.data.mail_hook_enabled));
      }
      showToast('success', 'Settings & widget configuration saved successfully.');
      fetchRecipientPreview();
    } catch (err: any) {
      console.error('Failed to save notification settings:', err);
      showToast('error', err.response?.data?.message || 'Failed to save settings.');
    } finally {
      setSettingsSaving(false);
    }
  };

  const toggleRoleSelection = (roleId: number, field: 'selected_role_ids' | 'excluded_role_ids') => {
    setNotifConfig((prev) => {
      const current = prev[field] || [];
      const updated = current.includes(roleId) ? current.filter((id) => id !== roleId) : [...current, roleId];
      return { ...prev, [field]: updated };
    });
  };

  const toggleUserSelection = (userId: number, field: 'selected_user_ids' | 'excluded_user_ids') => {
    setNotifConfig((prev) => {
      const current = prev[field] || [];
      const updated = current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId];
      return { ...prev, [field]: updated };
    });
  };

  const handlePrevMonth = () => {
    setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCalendarDate(new Date());
  };

  const formatFullDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const monthDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek < 0) startDayOfWeek = 6;

    const daysCount = lastDayOfMonth.getDate();
    const prevMonthLastDate = new Date(year, month, 0).getDate();

    const result: Array<{
      date: Date;
      dateString: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    const todayDate = new Date();
    const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDate - i;
      const d = new Date(year, month - 1, dayNum);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      result.push({
        date: d,
        dateString: ds,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: ds === todayStr,
      });
    }

    for (let d = 1; d <= daysCount; d++) {
      const dt = new Date(year, month, d);
      const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      result.push({
        date: dt,
        dateString: ds,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: ds === todayStr,
      });
    }

    const totalSoFar = result.length;
    const remaining = (7 - (totalSoFar % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const dt = new Date(year, month + 1, d);
      const ds = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      result.push({
        date: dt,
        dateString: ds,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: ds === todayStr,
      });
    }

    return result;
  }, [calendarDate]);

  const filteredCalendarEvents = useMemo(() => {
    return calendarEvents.filter((ev) => {
      if (calendarFilterTiming === 'upcoming') {
        if (ev.status === 'paid' || ev.status === 'cancelled') return false;
        if (ev.timing !== 'upcoming' && ev.timing !== 'today') return false;
      } else if (calendarFilterTiming === 'passed') {
        if (ev.timing !== 'passed' && ev.status !== 'overdue') return false;
      } else if (calendarFilterTiming === 'paid') {
        if (ev.status !== 'paid') return false;
      }

      if (calendarFilterType !== 'all') {
        if (ev.payable?.type !== calendarFilterType) return false;
      }

      return true;
    });
  }, [calendarEvents, calendarFilterTiming, calendarFilterType]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of filteredCalendarEvents) {
      if (!ev.due_date) continue;
      if (!map[ev.due_date]) {
        map[ev.due_date] = [];
      }
      map[ev.due_date].push(ev);
    }
    return map;
  }, [filteredCalendarEvents]);

  const upcomingEvents = useMemo(() => {
    return filteredCalendarEvents
      .filter((e) => (e.timing === 'upcoming' || e.timing === 'today') && e.status !== 'paid' && e.status !== 'cancelled')
      .sort((a, b) => (a.due_date > b.due_date ? 1 : -1));
  }, [filteredCalendarEvents]);

  const passedEvents = useMemo(() => {
    return filteredCalendarEvents
      .filter((e) => (e.timing === 'passed' || e.status === 'overdue') && e.status !== 'paid' && e.status !== 'cancelled')
      .sort((a, b) => (a.due_date < b.due_date ? 1 : -1));
  }, [filteredCalendarEvents]);

  const settledEvents = useMemo(() => {
    return filteredCalendarEvents
      .filter((e) => e.status === 'paid')
      .sort((a, b) => (a.due_date > b.due_date ? 1 : -1));
  }, [filteredCalendarEvents]);

  const calendarSummary = useMemo(() => {
    const totalAmount = filteredCalendarEvents.reduce((acc, curr) => acc + (curr.total_due || 0), 0);
    const overdueCount = filteredCalendarEvents.filter((e) => e.status === 'overdue' || (e.timing === 'passed' && e.status !== 'paid')).length;
    const dueSoonCount = filteredCalendarEvents.filter((e) => e.status === 'due_soon').length;
    const upcomingCount = filteredCalendarEvents.filter((e) => e.status === 'scheduled').length;
    const paidCount = filteredCalendarEvents.filter((e) => e.status === 'paid').length;

    return {
      totalAmount,
      overdueCount,
      dueSoonCount,
      upcomingCount,
      paidCount,
    };
  }, [filteredCalendarEvents]);

  const resetForm = () => {
    setFormTitle('');
    setFormVendor('');
    setFormCategory('General');
    setFormReference('');
    setFormTotalAmount('');
    setFormPrincipal('');
    setFormInterestRate('');
    setFormPlanTier('');
    setFormPaymentMethod('');
    setFormPaymentUrl('');
    setFormPaymentUrls([]);
    setFormIsRecurring(false);
    setFormIntervalCount(1);
    setFormIntervalUnit('months');
    setFormLoanType('single_time');
  };

  const handleCreatePayable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formVendor.trim()) {
      showToast('error', 'Title and Vendor name are required.');
      return;
    }

    const principalVal = parseFloat(formPrincipal) || 0;
    const amountVal = parseFloat(formTotalAmount) || 0;
    const totalAmount = formType === 'loan' ? principalVal : amountVal;

    if (totalAmount <= 0) {
      showToast('error', 'Please enter a valid amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, any> = {
        type: formType,
        title: formTitle.trim(),
        vendor_name: formVendor.trim(),
        category: formCategory.trim() || 'General',
        reference_no: formReference.trim() || null,
        currency: formCurrency,
        total_amount: totalAmount,
      };

      if (formPaymentUrl.trim()) {
        payload.payment_url = formPaymentUrl.trim();
      }

      const validExtraUrls = formPaymentUrls.filter((u) => u.url.trim());
      if (validExtraUrls.length > 0 || formPaymentUrl.trim()) {
        payload.payment_urls = [
          ...(formPaymentUrl.trim() ? [{ label: 'Primary Link', url: formPaymentUrl.trim() }] : []),
          ...validExtraUrls.map((u) => ({ label: u.label.trim() || 'Payment Link', url: u.url.trim() })),
        ];
      }

      if (formType === 'invoice') {
        payload.is_recurring = formIsRecurring;
        payload.start_date = formStartDate;
        if (formIsRecurring) {
          payload.interval_count = formIntervalCount;
          payload.interval_unit = formIntervalUnit;
          payload.end_date = formRepeatIndefinitely ? null : (formEndDate || null);
          payload.repeat_indefinitely = formRepeatIndefinitely;
          payload.pregeneration_days = formPregenerationDays;
        }
      } else if (formType === 'subscription') {
        payload.is_recurring = true;
        payload.interval_count = formIntervalCount;
        payload.interval_unit = formIntervalUnit;
        payload.start_date = formStartDate;
        payload.end_date = formRepeatIndefinitely ? null : (formEndDate || null);
        payload.repeat_indefinitely = formRepeatIndefinitely;
        payload.pregeneration_days = formPregenerationDays;
        payload.plan_tier = formPlanTier.trim() || null;
        payload.payment_method_info = formPaymentMethod.trim() || null;
        payload.auto_renew = false; // All renewals require manual proof
        payload.notice_period_days = formNoticePeriod;
      } else if (formType === 'loan') {
        payload.loan_type = formLoanType;
        payload.principal_amount = principalVal;
        payload.interest_rate = parseFloat(formInterestRate) || 0;
        payload.start_date = formStartDate;
        payload.grace_period_days = formGracePeriod;
        payload.penalty_type = formPenaltyType;
        payload.penalty_rate = parseFloat(formPenaltyRate) || 0;

        if (formLoanType === 'single_time') {
          payload.target_due_date = formTargetDueDate;
          const rate = parseFloat(formInterestRate) || 0;
          payload.total_amount = principalVal + (principalVal * (rate / 100));
        } else {
          payload.calculation_method = formCalcMethod;
          payload.tenure_months = formTenureMonths;
          payload.interval_count = formIntervalCount;
          payload.interval_unit = formIntervalUnit;
          payload.interest_frequency = formInterestFrequency;
          payload.payment_day_of_month = formPaymentDay;
        }
      }

      await api.post('/payables-debt', payload);
      showToast('success', `${formType.toUpperCase()} record created successfully!`);
      resetForm();

      // Refresh data
      await fetchSummary();
      await fetchRecent();

      // Navigate back to the corresponding type tab so user immediately sees their record!
      const targetTab = formType === 'invoice' ? 'invoices' : formType === 'subscription' ? 'subscriptions' : 'loans';
      setActiveTab(targetTab);
      await fetchByType(formType);
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to create payable entry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetPayableId = payTargetInstallment ? payTargetInstallment.payable_id : payTargetItem?.id;
    if (!targetPayableId) return;
    if (!payProofFile) {
      showToast('error', 'Payment proof document is strictly mandatory to mark this item as Paid.');
      return;
    }

    setIsPaying(true);
    try {
      // 1. Identify target installment ID first
      let installmentId: number | null = null;
      if (payTargetInstallment) {
        installmentId = payTargetInstallment.id;
      } else if (payTargetItem) {
        const instRes = await api.get(`/payables-debt/${payTargetItem.id}/installments`);
        const installments = instRes.data.data || [];
        const pendingInst = installments.find((i: any) => i.status !== 'paid' && i.status !== 'cancelled') || installments[0];
        installmentId = pendingInst?.id || null;
      }

      if (!installmentId) {
        showToast('error', 'No active installment found for this liability to mark as paid.');
        return;
      }

      // 2. Upload proof document attached to this installment
      const formData = new FormData();
      formData.append('document', payProofFile);
      formData.append('document_type', payDocType);
      formData.append('installment_id', String(installmentId));

      const uploadRes = await api.post(`/payables-debt/${targetPayableId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const docId = uploadRes.data.data?.id;

      // 3. Mark installment as paid with verified proof document
      await api.post(`/payables-debt/installments/${installmentId}/mark-paid`, {
        proof_document_id: docId,
      });

      showToast('success', 'Payment confirmed with proof document attached.');
      setPayTargetItem(null);
      setPayTargetInstallment(null);
      setPayProofFile(null);
      await fetchSummary();
      await fetchRecent();
      await fetchCalendarEvents(calendarDate);
      if (activeTab !== 'overview' && activeTab !== 'calendar') {
        const type = activeTab === 'invoices' ? 'invoice' : activeTab === 'subscriptions' ? 'subscription' : 'loan';
        await fetchByType(type);
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to confirm payment.');
    } finally {
      setIsPaying(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelTargetItem) return;

    setIsCancelling(true);
    try {
      await api.post(`/payables-debt/${cancelTargetItem.id}/cancel`);
      showToast('success', `'${cancelTargetItem.title}' cancelled.`);
      setCancelTargetItem(null);
      await fetchSummary();
      await fetchRecent();
      if (activeTab !== 'overview' && activeTab !== 'calendar' && activeTab !== 'settings') {
        const type = activeTab === 'invoices' ? 'invoice' : activeTab === 'subscriptions' ? 'subscription' : 'loan';
        await fetchByType(type);
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to cancel service.');
    } finally {
      setIsCancelling(false);
    }
  };

  // Recycle Bin & History Handlers
  const fetchRecycleBin = async () => {
    setRecycleBinLoading(true);
    try {
      const res = await api.get('/payables-debt/recycle-bin');
      setRecycleBinData(res.data.data || { payables: [], documents: [], installments: [] });
      setRecycleBinCount(res.data.meta?.total_count || 0);
    } catch (err: any) {
      console.error('Failed to load recycle bin:', err);
      showToast('error', 'Failed to load recycle bin data.');
    } finally {
      setRecycleBinLoading(false);
    }
  };

  const fetchRecycleBinCount = async () => {
    try {
      const res = await api.get('/payables-debt/recycle-bin');
      setRecycleBinCount(res.data.meta?.total_count || 0);
    } catch {
      // ignore
    }
  };

  const handleDeletePayable = async () => {
    if (!deletePayableTarget) return;
    setIsDeletingPayable(true);
    try {
      await api.delete(`/payables-debt/${deletePayableTarget.id}`);
      showToast('success', `'${deletePayableTarget.title}' moved to Recycle Bin (held for 14 days).`);
      setDeletePayableTarget(null);
      await fetchSummary();
      await fetchRecent();
      await fetchRecycleBinCount();
      if (activeTab !== 'overview' && activeTab !== 'calendar' && activeTab !== 'settings' && activeTab !== 'recycle-bin') {
        const type = activeTab === 'invoices' ? 'invoice' : activeTab === 'subscriptions' ? 'subscription' : 'loan';
        await fetchByType(type);
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to move payable to recycle bin.');
    } finally {
      setIsDeletingPayable(false);
    }
  };

  const openHistoryModal = async (item: PayableItem) => {
    setHistoryTargetItem(item);
    setHistoryActiveTab('documents');
    setShowHistoryModal(true);
    setHistoryLoading(true);
    try {
      const [instRes, docsRes] = await Promise.all([
        api.get(`/payables-debt/${item.id}/installments`),
        api.get(`/payables-debt/${item.id}/documents`),
      ]);
      setHistoryInstallments(instRes.data.data || []);
      setHistoryDocuments(docsRes.data.data || []);
    } catch (err: any) {
      console.error('Failed to load historical data:', err);
      showToast('error', 'Failed to load history and receipts.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const reloadHistoryData = async () => {
    if (!historyTargetItem) return;
    try {
      const [instRes, docsRes] = await Promise.all([
        api.get(`/payables-debt/${historyTargetItem.id}/installments`),
        api.get(`/payables-debt/${historyTargetItem.id}/documents`),
      ]);
      setHistoryInstallments(instRes.data.data || []);
      setHistoryDocuments(docsRes.data.data || []);
    } catch {
      // ignore
    }
  };

  const handleStreamDocument = async (doc: HistoricalDocument) => {
    setStreamingDocId(doc.id);
    try {
      const res = await api.get(`/payables-debt/documents/${doc.id}/stream`, { responseType: 'blob' });
      const fileBlob = new Blob([res.data], { type: doc.mime_type || 'application/pdf' });
      const blobUrl = URL.createObjectURL(fileBlob);
      window.open(blobUrl, '_blank');
    } catch (err: any) {
      console.error('Failed to stream document:', err);
      showToast('error', 'Could not open document from vault.');
    } finally {
      setStreamingDocId(null);
    }
  };

  const handleReplaceDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replaceTargetDoc || !replaceFile) {
      showToast('error', 'Please choose a replacement file.');
      return;
    }
    setIsReplacingDoc(true);
    try {
      const formData = new FormData();
      formData.append('document', replaceFile);
      formData.append('document_type', replaceDocType);
      await api.post(`/payables-debt/documents/${replaceTargetDoc.id}/replace`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showToast('success', 'Document replaced and vault updated successfully.');
      setReplaceTargetDoc(null);
      setReplaceFile(null);
      await reloadHistoryData();
      await fetchSummary();
      await fetchRecent();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to replace document.');
    } finally {
      setIsReplacingDoc(false);
    }
  };

  const handleUploadNewDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!historyTargetItem || !newUploadFile) {
      showToast('error', 'Please select a document file to upload.');
      return;
    }
    setIsUploadingNewDoc(true);
    try {
      const formData = new FormData();
      formData.append('document', newUploadFile);
      formData.append('document_type', newUploadDocType);
      await api.post(`/payables-debt/${historyTargetItem.id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showToast('success', 'Receipt uploaded and stored in vault.');
      setNewUploadFile(null);
      setHistoryActiveTab('documents');
      await reloadHistoryData();
      await fetchSummary();
      await fetchRecent();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to upload document.');
    } finally {
      setIsUploadingNewDoc(false);
    }
  };

  const handleDeleteInstallment = async () => {
    if (!deleteInstallmentTarget) return;
    setIsDeletingInstallment(true);
    try {
      await api.delete(`/payables-debt/installments/${deleteInstallmentTarget.id}`);
      showToast('success', `Installment #${deleteInstallmentTarget.installment_number} moved to Recycle Bin.`);
      setDeleteInstallmentTarget(null);
      await fetchRecycleBinCount();
      await reloadHistoryData();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to clear installment record.');
    } finally {
      setIsDeletingInstallment(false);
    }
  };

  const handleRestoreFromBin = async (type: 'payable' | 'document' | 'installment', id: number) => {
    setIsRestoring(true);
    try {
      const endpoint = type === 'payable'
        ? `/payables-debt/recycle-bin/payables/${id}/restore`
        : type === 'document'
        ? `/payables-debt/recycle-bin/documents/${id}/restore`
        : `/payables-debt/recycle-bin/installments/${id}/restore`;
      const res = await api.post(endpoint);
      showToast('success', res.data.message || 'Restored successfully.');
      setRestoreTarget(null);
      await fetchRecycleBin();
      await fetchRecycleBinCount();
      await fetchSummary();
      await fetchRecent();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to restore item.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleForceDeleteFromBin = async (type: 'payable' | 'document' | 'installment', id: number) => {
    setIsForceDeleting(true);
    try {
      const endpoint = type === 'payable'
        ? `/payables-debt/recycle-bin/payables/${id}`
        : type === 'document'
        ? `/payables-debt/recycle-bin/documents/${id}`
        : `/payables-debt/recycle-bin/installments/${id}`;
      const res = await api.delete(endpoint);
      showToast('success', res.data.message || 'Permanently deleted.');
      setForceDeleteTarget(null);
      await fetchRecycleBin();
      await fetchRecycleBinCount();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to permanently delete item.');
    } finally {
      setIsForceDeleting(false);
    }
  };

  const handleEmptyRecycleBin = async () => {
    setIsEmptyingBin(true);
    try {
      const res = await api.post('/payables-debt/recycle-bin/empty');
      showToast('success', res.data.message || 'Recycle bin emptied.');
      setShowEmptyBinModal(false);
      await fetchRecycleBin();
      await fetchRecycleBinCount();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to empty recycle bin.');
    } finally {
      setIsEmptyingBin(false);
    }
  };

  const formatCurrency = (val: string | number, curr = 'USD') => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr || 'USD',
      maximumFractionDigits: 2,
    }).format(num || 0);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="w-3 h-3" /> Paid
          </span>
        );
      case 'due_soon':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500">
            <Clock className="w-3 h-3" /> Due Soon
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-500">
            <AlertTriangle className="w-3 h-3" /> Overdue
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400">
            <XCircle className="w-3 h-3" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
    }
  };

  const typeBadge = (item: PayableItem) => {
    switch (item.type) {
      case 'invoice':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-500/10 text-blue-400">
            <FileText className="w-3 h-3" /> {item.is_recurring ? 'Recurring Invoice' : 'Invoice'}
          </span>
        );
      case 'subscription':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-500/10 text-purple-400">
            <RefreshCw className="w-3 h-3" /> Subscription
          </span>
        );
      case 'loan':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-400">
            <TrendingUp className="w-3 h-3" /> {item.loan_type === 'single_time' ? 'Single-Time Loan' : 'Amortized Loan'}
          </span>
        );
      default:
        return null;
    }
  };

  const renderIntervalPicker = (title = 'Recurrence Interval') => (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
        {title}
      </label>
      <div className="flex items-center gap-2">
        <div className="w-24">
          <input
            type="number"
            min="1"
            value={formIntervalCount}
            onChange={(e) => setFormIntervalCount(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-center font-mono focus:ring-2 focus:ring-violet-500 outline-none"
          />
        </div>
        <div className="flex-1">
          <select
            value={formIntervalUnit}
            onChange={(e) => setFormIntervalUnit(e.target.value as any)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:ring-2 focus:ring-violet-500 outline-none"
          >
            <option value="days">Day(s)</option>
            <option value="months">Month(s)</option>
            <option value="years">Year(s)</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderCreateView = () => (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              resetForm();
              setActiveTab(previousTab);
            }}
            className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title="Back to Payables"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setActiveTab(previousTab);
                }}
                className="hover:text-violet-500 transition-colors cursor-pointer"
              >
                Payables & Debt
              </button>
              <span>/</span>
              <span className="text-violet-600 dark:text-violet-400 font-semibold">New Entry</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mt-0.5">
              <CreditCard className="w-5 h-5 text-violet-500" />
              <span>Create New Payable Entry</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Track one-off/recurring bills, subscriptions, and single-time or amortized debt
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleCreatePayable} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Liability Type, Primary Details, Online Gateway Links */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Liability Type Selection */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 shadow-sm space-y-3">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Liability Type *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  key: 'invoice',
                  label: 'Invoice',
                  icon: FileText,
                  desc: 'One-off or recurring bills & utilities',
                },
                {
                  key: 'subscription',
                  label: 'Subscription',
                  icon: RefreshCw,
                  desc: 'Periodic SaaS seats & service retainers',
                },
                {
                  key: 'loan',
                  label: 'Loan / Debt',
                  icon: TrendingUp,
                  desc: 'Single-time debt or amortized capital',
                },
              ].map((t) => {
                const Icon = t.icon;
                const isSelected = formType === t.key;
                return (
                  <button
                    type="button"
                    key={t.key}
                    onClick={() => setFormType(t.key as any)}
                    className={`p-4 rounded-2xl text-left transition-all cursor-pointer border flex flex-col justify-between ${
                      isSelected
                        ? 'border-violet-600 bg-violet-600/10 dark:bg-violet-600/15 shadow-sm ring-2 ring-violet-500/20'
                        : 'border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className={`p-2 rounded-xl ${
                          isSelected
                            ? 'bg-violet-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-violet-600 ring-4 ring-violet-600/20" />
                      )}
                    </div>
                    <div>
                      <span
                        className={`text-xs font-bold block ${
                          isSelected ? 'text-violet-600 dark:text-violet-400' : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {t.label}
                      </span>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        {t.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card 2: General Information */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-violet-500" />
              <span>General Information</span>
            </h3>

            {/* Title & Vendor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Title / Purpose *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. AWS Cloud Services"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-violet-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Vendor / Payee Name *
                </label>
                <input
                  type="text"
                  required
                  value={formVendor}
                  onChange={(e) => setFormVendor(e.target.value)}
                  placeholder="e.g. Amazon Web Services Inc"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-violet-500 outline-none"
                />
              </div>
            </div>

            {/* Category & Reference */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  placeholder="e.g. Utilities, Cloud, Legal"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-violet-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Invoice / Contract Ref #
                </label>
                <input
                  type="text"
                  value={formReference}
                  onChange={(e) => setFormReference(e.target.value)}
                  placeholder="e.g. INV-2026-9044"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-violet-500 outline-none font-mono"
                />
              </div>
            </div>

            {/* Amount & Currency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {formType === 'loan' ? 'Principal / Borrowed Base Amount *' : 'Total Amount *'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formType === 'loan' ? formPrincipal : formTotalAmount}
                  onChange={(e) =>
                    formType === 'loan'
                      ? setFormPrincipal(e.target.value)
                      : setFormTotalAmount(e.target.value)
                  }
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-violet-500 outline-none font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Currency (Live Stream Supported)
                </label>
                <select
                  value={formCurrency}
                  onChange={(e) => setFormCurrency(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-violet-500 outline-none"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Start Date */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                {formType === 'loan' ? 'Borrow Date / Start Date' : 'Bill Date / Start Date'}
              </label>
              <input
                type="date"
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
              />
            </div>
          </div>

          {/* Card 3: Online Payment Portals & Gateway Links */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-violet-500" />
                <span>Payment URL / Online Gateway (Optional)</span>
              </label>
              <span className="text-[10px] text-slate-400">Opens in new tab</span>
            </div>
            <p className="text-xs text-slate-400">
              Add checkout portal or payment page link(s) to quickly access online settlement.
            </p>

            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="url"
                  value={formPaymentUrl}
                  onChange={(e) => setFormPaymentUrl(e.target.value)}
                  placeholder="e.g. https://billing.vendor.com/pay/inv-101"
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-violet-500 outline-none"
                />
                {formPaymentUrl.trim() && (
                  <a
                    href={formPaymentUrl.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-violet-600/10 hover:bg-violet-600/20 text-violet-600 dark:text-violet-400 text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                    title="Test link in new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Test Link</span>
                  </a>
                )}
              </div>

              {/* Additional Payment URLs */}
              {formPaymentUrls.map((link, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={link.label}
                    onChange={(e) => {
                      const updated = [...formPaymentUrls];
                      updated[idx].label = e.target.value;
                      setFormPaymentUrls(updated);
                    }}
                    placeholder="Label (e.g. PayPal, Wire Transfer)"
                    className="w-1/3 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                  />
                  <input
                    type="url"
                    value={link.url}
                    onChange={(e) => {
                      const updated = [...formPaymentUrls];
                      updated[idx].url = e.target.value;
                      setFormPaymentUrls(updated);
                    }}
                    placeholder="https://..."
                    className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono"
                  />
                  {link.url.trim() && (
                    <a
                      href={link.url.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-violet-600/10 hover:bg-violet-600/20 text-violet-600 text-xs shrink-0 cursor-pointer"
                      title="Open link in new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setFormPaymentUrls(formPaymentUrls.filter((_, i) => i !== idx));
                    }}
                    className="p-2.5 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/20 shrink-0 cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setFormPaymentUrls([...formPaymentUrls, { label: '', url: '' }])}
                className="inline-flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 font-semibold hover:underline cursor-pointer pt-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Another Payment Link</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Type-Specific Settings & Compliance Policy */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 4: Type-Specific Configurations */}
          {formType === 'invoice' && (
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-violet-500" />
                <span>Invoice Recurrence Rules</span>
              </h3>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                <CustomCheckbox
                  checked={formIsRecurring}
                  onChange={(checked) => setFormIsRecurring(checked)}
                  label="Make this a Recurring Invoice"
                  sublabel="Auto-generate future billings at custom day/month/year intervals"
                />
              </div>

              {formIsRecurring && (
                <div className="space-y-4 pt-2">
                  {renderIntervalPicker('Repeat Every')}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] font-medium text-slate-500 block mb-1">
                        Pre-generation Trigger
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="90"
                          value={formPregenerationDays}
                          onChange={(e) => setFormPregenerationDays(parseInt(e.target.value) || 7)}
                          className="w-20 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-center"
                        />
                        <span className="text-xs text-slate-400">days in advance</span>
                      </div>
                    </div>

                    {!formRepeatIndefinitely && (
                      <div>
                        <label className="text-[11px] font-medium text-slate-500 block mb-1">
                          End Date
                        </label>
                        <input
                          type="date"
                          value={formEndDate}
                          onChange={(e) => setFormEndDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                        />
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <CustomCheckbox
                      checked={formRepeatIndefinitely}
                      onChange={(checked) => setFormRepeatIndefinitely(checked)}
                      label="Repeat Indefinitely (No End Date)"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {formType === 'subscription' && (
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-violet-500" />
                <span>Subscription Details & Renewal</span>
              </h3>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Plan / Tier Name
                  </label>
                  <input
                    type="text"
                    value={formPlanTier}
                    onChange={(e) => setFormPlanTier(e.target.value)}
                    placeholder="e.g. Enterprise Pro"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Payment Method Info
                  </label>
                  <input
                    type="text"
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value)}
                    placeholder="e.g. Corporate Visa 4242"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              {renderIntervalPicker('Subscription Billing Cycle')}

              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                <div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    Cancellation Notice Window
                  </span>
                  <span className="text-[11px] text-slate-400">Days to notify vendor before renewal</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={formNoticePeriod}
                    onChange={(e) => setFormNoticePeriod(parseInt(e.target.value) || 0)}
                    className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-center font-mono font-bold"
                  />
                  <span className="text-[11px] text-slate-400">days</span>
                </div>
              </div>
            </div>
          )}

          {formType === 'loan' && (
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-violet-500" />
                <span>Loan & Debt Terms</span>
              </h3>

              {/* Loan Category Selector */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Select Loan Category
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormLoanType('single_time')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      formLoanType === 'single_time'
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Single-Time Loan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormLoanType('long_time')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      formLoanType === 'long_time'
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    <span>Long-Time (Amortized)</span>
                  </button>
                </div>
              </div>

              {formLoanType === 'single_time' ? (
                /* Single-Time Loan Form */
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-slate-500 block mb-1">
                        Target Pay Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={formTargetDueDate}
                        onChange={(e) => setFormTargetDueDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-500 block mb-1">
                        Interest Rate (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formInterestRate}
                        onChange={(e) => setFormInterestRate(e.target.value)}
                        placeholder="e.g. 5.0"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>

                  {/* Calculation Preview */}
                  {(() => {
                    const principal = parseFloat(formPrincipal) || 0;
                    const rate = parseFloat(formInterestRate) || 0;
                    const interestAmt = Number((principal * (rate / 100)).toFixed(2));
                    const totalAmt = Number((principal + interestAmt).toFixed(2));
                    return (
                      <div className="p-4 bg-violet-500/5 dark:bg-violet-500/10 rounded-2xl space-y-2 text-xs">
                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                          <span>Base Principal Amount:</span>
                          <span className="font-mono font-semibold">{formatCurrency(principal, formCurrency)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                          <span>Interest Charge ({rate}%):</span>
                          <span className="font-mono font-semibold text-amber-600">+{formatCurrency(interestAmt, formCurrency)}</span>
                        </div>
                        <div className="pt-2 border-t border-violet-500/15 flex justify-between font-bold text-violet-700 dark:text-violet-300">
                          <span>Total Due on Target Date:</span>
                          <span className="font-mono text-sm">{formatCurrency(totalAmt, formCurrency)}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Grace & Penalty */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] font-medium text-slate-500 block mb-1">Grace (Days)</label>
                      <input
                        type="number"
                        min="0"
                        value={formGracePeriod}
                        onChange={(e) => setFormGracePeriod(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-500 block mb-1">Penalty Mode</label>
                      <select
                        value={formPenaltyType}
                        onChange={(e) => setFormPenaltyType(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      >
                        <option value="fixed_fee">Fixed Fee</option>
                        <option value="daily_percentage">Daily %</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-500 block mb-1">Penalty Rate</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formPenaltyRate}
                        onChange={(e) => setFormPenaltyRate(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Long-Time Loan Form */
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-slate-500 block mb-1">Interest Rate (%)</label>
                      <div className="flex gap-1.5">
                        <input
                          type="number"
                          step="0.01"
                          value={formInterestRate}
                          onChange={(e) => setFormInterestRate(e.target.value)}
                          placeholder="5.5"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold"
                        />
                        <select
                          value={formInterestFrequency}
                          onChange={(e) => setFormInterestFrequency(e.target.value as any)}
                          className="px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-semibold"
                        >
                          <option value="yearly">/yr</option>
                          <option value="monthly">/mo</option>
                          <option value="daily">/day</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-slate-500 block mb-1">Calculation Method</label>
                      <select
                        value={formCalcMethod}
                        onChange={(e) => setFormCalcMethod(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                      >
                        <option value="flat">Flat Rate</option>
                        <option value="simple">Simple Interest</option>
                        <option value="compounding">Compounding (EMI)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-slate-500 block mb-1">Total Installments</label>
                      <input
                        type="number"
                        min="1"
                        value={formTenureMonths}
                        onChange={(e) => setFormTenureMonths(parseInt(e.target.value) || 12)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-center font-bold"
                      />
                    </div>
                  </div>

                  {renderIntervalPicker('Installment Schedule Frequency')}

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] font-medium text-slate-500 block mb-1">Due Day</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={formPaymentDay}
                        onChange={(e) => setFormPaymentDay(parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-500 block mb-1">Grace Days</label>
                      <input
                        type="number"
                        min="0"
                        value={formGracePeriod}
                        onChange={(e) => setFormGracePeriod(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-500 block mb-1">Penalty Mode</label>
                      <select
                        value={formPenaltyType}
                        onChange={(e) => setFormPenaltyType(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      >
                        <option value="fixed_fee">Fixed Fee</option>
                        <option value="daily_percentage">Daily %</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-500 block mb-1">Penalty Rate</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formPenaltyRate}
                        onChange={(e) => setFormPenaltyRate(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Card 5: Strict Manual Verification Enforced Banner */}
          <div className="flex items-start gap-3.5 p-5 rounded-3xl bg-violet-500/10 text-xs text-violet-800 dark:text-violet-200 border border-violet-500/15">
            <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-violet-600 dark:text-violet-400" />
            <div className="space-y-1">
              <p className="font-bold text-xs">Manual Verification Enforced Across All Types</p>
              <p className="text-[11px] opacity-85 leading-relaxed">
                {formType === 'invoice' &&
                  'All invoices (one-time & recurring) strictly require an uploaded proof document (bank slip or receipt) to mark as Settled. Auto-clearing without proof is prohibited.'}
                {formType === 'subscription' &&
                  'Subscriptions are never auto-settled; each recurring cycle generates a scheduled payment requiring an uploaded receipt or proof doc.'}
                {formType === 'loan' &&
                  'Loan installments strictly require verified proof documents (wire slip or bank confirmation) before balances are cleared.'}
              </p>
            </div>
          </div>

          {/* Card 6: Submit Actions Bottom Bar */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setActiveTab(previousTab);
              }}
              className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-600/25 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating Payable...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Create Payable Entry</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );

  const displayItems = activeTab === 'overview' ? recentItems : filteredItems;

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600 text-white shadow-emerald-600/30'
              : 'bg-rose-600 text-white shadow-rose-600/30'
          }`}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span className="text-xs font-semibold">{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-80">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {activeTab === 'create' ? (
        <div key="create" className="animate-float-in">
          {renderCreateView()}
        </div>
      ) : (
        <div key="main-tabs" className="space-y-6 animate-float-in">
          {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-violet-600/10 text-violet-500 rounded-2xl">
              <FileClock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Payables & Debt</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Liabilities, Invoices, Subscriptions & Loan Tracker
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Module Settings & Widget Configuration */}
          <button
            onClick={() => {
              fetchNotificationConfig();
              setActiveTab('settings');
            }}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title="Module Settings & Overview Widget"
          >
            <Settings className={`w-3.5 h-3.5 ${activeTab === 'settings' ? 'text-white' : 'text-violet-500'}`} />
            <span className="hidden sm:inline">Settings</span>
          </button>

          {/* Live Currency Rates Quick Button */}
          <button
            onClick={() => setShowConverter(!showConverter)}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            title="Live Currency Rates"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-violet-500" />
            <span className="hidden sm:inline">Exchange Rates</span>
          </button>

          <button
            onClick={() => {
              fetchSummary();
              fetchRates();
              if (activeTab === 'overview') fetchRecent();
              else {
                const type = activeTab === 'invoices' ? 'invoice' : activeTab === 'subscriptions' ? 'subscription' : 'loan';
                fetchByType(type);
              }
            }}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading || filterLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => openCreatePage()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-600/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Payable</span>
          </button>
        </div>
      </div>

      {/* Live Exchange Rate Bar / Quick Converter */}
      {showConverter && (
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <ArrowRightLeft className="w-3.5 h-3.5 text-violet-500" />
                Live Currency Exchange (HTTP Stream)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-mono font-semibold">
                USD | EUR | LKR | INR
              </span>
              <button
                type="button"
                onClick={fetchRates}
                disabled={ratesLoading}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                title="Refresh Exchange Rates"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${ratesLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <button
              onClick={() => setShowConverter(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1">
            {/* Rates Pills */}
            <div className="md:col-span-2 flex items-center gap-2 flex-wrap">
              <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs">
                <span className="text-slate-400">1 USD = </span>
                <span className="font-mono font-bold text-violet-600 dark:text-violet-400">
                  {rates.eur ? rates.eur.toFixed(4) : '...'} EUR
                </span>
              </div>
              <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs">
                <span className="text-slate-400">1 USD = </span>
                <span className="font-mono font-bold text-violet-600 dark:text-violet-400">
                  {rates.lkr ? rates.lkr.toFixed(2) : '...'} LKR
                </span>
              </div>
              <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs">
                <span className="text-slate-400">1 USD = </span>
                <span className="font-mono font-bold text-violet-600 dark:text-violet-400">
                  {rates.inr ? rates.inr.toFixed(2) : '...'} INR
                </span>
              </div>
            </div>

            {/* Quick Converter Inputs */}
            <div className="md:col-span-2 flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={calcAmount}
                onChange={(e) => setCalcAmount(e.target.value)}
                className="w-24 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
              />
              <select
                value={calcFromCurrency}
                onChange={(e) => setCalcFromCurrency(e.target.value as any)}
                className="px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <span className="text-slate-400 text-xs">=</span>
              <select
                value={calcToCurrency}
                onChange={(e) => setCalcToCurrency(e.target.value as any)}
                className="px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <div className="flex-1 px-3 py-1.5 rounded-xl bg-violet-600/10 text-violet-600 dark:text-violet-300 font-mono font-bold text-xs text-right">
                {(() => {
                  const amt = parseFloat(calcAmount) || 0;
                  const fromRate = rates[calcFromCurrency.toLowerCase()] || 1;
                  const toRate = rates[calcToCurrency.toLowerCase()] || 1;
                  // Convert from base USD
                  const converted = calcFromCurrency === 'USD'
                    ? amt * toRate
                    : (amt / (fromRate || 1)) * toRate;
                  return converted.toFixed(2) + ' ' + calcToCurrency;
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={`skel-metric-${i}`} className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-3.5 w-24 rounded-md skeleton-wave" />
                <div className="w-8 h-8 rounded-xl skeleton-wave" />
              </div>
              <div className="h-8 w-32 rounded-lg skeleton-wave mt-2" />
              <div className="flex justify-between items-center mt-2">
                <div className="h-3 w-16 rounded-md skeleton-wave" />
                <div className="h-3 w-14 rounded-md skeleton-wave" />
              </div>
            </div>
          ))
        ) : (
          <>
            {/* Total Liabilities */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Liabilities</span>
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-500">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-3 font-mono">
                {formatCurrency(summaryTotals?.total_liability || 0)}
              </p>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                <span>{summaryTotals?.total_count || 0} Total Records</span>
                <span className="text-emerald-500 font-semibold">{formatCurrency(summaryTotals?.total_paid || 0)} Paid</span>
              </div>
            </div>

            {/* Due Soon */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Due Soon</span>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-amber-500 mt-3 font-mono">
                {summaryTotals?.due_soon_count || 0}
              </p>
              <p className="text-[11px] text-slate-400 mt-2">Requires attention within 5 days</p>
            </div>

            {/* Overdue */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Overdue Liabilities</span>
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-rose-500 mt-3 font-mono">
                {summaryTotals?.overdue_count || 0}
              </p>
              <p className="text-[11px] text-slate-400 mt-2">Penalties accrual active</p>
            </div>

            {/* Settled / Paid */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Settled & Paid</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-emerald-500 mt-3 font-mono">
                {summaryTotals?.paid_count || 0}
              </p>
              <p className="text-[11px] text-slate-400 mt-2">Verified with proof documents</p>
            </div>
          </>
        )}
      </div>

      {/* Breakdown by Type */}
      {byType.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="font-semibold text-slate-400 uppercase text-[10px] tracking-wider shrink-0">Breakdown:</span>
          {byType.map((bt) => (
            <div key={bt.type} className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 shadow-xs text-slate-700 dark:text-slate-300 flex items-center gap-2 shrink-0">
              <span className="capitalize font-bold">{bt.type}:</span>
              <span className="font-mono text-violet-500 font-semibold">{formatCurrency(bt.total_amount)}</span>
              <span className="text-[10px] text-slate-400">({bt.count})</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { key: 'overview', label: 'Overview & Recent', icon: Layers },
            { key: 'calendar', label: 'Payment Calendar', icon: Calendar },
            { key: 'invoices', label: 'Invoices', icon: FileText },
            { key: 'subscriptions', label: 'Subscriptions', icon: RefreshCw },
            { key: 'loans', label: 'Loans & Debt', icon: TrendingUp },
            { key: 'recycle-bin', label: 'Recycle Bin', icon: Trash2 },
            { key: 'settings', label: 'Settings & Widget', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                type="button"
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.key === 'calendar' && calendarSummary.overdueCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                )}
                {tab.key === 'recycle-bin' && recycleBinCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-mono text-[10px] font-bold">
                    {recycleBinCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => openCreatePage()}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-sm shadow-violet-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Entry</span>
        </button>
      </div>

      {/* Calendar View OR Table View */}
      {activeTab === 'calendar' ? (
        <div key="calendar" className="space-y-5 animate-float-in">
          {/* Calendar Control & Navigation Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Month & Year Navigation */}
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{MONTH_NAMES[calendarDate.getMonth()]} {calendarDate.getFullYear()}</span>
                </h2>
                <p className="text-[11px] text-slate-400">
                  Click any date to inspect payment details, status & proof docs
                </p>
              </div>
              <div className="flex items-center gap-1 ml-1 sm:ml-2">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleToday}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Month & Year jump + Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={calendarDate.getMonth()}
                onChange={(e) => setCalendarDate(new Date(calendarDate.getFullYear(), parseInt(e.target.value), 1))}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
              >
                {MONTH_NAMES.map((m, idx) => (
                  <option key={m} value={idx}>{m}</option>
                ))}
              </select>

              <select
                value={calendarDate.getFullYear()}
                onChange={(e) => setCalendarDate(new Date(parseInt(e.target.value), calendarDate.getMonth(), 1))}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-semibold"
              >
                {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              {/* Timing filter pills */}
              <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs">
                {[
                  { key: 'all', label: 'All Dates' },
                  { key: 'upcoming', label: 'Upcoming' },
                  { key: 'passed', label: 'Passed / Overdue' },
                  { key: 'paid', label: 'Settled' },
                ].map((f) => (
                  <button
                    type="button"
                    key={f.key}
                    onClick={() => setCalendarFilterTiming(f.key as any)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      calendarFilterTiming === f.key
                        ? 'bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Type Filter */}
              <select
                value={calendarFilterType}
                onChange={(e) => setCalendarFilterType(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
              >
                <option value="all">All Types</option>
                <option value="invoice">Invoices</option>
                <option value="subscription">Subscriptions</option>
                <option value="loan">Loans</option>
              </select>

              <button
                type="button"
                onClick={() => fetchCalendarEvents(calendarDate)}
                disabled={calendarLoading}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 cursor-pointer"
                title="Refresh Calendar"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${calendarLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Month Summary Cards / Color Legend */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block">Upcoming / Scheduled</span>
                <span className="text-xl font-black font-mono text-violet-600 dark:text-violet-400">
                  {calendarSummary.upcomingCount}
                </span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="w-3.5 h-3.5 rounded-full bg-violet-500 ring-4 ring-violet-500/20" />
                <span className="text-[10px] text-slate-400 font-medium">Future</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block">Due Soon (&lt;= 5 Days)</span>
                <span className="text-xl font-black font-mono text-amber-500">
                  {calendarSummary.dueSoonCount}
                </span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="w-3.5 h-3.5 rounded-full bg-amber-500 ring-4 ring-amber-500/20" />
                <span className="text-[10px] text-slate-400 font-medium">Urgent</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block">Passed & Overdue</span>
                <span className="text-xl font-black font-mono text-rose-500">
                  {calendarSummary.overdueCount}
                </span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="w-3.5 h-3.5 rounded-full bg-rose-500 ring-4 ring-rose-500/20" />
                <span className="text-[10px] text-slate-400 font-medium">Penalties</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block">Settled & Paid</span>
                <span className="text-xl font-black font-mono text-emerald-500">
                  {calendarSummary.paidCount}
                </span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
                <span className="text-[10px] text-slate-400 font-medium">Verified</span>
              </div>
            </div>
          </div>

          {/* Interactive Monthly Grid */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm p-4 sm:p-6 overflow-hidden">
            {/* Weekday Labels Header */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <div
                  key={day}
                  className="text-center font-bold text-[11px] uppercase tracking-wider text-slate-400 py-1"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Day Cells Grid */}
            <div className="grid grid-cols-7 gap-2">
              {monthDays.map((day, idx) => {
                const eventsForDay = eventsByDate[day.dateString] || [];
                const hasEvents = eventsForDay.length > 0;
                const hasOverdue = eventsForDay.some((e) => e.status === 'overdue' || (e.timing === 'passed' && e.status !== 'paid'));
                const hasDueSoon = eventsForDay.some((e) => e.status === 'due_soon');
                const hasUpcoming = eventsForDay.some((e) => e.status === 'scheduled');
                const isAllPaid = hasEvents && eventsForDay.every((e) => e.status === 'paid');

                const totalDayAmount = eventsForDay.reduce((acc, e) => acc + (e.total_due || 0), 0);

                let cellHighlightClasses = 'bg-white dark:bg-slate-900/60 hover:bg-slate-100/70 dark:hover:bg-slate-800/60';

                if (!day.isCurrentMonth) {
                  cellHighlightClasses = 'bg-slate-50/30 dark:bg-slate-900/20 opacity-40 hover:opacity-75';
                } else if (hasOverdue) {
                  cellHighlightClasses = 'bg-rose-50/80 dark:bg-rose-950/30 shadow-xs hover:bg-rose-100/90 hover:shadow-md';
                } else if (hasDueSoon) {
                  cellHighlightClasses = 'bg-amber-50/80 dark:bg-amber-950/30 shadow-xs hover:bg-amber-100/90 hover:shadow-md';
                } else if (hasUpcoming) {
                  cellHighlightClasses = 'bg-violet-50/70 dark:bg-violet-950/25 shadow-xs hover:bg-violet-100/80 hover:shadow-md';
                } else if (isAllPaid) {
                  cellHighlightClasses = 'bg-emerald-50/70 dark:bg-emerald-950/25 shadow-xs hover:bg-emerald-100/80 hover:shadow-md';
                }

                return (
                  <div
                    key={`${day.dateString}-${idx}`}
                    onClick={() => {
                      setSelectedDayDateString(day.dateString);
                      setSelectedDayEvents(eventsForDay);
                      setShowDayModal(true);
                    }}
                    className={`min-h-[115px] sm:min-h-[130px] p-2 sm:p-2.5 rounded-2xl transition-all cursor-pointer flex flex-col justify-between group ${cellHighlightClasses} ${
                      day.isToday ? 'ring-2 ring-violet-500 ring-offset-2 dark:ring-offset-slate-900' : ''
                    }`}
                  >
                    {/* Top Row: Date Number & Total Amount */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs sm:text-sm font-bold font-mono ${
                            day.isToday
                              ? 'w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center font-black shadow-xs'
                              : day.isCurrentMonth
                              ? 'text-slate-800 dark:text-slate-200'
                              : 'text-slate-400'
                          }`}
                        >
                          {day.dayNumber}
                        </span>
                        {day.isToday && (
                          <span className="hidden sm:inline text-[9px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                            Today
                          </span>
                        )}
                      </div>

                      {hasEvents && (
                        <span className="text-[10px] sm:text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 truncate ml-1">
                          {formatCurrency(totalDayAmount, eventsForDay[0]?.payable?.currency || 'USD')}
                        </span>
                      )}
                    </div>

                    {/* Middle: Event Badges */}
                    <div className="space-y-1 my-1 overflow-hidden">
                      {eventsForDay.slice(0, 2).map((ev) => {
                        let badgeBg = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
                        let dotColor = 'bg-slate-400';

                        if (ev.status === 'paid') {
                          badgeBg = 'bg-emerald-100/90 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';
                          dotColor = 'bg-emerald-500';
                        } else if (ev.status === 'overdue' || ev.timing === 'passed') {
                          badgeBg = 'bg-rose-100/90 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300';
                          dotColor = 'bg-rose-500 animate-pulse';
                        } else if (ev.status === 'due_soon') {
                          badgeBg = 'bg-amber-100/90 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300';
                          dotColor = 'bg-amber-500';
                        } else {
                          badgeBg = 'bg-violet-100/90 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300';
                          dotColor = 'bg-violet-500';
                        }

                        return (
                          <div
                            key={ev.id}
                            className={`px-1.5 py-0.5 rounded-lg text-[10px] font-semibold flex items-center gap-1 truncate ${badgeBg}`}
                            title={`${ev.payable?.title} (${formatCurrency(ev.total_due, ev.payable?.currency)})`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                            <span className="truncate flex-1">{ev.payable?.vendor_name || ev.payable?.title}</span>
                          </div>
                        );
                      })}

                      {eventsForDay.length > 2 && (
                        <div className="text-[10px] font-bold text-slate-400 pl-1">
                          +{eventsForDay.length - 2} more
                        </div>
                      )}
                    </div>

                    {/* Bottom Indicator Dots */}
                    <div className="flex items-center gap-1 pt-1.5">
                      {hasEvents ? (
                        <div className="flex items-center gap-1">
                          {hasOverdue && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" title="Overdue payments" />}
                          {hasDueSoon && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Due soon" />}
                          {hasUpcoming && <span className="w-1.5 h-1.5 rounded-full bg-violet-500" title="Upcoming scheduled" />}
                          {isAllPaid && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Settled" />}
                          <span className="text-[9px] text-slate-400 font-mono ml-0.5">
                            {eventsForDay.length} item{eventsForDay.length === 1 ? '' : 's'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[9px] text-slate-300 dark:text-slate-700 italic">No events</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Agenda / Stream View (Upcoming vs Overdue vs Settled Columns) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-2">
            {/* 1. Upcoming Payments Stream */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-violet-500" />
                  <span>Upcoming Schedule</span>
                </h3>
                <span className="text-xs font-mono font-semibold text-violet-600 dark:text-violet-400">
                  {upcomingEvents.length} pending
                </span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800/80 mt-2 max-h-[360px] overflow-y-auto pr-1 flex-1">
                {upcomingEvents.length === 0 ? (
                  <p className="text-xs text-slate-400 py-8 text-center italic">
                    No upcoming payments scheduled in this period.
                  </p>
                ) : (
                  upcomingEvents.map((ev) => (
                    <div
                      key={ev.id}
                      onClick={() => {
                        setSelectedDayDateString(ev.due_date);
                        setSelectedDayEvents(eventsByDate[ev.due_date] || [ev]);
                        setShowDayModal(true);
                      }}
                      className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 px-2 rounded-xl transition-all cursor-pointer group"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 dark:text-white truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                          {ev.payable?.title}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{ev.payable?.vendor_name}</span>
                          <span>•</span>
                          <span className="font-mono text-violet-500 font-semibold">{ev.due_date}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold font-mono text-slate-900 dark:text-white">
                          {formatCurrency(ev.total_due, ev.payable?.currency)}
                        </div>
                        <span className={`inline-block mt-0.5 text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          ev.is_today
                            ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold'
                            : ev.status === 'due_soon'
                            ? 'bg-amber-500/10 text-amber-500'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {ev.is_today ? 'Due Today' : ev.days_diff > 0 ? `In ${ev.days_diff} days` : 'Due Soon'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 2. Passed & Overdue Payments Stream (Strictly Unpaid Overdue) */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span>Passed & Overdue Dates</span>
                </h3>
                <span className="text-xs font-mono font-semibold text-rose-500">
                  {passedEvents.length} overdue
                </span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800/80 mt-2 max-h-[360px] overflow-y-auto pr-1 flex-1">
                {passedEvents.length === 0 ? (
                  <p className="text-xs text-slate-400 py-8 text-center italic">
                    All clear! No overdue payments found for this period.
                  </p>
                ) : (
                  passedEvents.map((ev) => (
                    <div
                      key={ev.id}
                      onClick={() => {
                        setSelectedDayDateString(ev.due_date);
                        setSelectedDayEvents(eventsByDate[ev.due_date] || [ev]);
                        setShowDayModal(true);
                      }}
                      className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 px-2 rounded-xl transition-all cursor-pointer group"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 dark:text-white truncate group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                          {ev.payable?.title}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{ev.payable?.vendor_name}</span>
                          <span>•</span>
                          <span className="font-mono text-rose-500 font-semibold">{ev.due_date}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold font-mono text-slate-900 dark:text-white">
                          {formatCurrency(ev.total_due, ev.payable?.currency)}
                        </div>
                        <span className="inline-block mt-0.5 text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-500/10 text-rose-500">
                          {ev.days_diff < 0 ? `${Math.abs(ev.days_diff)}d Overdue` : 'Passed Due'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 3. Settled & Paid Stream */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Settled & Paid</span>
                </h3>
                <span className="text-xs font-mono font-semibold text-emerald-500">
                  {settledEvents.length} settled
                </span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800/80 mt-2 max-h-[360px] overflow-y-auto pr-1 flex-1">
                {settledEvents.length === 0 ? (
                  <p className="text-xs text-slate-400 py-8 text-center italic">
                    No settled payments recorded for this period.
                  </p>
                ) : (
                  settledEvents.map((ev) => (
                    <div
                      key={ev.id}
                      onClick={() => {
                        setSelectedDayDateString(ev.due_date);
                        setSelectedDayEvents(eventsByDate[ev.due_date] || [ev]);
                        setShowDayModal(true);
                      }}
                      className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 px-2 rounded-xl transition-all cursor-pointer group"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {ev.payable?.title}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{ev.payable?.vendor_name}</span>
                          <span>•</span>
                          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{ev.due_date}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold font-mono text-slate-900 dark:text-white">
                          {formatCurrency(ev.total_due, ev.payable?.currency)}
                        </div>
                        <span className="inline-block mt-0.5 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-500">
                          Settled
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'settings' ? (
        <div key="settings" className="space-y-6 animate-float-in">
          {/* Settings Page Header Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-violet-600/10 text-violet-600 dark:text-violet-400 rounded-2xl">
                <Settings className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Module Settings & Configuration
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Configure live month dashboard overview widget, notification channels, email hook, and audience targeting
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchNotificationConfig}
                disabled={settingsLoading}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${settingsLoading ? 'animate-spin' : ''}`} />
                <span>Reload</span>
              </button>

              <button
                type="button"
                onClick={handleSaveNotificationConfig}
                disabled={settingsSaving || settingsLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-violet-600/25 transition-all cursor-pointer"
              >
                {settingsSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Settings</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {settingsLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw className="w-7 h-7 animate-spin text-violet-500" />
              <span className="text-xs font-semibold">Loading settings...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 1. Dashboard Overview Widget Configuration Card (Full Width) */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-violet-600/10 text-violet-500">
                      <LayoutTemplate className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Dashboard Overview Widget
                      </h3>
                      <p className="text-xs text-slate-400">
                        Live month calendar module displayed on your main dashboard overview
                      </p>
                    </div>
                  </div>

                  {/* Enable Toggle Switch */}
                  <div
                    onClick={async () => {
                      const nextVal = !notifConfig.widget_calendar_enabled;
                      setNotifConfig((prev) => ({
                        ...prev,
                        widget_calendar_enabled: nextVal,
                      }));
                      try {
                        const payload = {
                          ...notifConfig,
                          widget_calendar_enabled: nextVal,
                          enable_email: mailHookEnabled ? notifConfig.enable_email : false,
                        };
                        await api.put('/payables-debt/notifications/config', payload);
                        showToast(
                          'success',
                          nextVal
                            ? 'Dashboard Overview Calendar Widget enabled!'
                            : 'Dashboard Overview Calendar Widget disabled!'
                        );
                      } catch (err: any) {
                        setNotifConfig((prev) => ({
                          ...prev,
                          widget_calendar_enabled: !nextVal,
                        }));
                        showToast('error', err.response?.data?.message || 'Failed to update widget status.');
                      }
                    }}
                    className="flex items-center gap-2.5 cursor-pointer select-none"
                  >
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {notifConfig.widget_calendar_enabled ? 'Widget Enabled' : 'Widget Disabled'}
                    </span>
                    <div
                      className={`w-10 h-6 rounded-full transition-colors flex items-center p-0.5 ${
                        notifConfig.widget_calendar_enabled
                          ? 'bg-violet-600 justify-end'
                          : 'bg-slate-300 dark:bg-slate-700 justify-start'
                      }`}
                    >
                      <div className="w-5 h-5 rounded-full bg-white shadow-xs" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Notification Channels, Delivery & Audience Targeting (3 Cards in Same Row on PC) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                {/* Card 1: Notification Channels & Mail Hook */}
                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-violet-600/10 text-violet-500">
                        <Bell className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          Notification Channels & Mail Hook
                        </h3>
                        <p className="text-xs text-slate-400">
                          Configure automated delivery transport methods
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      {/* Email Hook Toggle (Hidden when Payables & Debt Alerts trigger is turned off in SMTP) */}
                      {mailHookEnabled && (
                        <div
                          onClick={() => setNotifConfig((prev) => ({ ...prev, enable_email: !prev.enable_email }))}
                          className={`p-4 rounded-2xl transition-all cursor-pointer ${
                            notifConfig.enable_email
                              ? 'bg-violet-50/60 dark:bg-violet-950/30 ring-2 ring-violet-500/30 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <div className="p-2 bg-violet-600/10 text-violet-500 rounded-xl">
                                <Mail className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-900 dark:text-white">
                                  Email Hook
                                </div>
                                <span className="text-[10px] text-violet-600 dark:text-violet-400 font-mono font-semibold">
                                  hook_payable_notification
                                </span>
                              </div>
                            </div>
                            <div
                              className={`w-9 h-5 rounded-full transition-colors flex items-center p-0.5 ${
                                notifConfig.enable_email ? 'bg-violet-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                              }`}
                            >
                              <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2.5 leading-relaxed">
                            Dispatches automated email notifications via the module mail hook for upcoming due dates and overdue liabilities.
                          </p>
                        </div>
                      )}

                      {/* In-App Alerts */}
                      <div
                        onClick={() => setNotifConfig((prev) => ({ ...prev, enable_in_app: !prev.enable_in_app }))}
                        className={`p-4 rounded-2xl transition-all cursor-pointer ${
                          notifConfig.enable_in_app
                            ? 'bg-violet-50/60 dark:bg-violet-950/30 ring-2 ring-violet-500/30 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-violet-600/10 text-violet-500 rounded-xl">
                              <Bell className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-900 dark:text-white">
                                In-App Alerts
                              </div>
                              <span className="text-[10px] text-slate-400 font-semibold">
                                Notification Bell Center
                              </span>
                            </div>
                          </div>
                          <div
                            className={`w-9 h-5 rounded-full transition-colors flex items-center p-0.5 ${
                              notifConfig.enable_in_app ? 'bg-violet-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                            }`}
                          >
                            <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2.5 leading-relaxed">
                          Posts real-time notification alerts directly to the dashboard header for targeted users.
                        </p>
                      </div>
                    </div>
                  </div>

                {/* Card 2: Alert Timing & Triggers Card */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-violet-600/10 text-violet-500">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          Alert Timing & Triggers
                        </h3>
                        <p className="text-xs text-slate-400">
                          Schedule automated liability alerts
                        </p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Advance Due-Soon Notice (Days)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="30"
                          value={notifConfig.notify_due_soon_days}
                          onChange={(e) =>
                            setNotifConfig((prev) => ({
                              ...prev,
                              notify_due_soon_days: Math.max(1, Math.min(30, parseInt(e.target.value) || 1)),
                            }))
                          }
                          className="w-24 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none"
                        />
                        <span className="text-xs text-slate-500 dark:text-slate-400">days in advance</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={notifConfig.notify_overdue}
                          onChange={(e) =>
                            setNotifConfig((prev) => ({ ...prev, notify_overdue: e.target.checked }))
                          }
                          className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 border-slate-300 dark:border-slate-700"
                        />
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          Overdue Liability Reminders
                        </span>
                      </label>
                      <p className="text-[11px] text-slate-400 mt-1 ml-6.5">
                        Send reminders when an installment or invoice passes its due date.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card 3: Audience Targeting Card */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-violet-600/10 text-violet-500">
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            Audience Targeting
                          </h3>
                          <p className="text-xs text-slate-400">
                            Specify which roles and users receive alerts
                          </p>
                        </div>
                      </div>
                      {recipientPreview && (
                        <span className="px-2.5 py-0.5 rounded-full bg-violet-600/10 text-violet-600 dark:text-violet-400 text-[11px] font-bold">
                          {recipientPreview.count} Users
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Audience Strategy:
                      </label>
                      <select
                        value={notifConfig.audience_type}
                        onChange={(e) =>
                          setNotifConfig((prev) => ({
                            ...prev,
                            audience_type: e.target.value as any,
                          }))
                        }
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none"
                      >
                        <option value="all_users">All Active Users</option>
                        <option value="specific_roles">Specific Roles Only</option>
                        <option value="all_except_roles">All Users Except Roles</option>
                        <option value="all_except_users">All Users Except Specific Users</option>
                        <option value="selected_users_and_roles">Specific Roles & Specific Users</option>
                        <option value="selected_roles_except_users">Specific Roles Except Excluded Users</option>
                      </select>
                    </div>

                    {/* Roles Selector */}
                    {(notifConfig.audience_type === 'specific_roles' ||
                      notifConfig.audience_type === 'selected_users_and_roles' ||
                      notifConfig.audience_type === 'selected_roles_except_users') && (
                      <div className="p-3.5 rounded-2xl bg-slate-50/60 dark:bg-slate-800/40 space-y-2">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          Allowed Roles:
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {availableRoles.map((role) => {
                            const isSelected = notifConfig.selected_role_ids?.includes(role.id);
                            return (
                              <button
                                type="button"
                                key={role.id}
                                onClick={() => toggleRoleSelection(role.id, 'selected_role_ids')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-violet-600 text-white shadow-xs'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                              >
                                {role.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Excluded Roles */}
                    {notifConfig.audience_type === 'all_except_roles' && (
                      <div className="p-3.5 rounded-2xl bg-slate-50/60 dark:bg-slate-800/40 space-y-2">
                        <label className="block text-xs font-bold text-rose-600 dark:text-rose-400">
                          Exclude Roles:
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {availableRoles.map((role) => {
                            const isExcluded = notifConfig.excluded_role_ids?.includes(role.id);
                            return (
                              <button
                                type="button"
                                key={role.id}
                                onClick={() => toggleRoleSelection(role.id, 'excluded_role_ids')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                  isExcluded
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                              >
                                {role.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Users Selector */}
                    {notifConfig.audience_type === 'selected_users_and_roles' && (
                      <div className="p-3.5 rounded-2xl bg-slate-50/60 dark:bg-slate-800/40 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                            Additional Users:
                          </label>
                          <input
                            type="text"
                            placeholder="Search..."
                            value={userSearchQuery}
                            onChange={(e) => setUserSearchQuery(e.target.value)}
                            className="px-2 py-0.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none w-24"
                          />
                        </div>
                        <div className="max-h-36 overflow-y-auto space-y-1 divide-y divide-slate-100 dark:divide-slate-800">
                          {availableUsers
                            .filter(
                              (u) =>
                                !userSearchQuery ||
                                u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                                u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
                            )
                            .map((u) => {
                              const isSelected = notifConfig.selected_user_ids?.includes(u.id);
                              return (
                                <label
                                  key={u.id}
                                  className="flex items-center justify-between p-1.5 rounded hover:bg-slate-100/50 dark:hover:bg-slate-800/50 cursor-pointer text-xs"
                                >
                                  <div>
                                    <div className="font-semibold text-slate-800 dark:text-slate-200">{u.name}</div>
                                    <div className="text-[10px] text-slate-400">{u.email}</div>
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleUserSelection(u.id, 'selected_user_ids')}
                                    className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500"
                                  />
                                </label>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* Excluded Users */}
                    {(notifConfig.audience_type === 'all_except_users' ||
                      notifConfig.audience_type === 'selected_roles_except_users') && (
                      <div className="p-3.5 rounded-2xl bg-slate-50/60 dark:bg-slate-800/40 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-rose-600 dark:text-rose-400">
                            Exclude Users:
                          </label>
                          <input
                            type="text"
                            placeholder="Search..."
                            value={userSearchQuery}
                            onChange={(e) => setUserSearchQuery(e.target.value)}
                            className="px-2 py-0.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none w-24"
                          />
                        </div>
                        <div className="max-h-36 overflow-y-auto space-y-1 divide-y divide-slate-100 dark:divide-slate-800">
                          {availableUsers
                            .filter(
                              (u) =>
                                !userSearchQuery ||
                                u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                                u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
                            )
                            .map((u) => {
                              const isExcluded = notifConfig.excluded_user_ids?.includes(u.id);
                              return (
                                <label
                                  key={u.id}
                                  className="flex items-center justify-between p-1.5 rounded hover:bg-slate-100/50 dark:hover:bg-slate-800/50 cursor-pointer text-xs"
                                >
                                  <div>
                                    <div className="font-semibold text-slate-800 dark:text-slate-200">{u.name}</div>
                                    <div className="text-[10px] text-slate-400">{u.email}</div>
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={isExcluded}
                                    onChange={() => toggleUserSelection(u.id, 'excluded_user_ids')}
                                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                                  />
                                </label>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* Recipient Preview Drawer */}
                    <div className="p-3.5 rounded-2xl bg-slate-50/60 dark:bg-slate-800/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-violet-500" />
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            Active Recipients
                          </span>
                          {loadingPreview && (
                            <RefreshCw className="w-3 h-3 animate-spin text-violet-500" />
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowRecipientsList(!showRecipientsList)}
                          className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
                        >
                          {showRecipientsList ? 'Hide List' : 'View List'}
                        </button>
                      </div>

                      {showRecipientsList && recipientPreview && (
                        <div className="mt-3 pt-2 max-h-40 overflow-y-auto space-y-1.5">
                          {recipientPreview.recipients.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">No recipients match current rules.</p>
                          ) : (
                            recipientPreview.recipients.map((rec) => (
                              <div
                                key={rec.id}
                                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-xs shadow-xs"
                              >
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{rec.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{rec.email}</span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Save Action */}
                  <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleSaveNotificationConfig}
                        disabled={settingsSaving || settingsLoading}
                        className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-violet-600/25 transition-all cursor-pointer"
                      >
                        {settingsSaving ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Saving Changes...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Save All Settings</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
          )}
        </div>
      ) : activeTab === 'recycle-bin' ? (
        <div key="recycle-bin" className="space-y-6 animate-float-in">
          {/* Header Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Recycle Bin Vault</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-mono font-bold">
                    {recycleBinCount} Item{recycleBinCount === 1 ? '' : 's'}
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Soft-deleted liabilities, historical installment cycles, and payment receipts.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={fetchRecycleBin}
                disabled={recycleBinLoading}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${recycleBinLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>

              <button
                type="button"
                onClick={() => setShowEmptyBinModal(true)}
                disabled={recycleBinCount === 0 || recycleBinLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Empty Recycle Bin</span>
              </button>
            </div>
          </div>

          {/* 14-Day Auto-Purge Policy Alert Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
              <Clock className="w-4 h-4" />
            </div>
            <div className="text-xs space-y-1">
              <span className="font-bold text-amber-900 dark:text-amber-200 block">
                14-Day Automated Retention Policy
              </span>
              <p className="text-amber-700 dark:text-amber-300 leading-relaxed">
                Items moved to the Recycle Bin are safely held for <strong>14 days</strong> before being permanently purged from both the database and encrypted storage. You can restore records to active status or delete them permanently at any time.
              </p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { key: 'all', label: 'All Items', count: recycleBinCount },
              { key: 'payables', label: 'Payables & Services', count: recycleBinData.payables.length },
              { key: 'documents', label: 'Receipts & Proofs', count: recycleBinData.documents.length },
              { key: 'installments', label: 'Historical Records', count: recycleBinData.installments.length },
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setRecycleBinFilter(f.key as any)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  recycleBinFilter === f.key
                    ? 'bg-violet-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{f.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] ${
                  recycleBinFilter === f.key
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>

          {/* Items List */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm overflow-hidden">
            {recycleBinLoading ? (
              <div className="p-8 text-center space-y-3">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-violet-500" />
                <p className="text-xs text-slate-400">Loading recycle bin...</p>
              </div>
            ) : (() => {
              const allItems = [
                ...recycleBinData.payables,
                ...recycleBinData.documents,
                ...recycleBinData.installments,
              ].sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime());

              const itemsToDisplay = recycleBinFilter === 'all'
                ? allItems
                : recycleBinFilter === 'payables'
                ? recycleBinData.payables
                : recycleBinFilter === 'documents'
                ? recycleBinData.documents
                : recycleBinData.installments;

              if (itemsToDisplay.length === 0) {
                return (
                  <div className="p-12 text-center text-slate-400 space-y-2">
                    <Trash2 className="w-8 h-8 mx-auto opacity-30 text-slate-400" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Recycle Bin is empty</p>
                    <p className="text-xs text-slate-400">
                      {recycleBinFilter === 'all'
                        ? 'No deleted liabilities, receipts, or installments found.'
                        : `No deleted ${recycleBinFilter} found.`}
                    </p>
                  </div>
                );
              }

              return (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {itemsToDisplay.map((item) => {
                    const isPayable = item.item_type === 'payable';
                    const isDoc = item.item_type === 'document';
                    const isInst = item.item_type === 'installment';

                    const itemTitle = isPayable
                      ? item.title
                      : isDoc
                      ? item.original_filename
                      : `Installment #${item.installment_number}`;

                    const itemSubtitle = isPayable
                      ? `Vendor: ${item.vendor_name || 'N/A'} • Category: ${item.category || 'General'}`
                      : isDoc
                      ? `Linked to: ${item.payable?.title || 'Unknown Payable'} (${item.payable?.vendor_name || 'Vendor'})`
                      : `Linked to: ${item.payable?.title || 'Unknown Payable'} • Status: ${item.status}`;

                    const typeBadgeLabel = isPayable
                      ? item.type?.toUpperCase()
                      : isDoc
                      ? `RECEIPT / ${item.document_type?.toUpperCase()}`
                      : 'HISTORICAL RECORD';

                    return (
                      <div
                        key={`${item.item_type}-${item.id}`}
                        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div className={`p-2.5 rounded-2xl shrink-0 mt-0.5 ${
                            isPayable
                              ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                              : isDoc
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          }`}>
                            {isPayable ? (
                              <CreditCard className="w-4 h-4" />
                            ) : isDoc ? (
                              <Receipt className="w-4 h-4" />
                            ) : (
                              <FileClock className="w-4 h-4" />
                            )}
                          </div>

                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-white text-xs truncate">
                                {itemTitle}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {typeBadgeLabel}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-400 truncate">
                              {itemSubtitle}
                            </p>

                            <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap pt-0.5">
                              <span>Deleted: {item.deleted_at ? new Date(item.deleted_at).toLocaleString() : 'Recently'}</span>
                              {isPayable && item.total_amount && (
                                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                  Amount: {formatCurrency(item.total_amount, item.currency)}
                                </span>
                              )}
                              {isInst && item.total_due && (
                                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                  Due: {item.total_due}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                          {/* Days remaining badge */}
                          <div className="shrink-0">
                            {item.days_remaining > 3 ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{item.days_remaining} day{item.days_remaining === 1 ? '' : 's'} remaining</span>
                              </span>
                            ) : item.days_remaining > 0 ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Purge in {item.days_remaining} day{item.days_remaining === 1 ? '' : 's'}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-rose-600 text-white animate-pulse">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Purge pending</span>
                              </span>
                            )}
                          </div>

                          {/* Restore Button */}
                          <button
                            type="button"
                            onClick={() => setRestoreTarget(item)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-violet-600/10 text-violet-600 dark:text-violet-400 hover:bg-violet-600 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                            title="Restore back to active records"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restore</span>
                          </button>

                          {/* Force Delete Button */}
                          <button
                            type="button"
                            onClick={() => setForceDeleteTarget(item)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs font-semibold transition-all cursor-pointer"
                            title="Permanently delete item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Permanently</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      ) : (
        <div key={`tab-${activeTab}`} className="space-y-4 animate-float-in">
          {/* Quick Calendar Teaser Card on Overview */}
          {activeTab === 'overview' && (
            <div className="p-4 bg-gradient-to-r from-violet-500/10 via-indigo-500/5 to-transparent rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-violet-600 text-white shadow-md shadow-violet-600/20">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Payment Schedule Calendar</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 font-mono font-semibold">
                      {calendarEvents.length} Record{calendarEvents.length === 1 ? '' : 's'} this Month
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Interactive calendar with upcoming, passed due, and settled payment dates highlighted.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('calendar')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer shrink-0"
              >
                <Calendar className="w-4 h-4" />
                <span>Open Payment Calendar</span>
              </button>
            </div>
          )}

          {/* Table Section */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>
              {activeTab === 'overview'
                ? 'Recent Entries'
                : activeTab === 'invoices'
                ? 'Invoice Schedules'
                : activeTab === 'subscriptions'
                ? 'Active Subscriptions'
                : 'Loan Contracts & Amortizations'}
            </span>
          </h2>
          <span className="text-xs text-slate-400">
            {displayItems.length} record{displayItems.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Title & Vendor</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Interval / Due Date</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading || filterLoading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={`skel-row-${i}`}>
                    <td className="px-4 py-3.5">
                      <div className="h-4 w-36 rounded skeleton-wave" />
                      <div className="h-2.5 w-24 rounded skeleton-wave mt-1.5" />
                    </td>
                    <td className="px-4 py-3.5"><div className="h-4 w-20 rounded skeleton-wave" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 w-28 rounded skeleton-wave" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 w-20 rounded skeleton-wave" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 w-16 rounded skeleton-wave" /></td>
                    <td className="px-4 py-3.5 text-right"><div className="h-7 w-20 rounded-xl skeleton-wave ml-auto" /></td>
                  </tr>
                ))
              ) : displayItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="font-semibold text-sm">No payables recorded yet</p>
                    <p className="text-xs mt-1">Click "New Payable" to add an invoice, subscription, or loan.</p>
                  </td>
                </tr>
              ) : (
                displayItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> {item.vendor_name}
                        </span>
                        <span>•</span>
                        <span>{item.category}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      {typeBadge(item)}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-700 dark:text-slate-300">
                        {item.type === 'loan' && item.loan_type === 'single_time' ? (
                          <span className="flex items-center gap-1 text-violet-600 dark:text-violet-400 font-semibold">
                            <Calendar className="w-3 h-3" /> Target: {item.target_due_date || item.start_date || 'N/A'}
                          </span>
                        ) : item.interval_count ? (
                          <span className="capitalize">
                            Every {item.interval_count} {item.interval_unit}
                          </span>
                        ) : item.frequency ? (
                          <span className="capitalize">{item.frequency}</span>
                        ) : (
                          <span>{item.start_date || 'N/A'}</span>
                        )}
                      </div>
                      {item.end_date && (
                        <div className="text-[10px] text-slate-400 mt-0.5">Until {item.end_date}</div>
                      )}
                    </td>

                    <td className="px-4 py-3.5 font-mono">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {formatCurrency(item.total_amount, item.currency)}
                      </div>
                      {parseFloat(String(item.amount_paid || 0)) > 0 && (
                        <div className="text-[10px] text-emerald-500 font-semibold">
                          Paid: {formatCurrency(item.amount_paid, item.currency)}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      {statusBadge(item.status)}
                    </td>

                    <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                      {/* Payment URL Link (Opens in New Tab) */}
                      {item.payment_url && (
                        <a
                          href={item.payment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-600/10 text-violet-600 dark:text-violet-400 hover:bg-violet-600 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                          title="Open Payment Gateway in new tab"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Pay Online</span>
                        </a>
                      )}
                      {!item.payment_url && item.payment_urls && item.payment_urls.length > 0 && (
                        <a
                          href={item.payment_urls[0].url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-600/10 text-violet-600 dark:text-violet-400 hover:bg-violet-600 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                          title={item.payment_urls[0].label || 'Open Payment Link'}
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Pay Online</span>
                        </a>
                      )}

                      {/* View History & Receipts Button */}
                      <button
                        type="button"
                        onClick={() => openHistoryModal(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                        title="View Historical Records & Receipts Vault"
                      >
                        <FileClock className="w-3 h-3" />
                        <span>History & Receipts</span>
                      </button>

                      {item.status !== 'paid' && item.status !== 'cancelled' && (
                        <button
                          onClick={() => {
                            setPayTargetItem(item);
                            setPayProofFile(null);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                        >
                          Mark Paid
                        </button>
                      )}

                      {item.status !== 'cancelled' && (item.type === 'subscription' || item.is_recurring) && (
                        <button
                          onClick={() => setCancelTargetItem(item)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs font-semibold transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}

                      {/* Move to Recycle Bin Button */}
                      <button
                        type="button"
                        onClick={() => setDeletePayableTarget(item)}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs transition-all cursor-pointer"
                        title="Move to Recycle Bin (held for 14 days)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )}
    </div>
  )}

      {/* Modal: Mark Paid & Upload Proof Document */}
      {(payTargetItem || payTargetInstallment) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Settle Payment with Proof</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Mandatory document upload required</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPayTargetItem(null);
                  setPayTargetInstallment(null);
                }}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleMarkPaid} className="space-y-4 pt-4">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-xs space-y-1">
                <div className="font-bold text-slate-900 dark:text-white">
                  {payTargetInstallment ? payTargetInstallment.payable.title : payTargetItem?.title}
                </div>
                <div className="text-slate-400">
                  {payTargetInstallment ? payTargetInstallment.payable.vendor_name : payTargetItem?.vendor_name}
                </div>
                <div className="text-sm font-mono font-bold text-violet-600 dark:text-violet-400 pt-1">
                  Amount: {formatCurrency(
                    payTargetInstallment ? payTargetInstallment.total_due : payTargetItem?.total_amount || 0,
                    payTargetInstallment ? payTargetInstallment.payable.currency : payTargetItem?.currency
                  )}
                </div>
              </div>

              {/* Quick Online Payment Link if available */}
              {((payTargetInstallment?.payable?.payment_url) || (payTargetItem?.payment_url)) && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-violet-500/10 text-xs">
                  <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300">
                    <ExternalLink className="w-4 h-4 text-violet-500 shrink-0" />
                    <div>
                      <span className="font-bold block">Need to settle online first?</span>
                      <span className="text-[10px] opacity-80">Open vendor checkout in new tab</span>
                    </div>
                  </div>
                  <a
                    href={(payTargetInstallment?.payable?.payment_url || payTargetItem?.payment_url) as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition-all shadow-xs shrink-0 cursor-pointer"
                  >
                    <span>Pay Online</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* Strict Verification Policy Notice */}
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-500/10 text-xs text-amber-800 dark:text-amber-200">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                <div>
                  <p className="font-bold">Manual Verification Enforced</p>
                  <p className="text-[11px] opacity-85 mt-0.5">
                    Strict Policy: All Invoices, Subscriptions, and Loans strictly require official proof (receipt or bank slip). Settlements cannot be confirmed without valid document proof.
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Document Type *
                </label>
                <select
                  value={payDocType}
                  onChange={(e) => setPayDocType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                >
                  <option value="receipt">Payment Receipt</option>
                  <option value="bank_slip">Bank Deposit Slip</option>
                  <option value="transfer_confirmation">Wire / Transfer Confirmation</option>
                  <option value="other">Other Official Proof</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Upload Payment Proof Document *
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                  onChange={(e) => setPayProofFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 dark:file:bg-violet-950 dark:file:text-violet-300 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400 mt-1">Supported: PDF, PNG, JPG, WebP, DOCX (Max 20MB)</p>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setPayTargetItem(null);
                    setPayTargetInstallment(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPaying || !payProofFile}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/25 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isPaying ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying & Settling...</span>
                    </>
                  ) : (
                    <span>Confirm & Mark Paid</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Interactive Day Payment Inspector */}
      {showDayModal && selectedDayDateString && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full max-h-[88vh] overflow-y-auto shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-violet-600 text-white shadow-md shadow-violet-600/25">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {formatFullDate(selectedDayDateString)}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedDayEvents.length} payment record{selectedDayEvents.length === 1 ? '' : 's'} on this date
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDayModal(false);
                  setSelectedDayDateString(null);
                  setSelectedDayEvents([]);
                }}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Daily Summary Ribbon */}
            {selectedDayEvents.length > 0 && (
              <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-500">Day Total Due:</span>
                <span className="font-mono text-base font-black text-violet-600 dark:text-violet-400">
                  {formatCurrency(
                    selectedDayEvents.reduce((acc, e) => acc + (e.total_due || 0), 0),
                    selectedDayEvents[0]?.payable?.currency || 'USD'
                  )}
                </span>
              </div>
            )}

            {/* Items List */}
            <div className="mt-4 space-y-3">
              {selectedDayEvents.length === 0 ? (
                <div className="py-8 text-center space-y-3">
                  <p className="text-xs text-slate-400 italic">No payments due or recorded on this date.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDayModal(false);
                      openCreatePage(selectedDayDateString);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold cursor-pointer shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Payable for this Date</span>
                  </button>
                </div>
              ) : (
                selectedDayEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white">
                          {ev.payable?.title}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                          <span className="font-semibold">{ev.payable?.vendor_name}</span>
                          {ev.payable?.reference_no && (
                            <>
                              <span>•</span>
                              <span className="font-mono">Ref: {ev.payable.reference_no}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Status pill */}
                      {ev.status === 'paid' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Paid & Settled
                        </span>
                      ) : ev.status === 'overdue' || ev.timing === 'passed' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-500">
                          <AlertTriangle className="w-3.5 h-3.5" /> Passed & Overdue
                        </span>
                      ) : ev.status === 'due_soon' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500">
                          <Clock className="w-3.5 h-3.5" /> Due Soon
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-violet-500/10 text-violet-500">
                          <Clock className="w-3.5 h-3.5" /> Scheduled
                        </span>
                      )}
                    </div>

                    {/* Financial details grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-xl bg-white dark:bg-slate-900/60 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Total Due</span>
                        <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                          {formatCurrency(ev.total_due, ev.payable?.currency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Base Amount</span>
                        <span className="font-mono text-slate-600 dark:text-slate-300">
                          {formatCurrency(ev.base_amount, ev.payable?.currency)}
                        </span>
                      </div>
                      {ev.penalty_amount > 0 && (
                        <div>
                          <span className="text-[10px] text-rose-500 block font-semibold">Accrued Penalty</span>
                          <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                            +{formatCurrency(ev.penalty_amount, ev.payable?.currency)}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-[10px] text-slate-400 block">Category</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {ev.payable?.category || 'General'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Installment #</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          #{ev.installment_number}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Timing</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {ev.is_today
                            ? 'Due Today'
                            : ev.is_passed
                            ? `${Math.abs(ev.days_diff)} days ago`
                            : `In ${ev.days_diff} days`}
                        </span>
                      </div>
                    </div>

                    {/* Proof Document (if paid) */}
                    {ev.status === 'paid' && ev.proof_document && (
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/5 text-xs">
                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                          <ShieldCheck className="w-4 h-4" />
                          <span className="font-semibold">{ev.proof_document.file_name}</span>
                        </div>
                        <a
                          href={`/api/v1/payables-debt/documents/${ev.proof_document.id}/stream`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 underline"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Proof</span>
                        </a>
                      </div>
                    )}

                    {/* Action: Mark as Paid */}
                    {ev.status !== 'paid' && ev.status !== 'cancelled' && (
                      <div className="pt-1 flex items-center justify-end gap-2 flex-wrap">
                        {ev.payable?.payment_url && (
                          <a
                            href={ev.payable.payment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600/10 hover:bg-violet-600/20 text-violet-700 dark:text-violet-300 text-xs font-semibold transition-all cursor-pointer"
                            title="Open Payment Gateway in new tab"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-violet-500" />
                            <span>Pay Online</span>
                          </a>
                        )}
                        {!ev.payable?.payment_url && ev.payable?.payment_urls && ev.payable.payment_urls.length > 0 && (
                          <a
                            href={ev.payable.payment_urls[0].url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600/10 hover:bg-violet-600/20 text-violet-700 dark:text-violet-300 text-xs font-semibold transition-all cursor-pointer"
                            title={ev.payable.payment_urls[0].label || 'Open Payment Link'}
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-violet-500" />
                            <span>{ev.payable.payment_urls[0].label || 'Pay Online'}</span>
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setShowDayModal(false);
                            setPayTargetInstallment(ev);
                            setPayTargetItem(null);
                            setPayProofFile(null);
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span>Mark as Paid & Upload Proof</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowDayModal(false);
                  setSelectedDayDateString(null);
                  setSelectedDayEvents([]);
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Service Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!cancelTargetItem}
        title="Cancel Service / Recurring Liability"
        message={`Are you sure you want to cancel '${cancelTargetItem?.title}'? Historical records and receipts will remain preserved.`}
        confirmText="Yes, Cancel"
        cancelText="Keep Active"
        variant="warning"
        loading={isCancelling}
        onConfirm={handleConfirmCancel}
        onCancel={() => {
          if (!isCancelling) setCancelTargetItem(null);
        }}
      />

      {/* Modal: History & Receipts Vault */}
      {showHistoryModal && historyTargetItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full shadow-2xl p-6 max-h-[90vh] flex flex-col space-y-5 animate-in zoom-in-95 duration-150 border border-slate-200/80 dark:border-slate-800/80">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-1">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                  <FolderArchive className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {historyTargetItem.title}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {historyTargetItem.type.toUpperCase()}
                    </span>
                    {statusBadge(historyTargetItem.status)}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Vendor: <strong className="text-slate-600 dark:text-slate-300">{historyTargetItem.vendor_name}</strong> • Category: {historyTargetItem.category}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowHistoryModal(false);
                  setHistoryTargetItem(null);
                  setReplaceTargetDoc(null);
                }}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Stat Pill Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-xs">
              <div>
                <span className="text-[11px] text-slate-400 block">Total Liability</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {formatCurrency(historyTargetItem.total_amount, historyTargetItem.currency)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Amount Settled</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(historyTargetItem.amount_paid, historyTargetItem.currency)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Outstanding</span>
                <span className="font-mono font-bold text-rose-500">
                  {formatCurrency(historyTargetItem.outstanding_balance ?? 0, historyTargetItem.currency)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Vault Proofs</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {historyDocuments.length} document{historyDocuments.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            {/* Modal Subtabs */}
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <button
                type="button"
                onClick={() => setHistoryActiveTab('documents')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  historyActiveTab === 'documents'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Receipts Vault ({historyDocuments.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setHistoryActiveTab('installments')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  historyActiveTab === 'installments'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <FileClock className="w-3.5 h-3.5" />
                <span>Historical Billing Cycles ({historyInstallments.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setHistoryActiveTab('upload')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  historyActiveTab === 'upload'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>+ Upload New Receipt</span>
              </button>
            </div>

            {/* Subtab Content Area */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-[220px]">
              {historyLoading ? (
                <div className="p-8 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-500" />
                  <p className="text-xs text-slate-400">Loading vault records...</p>
                </div>
              ) : historyActiveTab === 'documents' ? (
                historyDocuments.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 space-y-2">
                    <Receipt className="w-8 h-8 mx-auto opacity-30 text-indigo-500" />
                    <p className="font-semibold text-xs text-slate-700 dark:text-slate-300">No documents or receipts stored yet</p>
                    <p className="text-[11px]">Click "+ Upload New Receipt" to attach receipts or transfer slips.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {historyDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                              <Receipt className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-xs text-slate-900 dark:text-white block truncate" title={doc.original_filename}>
                                {doc.original_filename}
                              </span>
                              <span className="text-[10px] text-slate-400 block truncate font-mono">
                                {doc.stored_filename}
                              </span>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-violet-500/10 text-violet-600 dark:text-violet-400 shrink-0">
                            {doc.document_type.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-700/50">
                          <span>
                            {doc.file_size ? (doc.file_size > 1048576 ? (doc.file_size / 1048576).toFixed(1) + ' MB' : Math.round(doc.file_size / 1024) + ' KB') : '0 KB'}
                          </span>
                          <span>{doc.created_at ? new Date(doc.created_at).toLocaleDateString() : ''}</span>
                        </div>

                        {/* Document Actions */}
                        <div className="flex items-center justify-end gap-2 pt-1">
                          {/* View / Stream Document */}
                          <button
                            type="button"
                            onClick={() => handleStreamDocument(doc)}
                            disabled={streamingDocId === doc.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600/10 hover:bg-violet-600 hover:text-white text-violet-600 dark:text-violet-400 text-xs font-semibold transition-all cursor-pointer"
                          >
                            {streamingDocId === doc.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                            <span>View / Download</span>
                          </button>

                          {/* Change Upload / Replace */}
                          <button
                            type="button"
                            onClick={() => {
                              setReplaceTargetDoc(doc);
                              setReplaceDocType(doc.document_type);
                              setReplaceFile(null);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200/70 dark:bg-slate-700/70 hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer"
                            title="Upload a revised file to replace this receipt"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Change Upload</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                /* Upload New Receipt Form */
                <form onSubmit={handleUploadNewDocument} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 space-y-4 max-w-lg mx-auto">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Upload className="w-4 h-4 text-indigo-500" />
                      <span>Upload Proof / Receipt to Vault</span>
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Upload and preserve tax invoices, wire transfers, or physical receipt slips.
                    </p>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                      Document Type
                    </label>
                    <select
                      value={newUploadDocType}
                      onChange={(e) => setNewUploadDocType(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                    >
                      <option value="receipt">Payment Receipt</option>
                      <option value="bank_slip">Bank Slip / Deposit Slip</option>
                      <option value="transfer_confirmation">Transfer Confirmation</option>
                      <option value="other">Other Supporting Document</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                      Select File (PDF, PNG, JPG, WEBP, DOCX)
                    </label>
                    <input
                      type="file"
                      required
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                      onChange={(e) => setNewUploadFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 file:cursor-pointer cursor-pointer"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={isUploadingNewDoc || !newUploadFile}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                    >
                      {isUploadingNewDoc ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload & Vault</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Payment verification slips are locked to validate settlements. Use "Change Upload" to revise or replace slips.
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowHistoryModal(false);
                  setHistoryTargetItem(null);
                  setReplaceTargetDoc(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Change Upload / Replace Receipt Dialog */}
      {replaceTargetDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl p-6 space-y-4 border border-slate-200/80 dark:border-slate-800/80 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Change / Replace Upload</h3>
                  <p className="text-[11px] text-slate-400">Replace vaulted receipt with a revised file</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReplaceTargetDoc(null);
                  setReplaceFile(null);
                }}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-xs space-y-1">
              <span className="text-[11px] text-slate-400 block">Current File:</span>
              <span className="font-bold text-slate-900 dark:text-white block truncate">
                {replaceTargetDoc.original_filename}
              </span>
            </div>

            <form onSubmit={handleReplaceDocument} className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Document Type
                </label>
                <select
                  value={replaceDocType}
                  onChange={(e) => setReplaceDocType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                >
                  <option value="receipt">Payment Receipt</option>
                  <option value="bank_slip">Bank Slip / Deposit Slip</option>
                  <option value="transfer_confirmation">Transfer Confirmation</option>
                  <option value="other">Other Supporting Document</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Choose New Replacement File
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                  onChange={(e) => setReplaceFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-violet-600 file:text-white hover:file:bg-violet-500 file:cursor-pointer cursor-pointer"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setReplaceTargetDoc(null);
                    setReplaceFile(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReplacingDoc || !replaceFile}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  {isReplacingDoc ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Replacing...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm Replacement</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm: Delete Payable to Recycle Bin */}
      <ConfirmDialog
        isOpen={!!deletePayableTarget}
        title="Move to Recycle Bin"
        message={`Are you sure you want to move '${deletePayableTarget?.title}' to the Recycle Bin? It will be safely held for 14 days before being permanently deleted.`}
        confirmText="Move to Recycle Bin"
        cancelText="Cancel"
        variant="danger"
        loading={isDeletingPayable}
        onConfirm={handleDeletePayable}
        onCancel={() => {
          if (!isDeletingPayable) setDeletePayableTarget(null);
        }}
      />

      {/* Confirm: Clear Installment to Recycle Bin */}
      <ConfirmDialog
        isOpen={!!deleteInstallmentTarget}
        title="Clear Installment Record"
        message={`Move Installment #${deleteInstallmentTarget?.installment_number} to the Recycle Bin? Historical records will be preserved for 14 days.`}
        confirmText="Clear Record"
        cancelText="Cancel"
        variant="danger"
        loading={isDeletingInstallment}
        onConfirm={handleDeleteInstallment}
        onCancel={() => {
          if (!isDeletingInstallment) setDeleteInstallmentTarget(null);
        }}
      />

      {/* Confirm: Restore Item */}
      <ConfirmDialog
        isOpen={!!restoreTarget}
        title="Restore from Recycle Bin"
        message={`Restore '${restoreTarget?.title || restoreTarget?.original_filename || `Installment #${restoreTarget?.installment_number}`}' back to active status?`}
        confirmText="Restore Record"
        cancelText="Cancel"
        variant="primary"
        loading={isRestoring}
        onConfirm={() => restoreTarget && handleRestoreFromBin(restoreTarget.item_type, restoreTarget.id)}
        onCancel={() => {
          if (!isRestoring) setRestoreTarget(null);
        }}
      />

      {/* Confirm: Permanent Delete */}
      <ConfirmDialog
        isOpen={!!forceDeleteTarget}
        title="Permanently Delete Record"
        message={`This will permanently wipe '${forceDeleteTarget?.title || forceDeleteTarget?.original_filename || `Installment #${forceDeleteTarget?.installment_number}`}' and delete any files from encrypted vault storage. This action cannot be undone.`}
        confirmText="Delete Permanently"
        cancelText="Keep in Bin"
        variant="danger"
        loading={isForceDeleting}
        onConfirm={() => forceDeleteTarget && handleForceDeleteFromBin(forceDeleteTarget.item_type, forceDeleteTarget.id)}
        onCancel={() => {
          if (!isForceDeleting) setForceDeleteTarget(null);
        }}
      />

      {/* Confirm: Empty Recycle Bin */}
      <ConfirmDialog
        isOpen={showEmptyBinModal}
        title="Empty Entire Recycle Bin"
        message="Are you sure you want to permanently delete all liabilities, installment records, and receipts currently in the Recycle Bin? All associated vault files will be destroyed. This cannot be undone."
        confirmText="Empty Recycle Bin"
        cancelText="Cancel"
        variant="danger"
        loading={isEmptyingBin}
        onConfirm={handleEmptyRecycleBin}
        onCancel={() => {
          if (!isEmptyingBin) setShowEmptyBinModal(false);
        }}
      />
    </div>
  );
};

export default PayablesDebtPage;
