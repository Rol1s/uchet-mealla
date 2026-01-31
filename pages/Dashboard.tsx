import React, { useState, useEffect, useMemo } from 'react';
import { Movement, WorkLog, Position } from '../types';
import { getMovements, getWorkLogs, getPositions } from '../services/supabase';
import { Package, ArrowDownLeft, ArrowUpRight, Coins, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const Dashboard: React.FC = () => {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        setLoading(true);
        const [movementsData, workLogsData, positionsData] = await Promise.all([
          getMovements(),
          getWorkLogs(),
          getPositions(),
        ]);
        if (isMounted) {
          setMovements(movementsData);
          setWorkLogs(workLogsData);
          setPositions(positionsData);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, []);

  const stats = useMemo(() => {
    const totalIncome = movements
      .filter((m) => m.operation === 'income')
      .reduce((acc, curr) => acc + curr.weight, 0);

    const totalExpense = movements
      .filter((m) => m.operation === 'expense')
      .reduce((acc, curr) => acc + curr.weight, 0);

    const currentStock = positions.reduce((acc, p) => acc + p.balance, 0);

    const totalWorkValue = workLogs.reduce((acc, curr) => acc + curr.total_price, 0);

    return { totalIncome, totalExpense, currentStock, totalWorkValue };
  }, [movements, workLogs, positions]);

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
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Package size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Текущий остаток</p>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-800">{stats.currentStock.toFixed(3)} т</h3>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <ArrowDownLeft size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Всего приход</p>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-800">{stats.totalIncome.toFixed(3)} т</h3>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-lg">
            <ArrowUpRight size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Всего расход</p>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-800">{stats.totalExpense.toFixed(3)} т</h3>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <Coins size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Сумма работ</p>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-800">
              {stats.totalWorkValue.toLocaleString('ru-RU')} ₽
            </h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-100 h-72 sm:h-96 min-h-[260px] sm:min-h-[280px]">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Остатки по материалам (тонны)</h3>
          {materialDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%" minHeight={280}>
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
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">
              Нет данных для отображения
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 sm:p-8 text-white flex flex-col justify-center">
          <h3 className="text-xl sm:text-2xl font-bold mb-2">Добро пожаловать в MetalTrack</h3>
          <div className="text-slate-300 mb-6">
            <p className="mb-2">Используйте меню слева для навигации.</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>
                Вкладка <strong>"Движение"</strong> для учета прихода/расхода.
              </li>
              <li>
                Вкладка <strong>"Остатки"</strong> формируется автоматически.
              </li>
              <li>
                Вкладка <strong>"Тарифы"</strong> для настройки цен на работы.
              </li>
              <li>
                Вкладки <strong>"Компании"</strong> и <strong>"Материалы"</strong> — справочники.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
