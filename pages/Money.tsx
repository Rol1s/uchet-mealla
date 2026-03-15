import React, { useState, useEffect, useMemo } from 'react';
import { Movement, Expense, Position } from '../types';
import { getMovements, getExpenses, getPositions } from '../services/supabase';
import { Banknote, TrendingUp, TrendingDown, ShoppingCart, Truck, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CATEGORY_LABELS: Record<string, string> = {
  transport: 'Транспорт',
  loading: 'Погрузка/Разгрузка',
  processing: 'Обработка',
  rent_salary: 'Аренда/Зарплата',
  other: 'Прочее',
};

const Money: React.FC = () => {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const companyBreakdown = useMemo(() => {
    const map = new Map<string, {
      name: string;
      purchases: number;
      sales: number;
      stockWeight: number;
      stockValue: number;
    }>();

    movements.forEach((m) => {
      const companyName = m.position?.company?.name;
      const companyId = m.position?.company_id;
      if (!companyId || !companyName) return;

      if (!map.has(companyId)) {
        map.set(companyId, { name: companyName, purchases: 0, sales: 0, stockWeight: 0, stockValue: 0 });
      }
      const entry = map.get(companyId)!;
      if (m.operation === 'income') {
        entry.purchases += m.total_value || 0;
      } else {
        entry.sales += m.total_value || 0;
      }
    });

    positions.forEach((p) => {
      const companyId = p.company_id;
      const companyName = p.company?.name;
      if (!companyId || !companyName) return;

      if (!map.has(companyId)) {
        map.set(companyId, { name: companyName, purchases: 0, sales: 0, stockWeight: 0, stockValue: 0 });
      }
      const entry = map.get(companyId)!;
      entry.stockWeight += p.balance;
    });

    // Estimate stock value: for each company, average purchase price * current balance
    // Simple heuristic: if purchases > 0 and stock > 0, avg price = purchases_value / total_purchased_weight
    movements.forEach((m) => {
      if (m.operation !== 'income') return;
      const companyId = m.position?.company_id;
      if (!companyId || !map.has(companyId)) return;
      // already accumulated purchases value above
    });

    // For stock value, compute avg price from income movements per company
    const purchaseWeightByCompany = new Map<string, number>();
    movements.forEach((m) => {
      if (m.operation !== 'income') return;
      const cid = m.position?.company_id;
      if (!cid) return;
      purchaseWeightByCompany.set(cid, (purchaseWeightByCompany.get(cid) || 0) + m.weight);
    });

    map.forEach((entry, cid) => {
      const totalPurchasedWeight = purchaseWeightByCompany.get(cid) || 0;
      if (totalPurchasedWeight > 0 && entry.stockWeight > 0) {
        const avgPrice = entry.purchases / totalPurchasedWeight;
        entry.stockValue = entry.stockWeight * avgPrice;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.stockValue - a.stockValue || a.name.localeCompare(b.name));
  }, [movements, positions]);

  const expensesByCategory = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach((e) => {
      map.set(e.category, (map.get(e.category) || 0) + e.amount);
    });
    return Array.from(map.entries())
      .map(([category, amount]) => ({
        name: CATEGORY_LABELS[category] || category,
        value: amount,
      }))
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
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Banknote className="text-blue-600" />
          Деньги
        </h2>
        <p className="text-slate-500 text-sm">Финансовая сводка: закупки, продажи, расходы, прибыль</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <ShoppingCart size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Закупки</p>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-800">
              {financials.totalPurchases.toLocaleString('ru-RU')} ₽
            </h3>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Продажи</p>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-800">
              {financials.totalSales.toLocaleString('ru-RU')} ₽
            </h3>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-lg">
            <Truck size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Расходы</p>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-800">
              {financials.totalExpenses.toLocaleString('ru-RU')} ₽
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Оплачено: {financials.expensesPaid.toLocaleString('ru-RU')} ₽ · Не оплачено: {financials.expensesUnpaid.toLocaleString('ru-RU')} ₽
            </p>
          </div>
        </div>

        <div className={`p-4 sm:p-6 rounded-xl shadow-sm border flex items-center gap-4 ${
          financials.profit >= 0
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <div className={`p-3 rounded-lg ${
            financials.profit >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
          }`}>
            <TrendingDown size={24} />
          </div>
          <div>
            <p className={`text-sm font-medium ${financials.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              Прибыль
            </p>
            <h3 className={`text-xl sm:text-2xl font-bold ${financials.profit >= 0 ? 'text-emerald-800' : 'text-red-800'}`}>
              {financials.profit.toLocaleString('ru-RU')} ₽
            </h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Company breakdown */}
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
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">Нет данных</td>
                  </tr>
                ) : (
                  companyBreakdown.map((row) => (
                    <tr key={row.name} className="hover:bg-slate-50">
                      <td className="px-4 sm:px-6 py-3 font-medium text-slate-700">{row.name}</td>
                      <td className="px-4 sm:px-6 py-3 text-right text-slate-600">
                        {row.purchases ? row.purchases.toLocaleString('ru-RU') : '—'}
                      </td>
                      <td className="px-4 sm:px-6 py-3 text-right text-slate-600">
                        {row.sales ? row.sales.toLocaleString('ru-RU') : '—'}
                      </td>
                      <td className="px-4 sm:px-6 py-3 text-right font-medium">
                        {row.stockWeight > 0 ? row.stockWeight.toFixed(3) : '—'}
                      </td>
                      <td className="px-4 sm:px-6 py-3 text-right font-bold text-slate-800">
                        {row.stockValue > 0 ? row.stockValue.toLocaleString('ru-RU', { maximumFractionDigits: 0 }) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expenses by category */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Расходы по категориям</h3>
          {expensesByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={expensesByCategory} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }}
                  tickFormatter={(v: number) => v.toLocaleString('ru-RU')} />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }} width={120} />
                <Tooltip
                  formatter={(value: number) => [`${value.toLocaleString('ru-RU')} ₽`, 'Сумма']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {expensesByCategory.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">Нет расходов</div>
          )}
        </div>
      </div>

      {/* Formula explanation */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 sm:p-8 text-white">
        <h3 className="text-xl font-bold mb-3">Как считается прибыль</h3>
        <div className="text-slate-300 space-y-2 text-sm">
          <p><strong className="text-white">Прибыль</strong> = Продажи − Закупки − Расходы</p>
          <p>
            <strong className="text-green-400">Продажи:</strong> сумма всех расходных движений (metal out) × цена за тонну
          </p>
          <p>
            <strong className="text-blue-400">Закупки:</strong> сумма всех приходных движений (metal in) × цена за тонну
          </p>
          <p>
            <strong className="text-red-400">Расходы:</strong> транспорт + погрузка + обработка + аренда/зарплата + прочее
          </p>
        </div>
      </div>
    </div>
  );
};

export default Money;
