import React, { useState, useEffect, useMemo } from 'react';
import { Movement, Expense, Position } from '../types';
import { getMovements, getExpenses, getPositions } from '../services/supabase';
import { Banknote, TrendingUp, TrendingDown, ShoppingCart, Truck, Loader2, ArrowDownLeft, ArrowUpRight, LayoutDashboard } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CATEGORY_LABELS: Record<string, string> = {
  transport: 'Транспорт',
  loading: 'Погрузка/Разгрузка',
  processing: 'Обработка',
  rent_salary: 'Аренда/Зарплата',
  other: 'Прочее',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Нал',
  cashless: 'Безнал',
};

type Tab = 'summary' | 'income' | 'expense';

const OWN_COMPANY_NAME = 'НИКАМЕТ';

const Money: React.FC = () => {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('summary');

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        setLoading(true);
        const [movData, expData, posData] = await Promise.all([
          getMovements(),
          getExpenses(),
          getPositions(),
        ]);
        if (isMounted) {
          setMovements(movData);
          setExpenses(expData);
          setPositions(posData);
          setError(null);
        }
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : 'Ошибка загрузки');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, []);

  const financials = useMemo(() => {
    const totalPurchases = movements
      .filter((m) => m.operation === 'income')
      .reduce((acc, m) => acc + (m.total_value || 0), 0);

    const totalSales = movements
      .filter((m) => m.operation === 'expense')
      .reduce((acc, m) => acc + (m.total_value || 0), 0);

    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const expensesPaid = expenses
      .filter((e) => e.payment_status === 'paid')
      .reduce((acc, e) => acc + e.amount, 0);
    const expensesUnpaid = totalExpenses - expensesPaid;
    const profit = totalSales - totalPurchases - totalExpenses;

    return { totalPurchases, totalSales, totalExpenses, expensesPaid, expensesUnpaid, profit };
  }, [movements, expenses]);

  /** ПРИХОД: движения металла operation=income — платит поставщик, получает наша компания */
  const incomeRows = useMemo(() =>
    [...movements]
      .filter((m) => m.operation === 'income')
      .sort((a, b) => b.movement_date.localeCompare(a.movement_date))
      .map((m) => ({
        id: m.id,
        date: m.movement_date,
        amount: m.total_value || 0,
        paymentMethod: m.payment_method,
        payer: m.position?.company?.name || '—',
        receiver: OWN_COMPANY_NAME,
        note: [
          m.position?.material?.name,
          m.position?.size,
          m.note,
        ].filter(Boolean).join(', ') || '—',
      })),
    [movements]);

  /** РАСХОД: движения металла operation=expense (продажи) + расходы (expenses) */
  const expenseRows = useMemo(() => {
    const sales = movements
      .filter((m) => m.operation === 'expense')
      .map((m) => ({
        id: m.id,
        date: m.movement_date,
        amount: m.total_value || 0,
        paymentMethod: m.payment_method as string,
        payer: OWN_COMPANY_NAME,
        receiver: m.position?.company?.name || '—',
        note: [
          m.position?.material?.name,
          m.position?.size,
          m.note,
        ].filter(Boolean).join(', ') || '—',
        paymentStatus: null as string | null,
      }));

    const exps = expenses.map((e) => ({
      id: e.id,
      date: e.expense_date,
      amount: e.amount,
      paymentMethod: '—',
      payer: OWN_COMPANY_NAME,
      receiver: e.company?.name || e.description,
      note: [CATEGORY_LABELS[e.category] || e.category, e.note].filter(Boolean).join(' · '),
      paymentStatus: e.payment_status,
    }));

    return [...sales, ...exps].sort((a, b) => b.date.localeCompare(a.date));
  }, [movements, expenses]);

  const companyBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; purchases: number; sales: number; stockWeight: number; stockValue: number }>();

    movements.forEach((m) => {
      const companyName = m.position?.company?.name;
      const companyId = m.position?.company_id;
      if (!companyId || !companyName) return;
      if (!map.has(companyId)) map.set(companyId, { name: companyName, purchases: 0, sales: 0, stockWeight: 0, stockValue: 0 });
      const entry = map.get(companyId)!;
      if (m.operation === 'income') entry.purchases += m.total_value || 0;
      else entry.sales += m.total_value || 0;
    });

    positions.forEach((p) => {
      const companyId = p.company_id;
      const companyName = p.company?.name;
      if (!companyId || !companyName) return;
      if (!map.has(companyId)) map.set(companyId, { name: companyName, purchases: 0, sales: 0, stockWeight: 0, stockValue: 0 });
      map.get(companyId)!.stockWeight += p.balance;
    });

    const purchaseWeightByCompany = new Map<string, number>();
    movements.forEach((m) => {
      if (m.operation !== 'income') return;
      const cid = m.position?.company_id;
      if (!cid) return;
      purchaseWeightByCompany.set(cid, (purchaseWeightByCompany.get(cid) || 0) + m.weight);
    });

    map.forEach((entry, cid) => {
      const w = purchaseWeightByCompany.get(cid) || 0;
      if (w > 0 && entry.stockWeight > 0) entry.stockValue = entry.stockWeight * (entry.purchases / w);
    });

    return Array.from(map.values()).sort((a, b) => b.stockValue - a.stockValue || a.name.localeCompare(b.name));
  }, [movements, positions]);

  const expensesByCategory = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach((e) => map.set(e.category, (map.get(e.category) || 0) + e.amount));
    return Array.from(map.entries())
      .map(([category, amount]) => ({ name: CATEGORY_LABELS[category] || category, value: amount }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>;
  }

  const totalIncome = incomeRows.reduce((s, r) => s + r.amount, 0);
  const totalExpenseRows = expenseRows.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Banknote className="text-blue-600" />
          Деньги
        </h2>
        <p className="text-slate-500 text-sm">Финансовая сводка: закупки, продажи, расходы, прибыль</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {([
          { id: 'summary', label: 'Сводка', icon: <LayoutDashboard size={16} /> },
          { id: 'income', label: 'Приход', icon: <ArrowDownLeft size={16} /> },
          { id: 'expense', label: 'Расход', icon: <ArrowUpRight size={16} /> },
        ] as { id: Tab; label: string; icon: React.ReactNode }[]).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ===== СВОДКА ===== */}
      {tab === 'summary' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><ShoppingCart size={24} /></div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Закупки</p>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-800">{financials.totalPurchases.toLocaleString('ru-RU')} ₽</h3>
              </div>
            </div>
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-3 bg-green-50 text-green-600 rounded-lg"><TrendingUp size={24} /></div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Продажи</p>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-800">{financials.totalSales.toLocaleString('ru-RU')} ₽</h3>
              </div>
            </div>
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-3 bg-red-50 text-red-600 rounded-lg"><Truck size={24} /></div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Расходы</p>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-800">{financials.totalExpenses.toLocaleString('ru-RU')} ₽</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Оплачено: {financials.expensesPaid.toLocaleString('ru-RU')} ₽ · Не оплачено: {financials.expensesUnpaid.toLocaleString('ru-RU')} ₽
                </p>
              </div>
            </div>
            <div className={`p-4 sm:p-6 rounded-xl shadow-sm border flex items-center gap-4 ${financials.profit >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              <div className={`p-3 rounded-lg ${financials.profit >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                <TrendingDown size={24} />
              </div>
              <div>
                <p className={`text-sm font-medium ${financials.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Прибыль</p>
                <h3 className={`text-xl sm:text-2xl font-bold ${financials.profit >= 0 ? 'text-emerald-800' : 'text-red-800'}`}>
                  {financials.profit.toLocaleString('ru-RU')} ₽
                </h3>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-slate-100">
                <h3 className="text-lg font-semibold text-slate-800">По компаниям</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 sm:px-6 py-3">Компания</th>
                      <th className="px-4 sm:px-6 py-3 text-right">Закупки (₽)</th>
                      <th className="px-4 sm:px-6 py-3 text-right">Продажи (₽)</th>
                      <th className="px-4 sm:px-6 py-3 text-right">Остаток (т)</th>
                      <th className="px-4 sm:px-6 py-3 text-right">Стоимость (₽)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {companyBreakdown.length === 0 ? (
                      <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Нет данных</td></tr>
                    ) : companyBreakdown.map((row) => (
                      <tr key={row.name} className="hover:bg-slate-50">
                        <td className="px-4 sm:px-6 py-3 font-medium text-slate-700">{row.name}</td>
                        <td className="px-4 sm:px-6 py-3 text-right text-slate-600">{row.purchases ? row.purchases.toLocaleString('ru-RU') : '—'}</td>
                        <td className="px-4 sm:px-6 py-3 text-right text-slate-600">{row.sales ? row.sales.toLocaleString('ru-RU') : '—'}</td>
                        <td className="px-4 sm:px-6 py-3 text-right font-medium">{row.stockWeight > 0 ? row.stockWeight.toFixed(3) : '—'}</td>
                        <td className="px-4 sm:px-6 py-3 text-right font-bold text-slate-800">{row.stockValue > 0 ? row.stockValue.toLocaleString('ru-RU', { maximumFractionDigits: 0 }) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Расходы по категориям</h3>
              {expensesByCategory.length > 0 ? (
                <div className="w-full" style={{ minHeight: 280 }}>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={expensesByCategory} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} tickFormatter={(v: number) => v.toLocaleString('ru-RU')} />
                      <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} width={120} />
                      <Tooltip formatter={(value: number) => [`${value.toLocaleString('ru-RU')} ₽`, 'Сумма']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {expensesByCategory.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-400">Нет расходов</div>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 sm:p-8 text-white">
            <h3 className="text-xl font-bold mb-3">Как считается прибыль</h3>
            <div className="text-slate-300 space-y-2 text-sm">
              <p><strong className="text-white">Прибыль</strong> = Продажи − Закупки − Расходы</p>
              <p><strong className="text-green-400">Продажи:</strong> расходные движения металла × цена за тонну</p>
              <p><strong className="text-blue-400">Закупки:</strong> приходные движения металла × цена за тонну</p>
              <p><strong className="text-red-400">Расходы:</strong> транспорт + погрузка + обработка + аренда/зарплата + прочее</p>
            </div>
          </div>
        </>
      )}

      {/* ===== ПРИХОД ===== */}
      {tab === 'income' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Приход денег</h3>
              <p className="text-sm text-slate-500">Оплаты за проданный металл</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">Итого</p>
              <p className="text-xl font-bold text-green-700">+{totalIncome.toLocaleString('ru-RU')} ₽</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Дата</th>
                  <th className="px-4 py-3 text-right">Сумма</th>
                  <th className="px-4 py-3">Нал/Бн</th>
                  <th className="px-4 py-3">Плательщик</th>
                  <th className="px-4 py-3">Получатель</th>
                  <th className="px-4 py-3">Примечание</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {incomeRows.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">Нет данных</td></tr>
                ) : incomeRows.map((row) => (
                  <tr key={row.id} className="hover:bg-green-50">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{row.date}</td>
                    <td className="px-4 py-3 text-right font-semibold text-green-700 whitespace-nowrap">
                      +{row.amount.toLocaleString('ru-RU')} ₽
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        row.paymentMethod === 'cash'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {PAYMENT_METHOD_LABELS[row.paymentMethod] || row.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">{row.payer}</td>
                    <td className="px-4 py-3 text-slate-600">{row.receiver}</td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{row.note}</td>
                  </tr>
                ))}
              </tbody>
              {incomeRows.length > 0 && (
                <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 font-bold text-slate-700 text-right">
                      Итого: {totalIncome.toLocaleString('ru-RU')} ₽
                    </td>
                    <td colSpan={4} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ===== РАСХОД ===== */}
      {tab === 'expense' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Расход денег</h3>
              <p className="text-sm text-slate-500">Закупки металла и прочие расходы</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">Итого</p>
              <p className="text-xl font-bold text-red-700">−{totalExpenseRows.toLocaleString('ru-RU')} ₽</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Дата</th>
                  <th className="px-4 py-3 text-right">Сумма</th>
                  <th className="px-4 py-3">Нал/Бн</th>
                  <th className="px-4 py-3">Плательщик</th>
                  <th className="px-4 py-3">Получатель</th>
                  <th className="px-4 py-3">Примечание</th>
                  <th className="px-4 py-3">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenseRows.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">Нет данных</td></tr>
                ) : expenseRows.map((row) => (
                  <tr key={row.id} className="hover:bg-red-50">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{row.date}</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-700 whitespace-nowrap">
                      −{row.amount.toLocaleString('ru-RU')} ₽
                    </td>
                    <td className="px-4 py-3">
                      {row.paymentMethod === '—' ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          row.paymentMethod === 'cash'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {PAYMENT_METHOD_LABELS[row.paymentMethod] || row.paymentMethod}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.payer}</td>
                    <td className="px-4 py-3 font-medium text-slate-700">{row.receiver}</td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{row.note}</td>
                    <td className="px-4 py-3">
                      {row.paymentStatus === null ? (
                        <span className="text-slate-400 text-xs">—</span>
                      ) : row.paymentStatus === 'paid' ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Оплачено</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Не оплачено</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              {expenseRows.length > 0 && (
                <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 font-bold text-slate-700 text-right">
                      Итого: {totalExpenseRows.toLocaleString('ru-RU')} ₽
                    </td>
                    <td colSpan={5} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Money;
