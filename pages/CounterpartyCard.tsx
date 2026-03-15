import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Company, Expense, Movement } from '../types';
import { getCompanies, getExpensesByCompany, getMovementsByCompany } from '../services/supabase';
import { Loader2, ArrowLeft, CreditCard, Banknote, Package, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import DateFilter, { DateRange } from '../components/DateFilter';
import { CATEGORY_LABELS } from '../constants/finance';

const CounterpartyCard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({ dateFrom: null, dateTo: null });

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const [companies, expensesData, movementsData] = await Promise.all([
          getCompanies(false),
          getExpensesByCompany(id),
          getMovementsByCompany(id),
        ]);
        if (!isMounted) return;
        setCompany(companies.find(c => c.id === id) || null);
        setExpenses(expensesData);
        setMovements(movementsData);
        setError(null);
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : 'Ошибка загрузки');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [id]);

  const filterExpensesByDate = (items: Expense[]): Expense[] => {
    if (!dateRange.dateFrom && !dateRange.dateTo) return items;
    return items.filter(item => {
      if (dateRange.dateFrom && item.expense_date < dateRange.dateFrom) return false;
      if (dateRange.dateTo && item.expense_date > dateRange.dateTo) return false;
      return true;
    });
  };

  const filterMovementsByDate = (items: Movement[]): Movement[] => {
    if (!dateRange.dateFrom && !dateRange.dateTo) return items;
    return items.filter(item => {
      if (dateRange.dateFrom && item.movement_date < dateRange.dateFrom) return false;
      if (dateRange.dateTo && item.movement_date > dateRange.dateTo) return false;
      return true;
    });
  };

  const cashlessExpenses = useMemo(() => filterExpensesByDate(expenses.filter(e => e.payment_method === 'cashless')), [expenses, dateRange]);
  const cashExpenses = useMemo(() => filterExpensesByDate(expenses.filter(e => e.payment_method === 'cash')), [expenses, dateRange]);
  const filteredMovements = useMemo(() => filterMovementsByDate(movements), [movements, dateRange]);

  const calcBalance = (items: Expense[]) => {
    const income = items.filter(e => e.operation_type === 'income').reduce((s, e) => s + e.amount, 0);
    const expense = items.filter(e => e.operation_type === 'expense' || !e.operation_type).reduce((s, e) => s + e.amount, 0);
    return { income, expense, balance: income - expense };
  };

  const cashlessBalance = useMemo(() => calcBalance(cashlessExpenses), [cashlessExpenses]);
  const cashBalance = useMemo(() => calcBalance(cashExpenses), [cashExpenses]);

  const metalBalance = useMemo(() => {
    const supplied = filteredMovements.filter(m => m.supplier_id === id).reduce((s, m) => s + m.weight, 0);
    const bought = filteredMovements.filter(m => m.buyer_id === id).reduce((s, m) => s + m.weight, 0);
    return { supplied, bought, balance: supplied - bought };
  }, [filteredMovements, id]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  if (!company) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Компания не найдена</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-blue-600 hover:underline">Назад</button>
      </div>
    );
  }

  const COMPANY_TYPES: Record<string, string> = { supplier: 'Поставщик', buyer: 'Покупатель', both: 'Поставщик и покупатель' };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center">
          <ArrowLeft size={22} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{company.name}</h2>
          <p className="text-slate-500 text-sm">{COMPANY_TYPES[company.type] || company.type}</p>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      <DateFilter value={dateRange} onChange={setDateRange} />

      {/* Cashless block */}
      <FinanceBlock
        title="Безнал"
        icon={<CreditCard size={20} className="text-blue-600" />}
        balance={cashlessBalance}
        items={cashlessExpenses}
        accentColor="blue"
      />

      {/* Cash block */}
      <FinanceBlock
        title="Наличные"
        icon={<Banknote size={20} className="text-green-600" />}
        balance={cashBalance}
        items={cashExpenses}
        accentColor="green"
      />

      {/* Metal movements block */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
          <Package size={20} className="text-slate-600" />
          <h3 className="font-bold text-slate-800">Движения металла</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <div className="text-xs text-green-700 font-medium">Поставки</div>
              <div className="text-lg font-bold text-green-800">{metalBalance.supplied.toFixed(2)} т</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
              <div className="text-xs text-red-700 font-medium">Покупки</div>
              <div className="text-lg font-bold text-red-800">{metalBalance.bought.toFixed(2)} т</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
              <div className="text-xs text-slate-600 font-medium">Баланс</div>
              <div className={`text-lg font-bold ${metalBalance.balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {metalBalance.balance >= 0 ? '+' : ''}{metalBalance.balance.toFixed(2)} т
              </div>
            </div>
          </div>

          {filteredMovements.length === 0 ? (
            <p className="text-center text-slate-400 py-4">Нет движений</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2">Дата</th>
                    <th className="px-3 py-2">Тип</th>
                    <th className="px-3 py-2">Материал</th>
                    <th className="px-3 py-2">Размер</th>
                    <th className="px-3 py-2 text-right">Вес</th>
                    <th className="px-3 py-2 text-right">Сумма</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMovements.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2">{new Date(m.movement_date).toLocaleDateString('ru-RU')}</td>
                      <td className="px-3 py-2">
                        {m.supplier_id === id ? <span className="badge badge-green">Поставка</span> : <span className="badge badge-red">Покупка</span>}
                      </td>
                      <td className="px-3 py-2">{m.position?.material?.name || '—'}</td>
                      <td className="px-3 py-2">{m.position?.size || '—'}</td>
                      <td className="px-3 py-2 text-right font-medium">{m.weight} т</td>
                      <td className="px-3 py-2 text-right">{(m.total_value || 0).toLocaleString('ru-RU')} ₽</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface FinanceBlockProps {
  title: string;
  icon: React.ReactNode;
  balance: { income: number; expense: number; balance: number };
  items: Expense[];
  accentColor: 'blue' | 'green';
}

const FinanceBlock: React.FC<FinanceBlockProps> = ({ title, icon, balance, items, accentColor }) => {
  const borderColor = accentColor === 'blue' ? 'border-blue-200' : 'border-green-200';
  const headerBg = accentColor === 'blue' ? 'bg-blue-50' : 'bg-green-50';

  return (
    <div className={`bg-white rounded-xl shadow-sm border ${borderColor} overflow-hidden`}>
      <div className={`px-4 py-3 ${headerBg} border-b ${borderColor} flex items-center gap-2`}>
        {icon}
        <h3 className="font-bold text-slate-800">{title}</h3>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
            <div className="text-xs text-green-700 font-medium">Приход</div>
            <div className="text-lg font-bold text-green-800">{balance.income.toLocaleString('ru-RU')} ₽</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
            <div className="text-xs text-red-700 font-medium">Расход</div>
            <div className="text-lg font-bold text-red-800">{balance.expense.toLocaleString('ru-RU')} ₽</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-600 font-medium">Сальдо</div>
            <div className={`text-lg font-bold ${balance.balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {balance.balance >= 0 ? '+' : ''}{balance.balance.toLocaleString('ru-RU')} ₽
            </div>
          </div>
        </div>

        {items.length === 0 ? (
          <p className="text-center text-slate-400 py-4">Нет операций</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2">Дата</th>
                  <th className="px-3 py-2">Тип</th>
                  <th className="px-3 py-2">Категория</th>
                  <th className="px-3 py-2">Описание</th>
                  <th className="px-3 py-2 text-right">Сумма</th>
                  <th className="px-3 py-2">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2">{new Date(e.expense_date).toLocaleDateString('ru-RU')}</td>
                    <td className="px-3 py-2">
                      {e.operation_type === 'income'
                        ? <span className="flex items-center gap-1 text-green-700"><ArrowDownCircle size={14} /> Приход</span>
                        : <span className="flex items-center gap-1 text-red-700"><ArrowUpCircle size={14} /> Расход</span>}
                    </td>
                    <td className="px-3 py-2">{CATEGORY_LABELS[e.category]}</td>
                    <td className="px-3 py-2 max-w-[200px] truncate" title={e.description}>{e.description}</td>
                    <td className={`px-3 py-2 text-right font-bold ${e.operation_type === 'income' ? 'text-green-700' : 'text-red-700'}`}>
                      {e.operation_type === 'income' ? '+' : '-'}{e.amount.toLocaleString('ru-RU')} ₽
                    </td>
                    <td className="px-3 py-2">
                      <span className={`badge ${e.payment_status === 'paid' ? 'badge-green' : 'badge-orange'}`}>
                        {e.payment_status === 'paid' ? 'Опл' : 'Нет'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CounterpartyCard;
