import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Movement, Position, Expense } from '../types';
import { getMovements, getPositions, getExpenses } from '../services/supabase';
import { Package, ArrowDownLeft, ArrowUpRight, TrendingUp, Loader2, ShoppingCart, Truck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DashboardCache {
  movements: Movement[];
  positions: Position[];
  expenses: Expense[];
  fetchedAt: number;
}

/** Модульный кэш — живёт пока жива вкладка, сбрасывается через 60 сек */
const CACHE_TTL_MS = 60_000;
let dashboardCache: DashboardCache | null = null;

const Dashboard: React.FC = () => {
  const cached = dashboardCache && Date.now() - dashboardCache.fetchedAt < CACHE_TTL_MS ? dashboardCache : null;

  const [movements, setMovements] = useState<Movement[]>(cached?.movements ?? []);
  const [positions, setPositions] = useState<Position[]>(cached?.positions ?? []);
  const [expenses, setExpenses] = useState<Expense[]>(cached?.expenses ?? []);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    const fresh = dashboardCache && Date.now() - dashboardCache.fetchedAt < CACHE_TTL_MS;
    if (fresh && retryCount === 0) return;

    let isMounted = true;
    isFetchingRef.current = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [movementsData, positionsData, expensesData] = await Promise.all([
          getMovements(),
          getPositions(),
          getExpenses(),
        ]);
        if (isMounted) {
          dashboardCache = { movements: movementsData, positions: positionsData, expenses: expensesData, fetchedAt: Date.now() };
          setMovements(movementsData);
          setPositions(positionsData);
          setExpenses(expensesData);
        }
      } catch (err) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Ошибка загрузки данных';
          const isNetwork = /timeout|network|failed to fetch|ERR_/i.test(msg);
          setError(isNetwork ? 'Не удалось загрузить данные. Проверьте подключение к интернету.' : msg);
        }
      } finally {
        if (isMounted) { setLoading(false); isFetchingRef.current = false; }
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [retryCount]);

  const stats = useMemo(() => {
    const totalIncome = movements
      .filter((m) => m.operation === 'income')
      .reduce((acc, curr) => acc + curr.weight, 0);

    const totalExpense = movements
      .filter((m) => m.operation === 'expense')
      .reduce((acc, curr) => acc + curr.weight, 0);

    const currentStock = positions.reduce((acc, p) => acc + p.balance, 0);

    const totalPurchasesValue = movements
      .filter((m) => m.operation === 'income')
      .reduce((acc, m) => acc + (m.total_value || 0), 0);

    const totalSalesValue = movements
      .filter((m) => m.operation === 'expense')
      .reduce((acc, m) => acc + (m.total_value || 0), 0);

    const totalExpensesValue = expenses.reduce((acc, e) => acc + e.amount, 0);

    const profit = totalSalesValue - totalPurchasesValue - totalExpensesValue;

    return { totalIncome, totalExpense, currentStock, totalPurchasesValue, totalSalesValue, totalExpensesValue, profit };
  }, [movements, expenses, positions]);

  // Data for chart - group by material
  const materialDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    positions.forEach((p) => {
      const materialName = p.material?.name || 'Неизвестный';
      dist[materialName] = (dist[materialName] || 0) + p.balance;
    });

    return Object.keys(dist)
      .map((key) => ({
        name: key,
        value: parseFloat(dist[key].toFixed(2)),
      }))
      .filter((i) => i.value > 0);
  }, [positions]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[320px] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" aria-hidden />
        <p className="text-slate-500 text-sm">Загрузка данных…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 max-w-md">
        <p className="text-amber-800 font-medium mb-2">Не удалось загрузить данные</p>
        <p className="text-amber-700 text-sm mb-4">{error}</p>
        <p className="text-slate-600 text-sm mb-4">Если интернет нестабильный — подождите и нажмите «Повторить» или обновите страницу (F5).</p>
        <button
          type="button"
          onClick={() => setRetryCount((c) => c + 1)}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium"
        >
          Повторить
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Weight stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Package size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Остаток на складе</p>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-800">{stats.currentStock.toFixed(3)} т</h3>
          </div>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <ArrowDownLeft size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Приход (вес)</p>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-800">{stats.totalIncome.toFixed(3)} т</h3>
          </div>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-lg">
            <ArrowUpRight size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Расход (вес)</p>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-800">{stats.totalExpense.toFixed(3)} т</h3>
          </div>
        </div>
      </div>

      {/* Financial stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <ShoppingCart size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Закупки</p>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-800">
              {stats.totalPurchasesValue.toLocaleString('ru-RU')} ₽
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
              {stats.totalSalesValue.toLocaleString('ru-RU')} ₽
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
              {stats.totalExpensesValue.toLocaleString('ru-RU')} ₽
            </h3>
          </div>
        </div>
        <div className={`p-4 sm:p-6 rounded-xl shadow-sm border flex items-center gap-4 ${
          stats.profit >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
        }`}>
          <div className={`p-3 rounded-lg ${
            stats.profit >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
          }`}>
            <TrendingUp size={24} />
          </div>
          <div>
            <p className={`text-sm font-medium ${stats.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              Прибыль
            </p>
            <h3 className={`text-xl sm:text-2xl font-bold ${stats.profit >= 0 ? 'text-emerald-800' : 'text-red-800'}`}>
              {stats.profit.toLocaleString('ru-RU')} ₽
            </h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Остатки по материалам (тонны)</h3>
          {materialDistribution.length > 0 ? (
            <div className="w-full" style={{ minHeight: 280 }}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={materialDistribution}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  cursor={{ fill: '#f1f5f9' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {materialDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">
              Нет данных для отображения
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 sm:p-8 text-white flex flex-col justify-center">
          <h3 className="text-xl sm:text-2xl font-bold mb-2">MetalTrack Pro</h3>
          <div className="text-slate-300 mb-6">
            <p className="mb-2">Используйте меню слева для навигации.</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li><strong>"Движение"</strong> — учет прихода/расхода металла с ценами</li>
              <li><strong>"Остатки"</strong> — автоматический остаток на складе</li>
              <li><strong>"Расходы"</strong> — транспорт, погрузка, обработка, аренда</li>
              <li><strong>"Деньги"</strong> — финансовая сводка и прибыль по компаниям</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
