import React, { useState, useCallback } from 'react';
import { Calendar } from 'lucide-react';

export interface DateRange {
  dateFrom: string | null;
  dateTo: string | null;
}

type QuickFilter = 'all' | 'today' | 'week' | 'month' | 'custom';

interface DateFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

const getToday = (): string => new Date().toISOString().split('T')[0];

const getWeekAgo = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().split('T')[0];
};

const getMonthAgo = (): string => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().split('T')[0];
};

const DateFilter: React.FC<DateFilterProps> = ({ value, onChange, className = '' }) => {
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(() => {
    if (!value.dateFrom && !value.dateTo) return 'all';
    return 'custom';
  });

  const handleQuickFilter = useCallback((filter: QuickFilter) => {
    setQuickFilter(filter);
    const today = getToday();
    
    switch (filter) {
      case 'all':
        onChange({ dateFrom: null, dateTo: null });
        break;
      case 'today':
        onChange({ dateFrom: today, dateTo: today });
        break;
      case 'week':
        onChange({ dateFrom: getWeekAgo(), dateTo: today });
        break;
      case 'month':
        onChange({ dateFrom: getMonthAgo(), dateTo: today });
        break;
      case 'custom':
        break;
    }
  }, [onChange]);

  const handleDateChange = useCallback((field: 'dateFrom' | 'dateTo', val: string) => {
    setQuickFilter('custom');
    onChange({ ...value, [field]: val || null });
  }, [onChange, value]);

  const buttonClass = (active: boolean) =>
    `px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
      active
        ? 'bg-blue-600 text-white'
        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
    }`;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1">
        <Calendar size={16} className="text-slate-400" />
      </div>
      
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => handleQuickFilter('all')}
          className={buttonClass(quickFilter === 'all')}
        >
          Всё
        </button>
        <button
          type="button"
          onClick={() => handleQuickFilter('today')}
          className={buttonClass(quickFilter === 'today')}
        >
          Сегодня
        </button>
        <button
          type="button"
          onClick={() => handleQuickFilter('week')}
          className={buttonClass(quickFilter === 'week')}
        >
          Неделя
        </button>
        <button
          type="button"
          onClick={() => handleQuickFilter('month')}
          className={buttonClass(quickFilter === 'month')}
        >
          Месяц
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={value.dateFrom || ''}
          onChange={(e) => handleDateChange('dateFrom', e.target.value)}
          className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="От"
        />
        <span className="text-slate-400 text-xs">—</span>
        <input
          type="date"
          value={value.dateTo || ''}
          onChange={(e) => handleDateChange('dateTo', e.target.value)}
          className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="До"
        />
      </div>
    </div>
  );
};

export default DateFilter;
