import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Trash2, HelpCircle } from 'lucide-react';

export type ConfirmVariant = 'danger' | 'warning' | 'default';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  onConfirm: () => void;
  onCancel: () => void;
}

const VARIANT_CONFIG: Record<ConfirmVariant, {
  icon: React.ReactNode;
  iconBg: string;
  confirmBtnClass: string;
}> = {
  danger: {
    icon: <Trash2 size={24} className="text-red-600" />,
    iconBg: 'bg-red-100',
    confirmBtnClass: 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white',
  },
  warning: {
    icon: <AlertTriangle size={24} className="text-amber-600" />,
    iconBg: 'bg-amber-100',
    confirmBtnClass: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 text-white',
  },
  default: {
    icon: <HelpCircle size={24} className="text-blue-600" />,
    iconBg: 'bg-blue-100',
    confirmBtnClass: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white',
  },
};

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  variant = 'default',
  onConfirm,
  onCancel,
}) => {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const config = VARIANT_CONFIG[variant];

  useEffect(() => {
    if (open) cancelBtnRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95">
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 w-10 h-10 rounded-full ${config.iconBg} flex items-center justify-center`}>
            {config.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-sm text-slate-600">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex gap-3 justify-end">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${config.confirmBtnClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
