import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
          confirmBtn: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20',
          Icon: Trash2,
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
          confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20',
          Icon: AlertTriangle,
        };
      case 'primary':
      default:
        return {
          iconBg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
          confirmBtn: 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-500/20',
          Icon: AlertTriangle,
        };
    }
  };

  const { iconBg, confirmBtn, Icon } = getVariantStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${iconBg} shrink-0`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">{title}</h3>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message */}
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-0.5">
          {message}
        </p>

        {/* Actions */}
        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer disabled:opacity-50 ${confirmBtn}`}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
