import React, { useEffect, useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  FileClock,
} from 'lucide-react';
import api from '../../services/api';

export type WidgetSize = 'small' | 'medium' | 'large' | '1/4' | '2/4' | '3/4' | '4/4' | '1/3' | '2/3' | '3/3';
export type WidgetDesign = string;

interface CalendarEventItem {
  id: number;
  payable_id: number;
  installment_number: number;
  due_date: string;
  total_due: number;
  status: 'scheduled' | 'due_soon' | 'overdue' | 'paid' | 'cancelled';
  timing: 'upcoming' | 'passed' | 'today';
  is_passed: boolean;
  is_today: boolean;
  days_diff: number;
  payable?: {
    id: number;
    title: string;
    type: 'invoice' | 'subscription' | 'loan';
    vendor_recipient?: string;
    currency: string;
    payment_url?: string;
  };
}

interface PayablesCalendarWidgetProps {
  title?: string;
  size?: WidgetSize;
  design?: string; // Optional/legacy prop ignored in favor of system default design
  interactive?: boolean;
  preview?: boolean;
  onNavigateToPayables?: () => void;
  className?: string;
  height?: '1/2-raw' | '2/2-raw' | '1/2' | '2/2';
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
];

const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_MINI = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export const PayablesCalendarWidget: React.FC<PayablesCalendarWidgetProps> = ({
  title = 'Liabilities & Payables Calendar',
  size = 'medium',
  interactive = true,
  preview = false,
  onNavigateToPayables,
  className = '',
  height = '2/2-raw',
}) => {
  const isHalfRow = height === '1/2-raw' || height === '1/2';
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  const normalizedSize: 'small' | 'medium' | 'large' = useMemo(() => {
    if (size === '1/4' || size === '1/3' || size === 'small') return 'small';
    if (size === '2/4' || size === '2/3' || size === 'medium') return 'medium';
    if (size === '3/4' || size === '4/4' || size === '3/3' || size === 'large') return 'large';
    return 'medium';
  }, [size]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-indexed

  useEffect(() => {
    fetchEvents();
  }, [year, month]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/payables-debt/calendar/events?year=${year}&month=${month}`);
      const data = res.data.data || [];
      if (preview && data.length === 0) {
        // Fallback demo dues for interactive preview
        const mStr = String(month).padStart(2, '0');
        setEvents([
          {
            id: 991,
            payable_id: 1,
            installment_number: 1,
            due_date: `${year}-${mStr}-05`,
            total_due: 450,
            status: 'paid',
            timing: 'passed',
            is_passed: true,
            is_today: false,
            days_diff: -10,
            payable: { id: 1, title: 'AWS Cloud Hosting', type: 'subscription', currency: 'USD' },
          },
          {
            id: 992,
            payable_id: 2,
            installment_number: 1,
            due_date: `${year}-${mStr}-15`,
            total_due: 1200,
            status: 'due_soon',
            timing: 'upcoming',
            is_passed: false,
            is_today: false,
            days_diff: 3,
            payable: { id: 2, title: 'Office Equipment Lease', type: 'invoice', currency: 'USD' },
          },
          {
            id: 993,
            payable_id: 3,
            installment_number: 2,
            due_date: `${year}-${mStr}-25`,
            total_due: 800,
            status: 'scheduled',
            timing: 'upcoming',
            is_passed: false,
            is_today: false,
            days_diff: 12,
            payable: { id: 3, title: 'Commercial Credit Facility', type: 'loan', currency: 'USD' },
          },
        ]);
      } else {
        setEvents(data);
      }
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentDate(new Date());
  };

  // Calendar calculations
  const { calendarDays, totalDueThisMonth, overdueCount, dueSoonCount } = useMemo(() => {
    const today = new Date();
    const todayY = today.getFullYear();
    const todayM = String(today.getMonth() + 1).padStart(2, '0');
    const todayD = String(today.getDate()).padStart(2, '0');
    const todayDateString = `${todayY}-${todayM}-${todayD}`;

    const firstDayIndex = new Date(year, month - 1, 1).getDay();
    const daysInCurrentMonth = new Date(year, month, 0).getDate();
    const daysInPrevMonth = new Date(year, month - 1, 0).getDate();

    const map: Record<string, CalendarEventItem[]> = {};
    let totalDue = 0;
    let overdue = 0;
    let dueSoon = 0;

    events.forEach((ev) => {
      const dStr = ev.due_date;
      if (!map[dStr]) map[dStr] = [];
      map[dStr].push(ev);

      if (ev.status !== 'paid' && ev.status !== 'cancelled') {
        totalDue += Number(ev.total_due || 0);
        if (ev.status === 'overdue') overdue++;
        if (ev.status === 'due_soon') dueSoon++;
      }
    });

    const days: Array<{
      dayNum: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      events: CalendarEventItem[];
    }> = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dNum = daysInPrevMonth - i;
      const prevM = month === 1 ? 12 : month - 1;
      const prevY = month === 1 ? year - 1 : year;
      const dStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
      days.push({
        dayNum: dNum,
        dateStr: dStr,
        isCurrentMonth: false,
        isToday: dStr === todayDateString,
        events: map[dStr] || [],
      });
    }

    // Current month days
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      const dStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        dayNum: i,
        dateStr: dStr,
        isCurrentMonth: true,
        isToday: dStr === todayDateString,
        events: map[dStr] || [],
      });
    }

    // Next month padding to fill rows of 7
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const nextM = month === 12 ? 1 : month + 1;
        const nextY = month === 12 ? year + 1 : year;
        const dStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        days.push({
          dayNum: i,
          dateStr: dStr,
          isCurrentMonth: false,
          isToday: dStr === todayDateString,
          events: map[dStr] || [],
        });
      }
    }

    return {
      calendarDays: days,
      totalDueThisMonth: totalDue,
      overdueCount: overdue,
      dueSoonCount: dueSoon,
    };
  }, [year, month, events]);

  // Upcoming items for agenda views
  const upcomingAgendaItems = useMemo(() => {
    return [...events]
      .filter((ev) => ev.status !== 'cancelled')
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
      .slice(0, 6);
  }, [events]);

  const handleNavigate = () => {
    if (preview) return;
    if (onNavigateToPayables) {
      onNavigateToPayables();
    } else {
      window.location.href = '/payables-debt';
    }
  };

  const renderStatusDot = (hasOverdue: boolean, hasDueSoon: boolean, hasPaid: boolean) => {
    if (hasOverdue) return <span className="w-1.5 h-1.5 rounded-full bg-rose-500 ring-1 ring-rose-400/40" />;
    if (hasDueSoon) return <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />;
    if (hasPaid) return <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />;
    return <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />;
  };

  if (isHalfRow) {
    return (
      <div
        className={`bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-sm flex flex-col justify-between min-h-[190px] h-full w-full transition-all ${className}`}
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-xl bg-violet-600/10 text-violet-600 dark:text-violet-400 shrink-0">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">{title}</h3>
          </div>
          <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">
            {MONTH_NAMES[month - 1]} {year}
          </span>
        </div>

        {/* Compact Upcoming summary */}
        <div className="py-2 space-y-1.5 overflow-hidden">
          {upcomingAgendaItems.length === 0 ? (
            <div className="text-center text-[11px] text-slate-400 py-2">
              No liabilities scheduled this month
            </div>
          ) : (
            upcomingAgendaItems.slice(0, 2).map((ev) => (
              <div key={ev.id} className="flex items-center justify-between text-xs py-0.5">
                <span className="truncate font-medium text-slate-700 dark:text-slate-300">
                  {ev.payable?.title || 'Payable'}
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-white shrink-0 ml-2">
                  ${Number(ev.total_due).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>

        {/* KPI footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px]">
          <span className="text-slate-400">Total: <strong className="font-mono text-violet-600 dark:text-violet-400">${totalDueThisMonth.toLocaleString()}</strong></span>
          <button
            type="button"
            onClick={handleNavigate}
            className="font-semibold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <span>View All</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // 1. SMALL SIZE VARIANT (1/3 Width in PC view)
  // Height matches 2/2-raw standard (~394px)
  // ==========================================
  if (normalizedSize === 'small') {
    return (
      <div
        className={`bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm flex flex-col justify-between min-h-[394px] h-full w-full transition-all ${className}`}
      >
        {/* Header: Title inside module card */}
        <div className="pb-3 space-y-2">
          {/* Top Title Bar */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-xl bg-violet-600/10 text-violet-600 dark:text-violet-400 shrink-0">
                <CalendarIcon className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate" title={title}>
                {title}
              </h3>
            </div>
            {events.length > 0 && (
              <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded-full shrink-0">
                {events.length} Dues
              </span>
            )}
          </div>

          {/* Month & Navigation Row */}
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {MONTH_NAMES[month - 1]} {year}
            </h4>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleToday}
                className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] font-semibold text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Days of Week Row (Mini) */}
        <div className="grid grid-cols-7 gap-1 text-center py-1.5">
          {WEEKDAYS_MINI.map((w, idx) => (
            <span key={idx} className="text-[10px] font-bold text-slate-400">
              {w}
            </span>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 text-center my-auto">
          {calendarDays.map((d, idx) => {
            const hasOverdue = d.events.some((e) => e.status === 'overdue');
            const hasDueSoon = d.events.some((e) => e.status === 'due_soon');
            const hasPaid = d.events.some((e) => e.status === 'paid');
            const hasEvents = d.events.length > 0;
            const isSelected = selectedDateStr === d.dateStr;

            return (
              <div
                key={idx}
                onClick={() => interactive && setSelectedDateStr(d.dateStr)}
                className={`h-8 sm:h-8.5 rounded-xl flex flex-col items-center justify-center relative cursor-pointer transition-all ${
                  isSelected
                    ? 'ring-2 ring-violet-500 bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 font-bold'
                    : d.isToday
                    ? 'bg-violet-600 text-white font-bold shadow-xs'
                    : d.isCurrentMonth
                    ? 'text-slate-800 dark:text-slate-200 hover:bg-violet-50 dark:hover:bg-violet-950/20'
                    : 'text-slate-300 dark:text-slate-600 opacity-40'
                }`}
              >
                <span className="text-xs">{d.dayNum}</span>
                {hasEvents && !d.isToday && (
                  <div className="absolute bottom-0.5 flex items-center gap-0.5">
                    {renderStatusDot(hasOverdue, hasDueSoon, hasPaid)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer KPI & Navigation */}
        <div className="pt-2.5 mt-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
              ${totalDueThisMonth.toLocaleString()} Due
            </span>
            {overdueCount > 0 && (
              <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded-full">
                {overdueCount} Overdue
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleNavigate}
            className="font-semibold text-xs text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <span>View</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. LARGE SIZE VARIANT (3/3 Full Width Dual-Pane Split)
  // ==========================================
  if (normalizedSize === 'large') {
    return (
      <div
        className={`bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm min-h-[394px] h-full transition-all ${className}`}
      >
        {/* Header Bar: Title inside module card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-violet-600/10 text-violet-600 dark:text-violet-400 shrink-0">
              <FileClock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                  {title}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-violet-500/10 text-violet-600 dark:text-violet-400 shrink-0">
                  {MONTH_NAMES[month - 1]} {year}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Upcoming invoices, recurring subscriptions, and loan amortizations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToday}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              Today
            </button>
            <div className="flex items-center gap-1 rounded-xl p-0.5 bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={handleNavigate}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <span>Manage Payables</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 2-Column Split: Calendar Grid on Left (7 cols), Agenda Stream on Right (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Calendar Grid */}
          <div className="lg:col-span-7 space-y-2">
            <div className="grid grid-cols-7 gap-1 text-center py-1">
              {WEEKDAYS_SHORT.map((w, idx) => (
                <span key={idx} className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {w}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {calendarDays.map((d, idx) => {
                const isSelected = selectedDateStr === d.dateStr;
                const hasOverdue = d.events.some((e) => e.status === 'overdue');
                const hasDueSoon = d.events.some((e) => e.status === 'due_soon');
                const hasPaid = d.events.some((e) => e.status === 'paid');
                const hasEvents = d.events.length > 0;

                return (
                  <div
                    key={idx}
                    onClick={() => interactive && setSelectedDateStr(d.dateStr)}
                    className={`min-h-[46px] p-1.5 rounded-xl flex flex-col justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-violet-500 bg-violet-500/15'
                        : d.isToday
                        ? 'bg-violet-500/10'
                        : d.isCurrentMonth
                        ? 'bg-slate-50 dark:bg-slate-800/50 hover:bg-violet-500/10'
                        : 'opacity-35'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{d.dayNum}</span>
                      {hasEvents && renderStatusDot(hasOverdue, hasDueSoon, hasPaid)}
                    </div>
                    {hasEvents && (
                      <span className="text-[10px] font-mono truncate font-semibold text-slate-600 dark:text-slate-400">
                        ${d.events.reduce((s, e) => s + Number(e.total_due || 0), 0).toLocaleString()}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Upcoming Agenda Stream */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Upcoming Dues Stream
                </span>
                <span className="text-[11px] text-slate-400">
                  {upcomingAgendaItems.length} Liabilities
                </span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {upcomingAgendaItems.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-center text-xs text-slate-400">
                    No upcoming liabilities scheduled.
                  </div>
                ) : (
                  upcomingAgendaItems.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
                          {ev.payable?.title || 'Payable'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Due: {ev.due_date} ({ev.payable?.type || 'invoice'})
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-slate-900 dark:text-white">
                          ${Number(ev.total_due).toLocaleString()}
                        </div>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                            ev.status === 'overdue'
                              ? 'bg-rose-500/10 text-rose-500'
                              : ev.status === 'due_soon'
                              ? 'bg-amber-500/10 text-amber-500'
                              : 'bg-emerald-500/10 text-emerald-500'
                          }`}
                        >
                          {ev.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* KPI Badges */}
            <div className="grid grid-cols-3 gap-2 pt-3">
              <div className="p-2.5 rounded-xl bg-violet-500/5 text-center">
                <span className="block text-[10px] font-bold text-slate-400">Total Due</span>
                <span className="text-xs font-bold text-violet-600 dark:text-violet-400 font-mono">
                  ${totalDueThisMonth.toLocaleString()}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/5 text-center">
                <span className="block text-[10px] font-bold text-slate-400">Due Soon</span>
                <span className="text-xs font-bold text-amber-500 font-mono">{dueSoonCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-500/5 text-center">
                <span className="block text-[10px] font-bold text-slate-400">Overdue</span>
                <span className="text-xs font-bold text-rose-500 font-mono">{overdueCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 3. MEDIUM SIZE VARIANT (2/3 Width in PC view)
  // Height matches 2/2-raw standard (~394px)
  // ==========================================
  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm flex flex-col justify-between min-h-[394px] h-full w-full transition-all ${className}`}
    >
      {/* Header: Title inside module card */}
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-violet-600/10 text-violet-600 dark:text-violet-400 shrink-0">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">
                {title}
              </h3>
              {loading && <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-ping shrink-0" />}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
              {MONTH_NAMES[month - 1]} {year} • {events.length} Dues Scheduled
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 hidden sm:inline">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button
            type="button"
            onClick={handleToday}
            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            Today
          </button>
          <div className="flex items-center gap-0.5 rounded-lg p-0.5 bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Weekdays Row (Full) */}
      <div className="grid grid-cols-7 gap-1 text-center py-1">
        {WEEKDAYS_SHORT.map((w, idx) => (
          <span key={idx} className="text-[11px] font-bold text-slate-400">
            {w}
          </span>
        ))}
      </div>

      {/* Calendar Grid (h-9 cell matching Small height) */}
      <div className="grid grid-cols-7 gap-1 text-center my-auto">
        {calendarDays.map((d, idx) => {
          const hasOverdue = d.events.some((e) => e.status === 'overdue');
          const hasDueSoon = d.events.some((e) => e.status === 'due_soon');
          const hasPaid = d.events.some((e) => e.status === 'paid');
          const hasEvents = d.events.length > 0;
          const isSelected = selectedDateStr === d.dateStr;

          return (
            <div
              key={idx}
              onClick={() => interactive && setSelectedDateStr(d.dateStr)}
              className={`h-9 rounded-xl flex flex-col items-center justify-center relative cursor-pointer transition-all ${
                isSelected
                  ? 'ring-2 ring-violet-500 bg-violet-500/15 font-bold text-violet-600 dark:text-violet-400'
                  : d.isToday
                  ? 'bg-violet-600 text-white font-bold shadow-xs'
                  : d.isCurrentMonth
                  ? 'text-slate-800 dark:text-slate-200 hover:bg-violet-50 dark:hover:bg-violet-950/20'
                  : 'text-slate-300 dark:text-slate-600 opacity-40'
              }`}
            >
              <span className="text-xs">{d.dayNum}</span>
              {hasEvents && !d.isToday && (
                <div className="flex items-center gap-0.5 mt-0.5">
                  {renderStatusDot(hasOverdue, hasDueSoon, hasPaid)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom KPI Bar & Navigation */}
      <div className="pt-3 mt-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
              ${totalDueThisMonth.toLocaleString()} Due
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {dueSoonCount} Due Soon
            </span>
          </div>
          {overdueCount > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="text-[11px] font-semibold text-rose-500">
                {overdueCount} Overdue
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleNavigate}
          className="font-semibold text-xs text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1 cursor-pointer"
        >
          <span>Open Payables</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default PayablesCalendarWidget;
