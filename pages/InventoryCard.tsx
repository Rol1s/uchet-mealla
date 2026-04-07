import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Movement } from '../types';
import { getMovements } from '../services/supabase';
import { Loader2, ArrowLeft, Package, ArrowDownCircle, ArrowUpCircle, TrendingUp } from 'lucide-react';
import DateFilter, { DateRange } from '../components/DateFilter';

const InventoryCard: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const material = searchParams.get('material') || '';
  const size = searchParams.get('size') || '';
  const wallParam = searchParams.get('wall');
  const wallThickness = wallParam != null ? parseFloat(wallParam) : null;
  const company = searchParams.get('company') || '';

  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({ dateFrom: null, dateTo: null });

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const data = await getMovements();
        if (isMounted) { setMovements(data); setError(null); }
      } catch (err) { if (isMounted) setError(err instanceof Error ? err.message : 'Ошибка загрузки'); }
      finally { if (isMounted) setLoading(false); }
    };
    load();
    return () => { isMounted = false; };
  }, []);

  const positionMovements = useMemo(() => {
    return movements.filter(m => {
      if ((m.position?.material?.name || '') !== material) return false;
      if ((m.position?.size || '') !== size) return false;
      if ((m.position?.company?.name || '') !== company) return false;
      if (wallThickness != null) {
        if (m.wall_thickness !== wallThickness) return false;
      } else {
        if (m.wall_thickness != null) return false;
      }
      return true;
    });
  }, [movements, material, size, wallThickness, company]);

  const filtered = useMemo(() => {
    return positionMovements.filter(m => {
      if (dateRange.dateFrom && m.movement_date < dateRange.dateFrom) return false;
      if (dateRange.dateTo && m.movement_date > dateRange.dateTo) return false;
      return true;
    }).sort((a, b) => b.movement_date.localeCompare(a.movement_date));
  }, [positionMovements, dateRange]);

  const stats = useMemo(() => {
    const incomeW = filtered.filter(m => m.operation === 'income').reduce((s, m) => s + m.weight, 0);
    const expenseW = filtered.filter(m => m.operation === 'expense').reduce((s, m) => s + m.weight, 0);
    const incomeCost = filtered.filter(m => m.operation === 'income').reduce((s, m) => s + (m.total_value || 0), 0);
    const expenseRevenue = filtered.filter(m => m.operation === 'expense').reduce((s, m) => s + (m.total_value || 0), 0);
    const incomeQty = filtered.filter(m => m.operation === 'income').reduce((s, m) => s + (m.quantity || 0), 0);
    const expenseQty = filtered.filter(m => m.operation === 'expense').reduce((s, m) => s + (m.quantity || 0), 0);
    const balance = incomeW - expenseW;
    const avgBuyPrice = incomeW > 0 ? incomeCost / incomeW : 0;
    const avgSellPrice = expenseW > 0 ? expenseRevenue / expenseW : 0;
    const costOfGoodsSold = expenseW * avgBuyPrice;
    const margin = expenseRevenue - costOfGoodsSold;
    const marginPercent = costOfGoodsSold > 0 ? (margin / costOfGoodsSold) * 100 : 0;
    return { incomeW, expenseW, balance, incomeCost, expenseRevenue, incomeQty, expenseQty, avgBuyPrice, avgSellPrice, costOfGoodsSold, margin, marginPercent };
  }, [filtered]);

  const fmtNum = (n: number) => n.toLocaleString('ru-RU', { maximumFractionDigits: 0 });

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/inventory')} className="p-2 rounded-lg hover:bg-slate-100 transition-colors"><ArrowLeft size={20} className="text-slate-600" /></button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Package className="text-blue-600" /> {material} {size}{wallThickness != null ? `x${wallThickness}` : ''}</h2>
          <p className="text-slate-500 text-sm">{company}</p>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      <DateFilter value={dateRange} onChange={setDateRange} />

      {/* Balance cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-green-200 p-4">
          <div className="flex items-center gap-2 text-green-700 mb-1"><ArrowDownCircle size={18} /> <span className="text-sm font-medium">Приход</span></div>
          <p className="text-2xl font-bold text-green-700">{stats.incomeW.toFixed(3)} <span className="text-sm font-normal text-slate-500">т</span></p>
          {stats.incomeQty > 0 && <p className="text-sm text-slate-500">{stats.incomeQty} шт</p>}
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-4">
          <div className="flex items-center gap-2 text-red-600 mb-1"><ArrowUpCircle size={18} /> <span className="text-sm font-medium">Расход</span></div>
          <p className="text-2xl font-bold text-red-600">{stats.expenseW.toFixed(3)} <span className="text-sm font-normal text-slate-500">т</span></p>
          {stats.expenseQty > 0 && <p className="text-sm text-slate-500">{stats.expenseQty} шт</p>}
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-4 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 text-blue-700 mb-1"><Package size={18} /> <span className="text-sm font-medium">Остаток</span></div>
          <p className={`text-2xl font-bold ${stats.balance < 0 ? 'text-red-600' : 'text-slate-800'}`}>{stats.balance.toFixed(3)} <span className="text-sm font-normal text-slate-500">т</span></p>
        </div>
      </div>

      {/* Financial cards */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
          <TrendingUp size={18} className="text-slate-600" />
          <h3 className="font-semibold text-slate-800">Финансы</h3>
        </div>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
          <div>
            <p className="text-slate-500">Себестоимость закупа</p>
            <p className="font-bold text-slate-800">{fmtNum(stats.incomeCost)} ₽</p>
          </div>
          <div>
            <p className="text-slate-500">Ср. цена закупа</p>
            <p className="font-bold text-slate-800">{stats.avgBuyPrice > 0 ? fmtNum(stats.avgBuyPrice) : '—'} ₽/т</p>
          </div>
          <div>
            <p className="text-slate-500">Выручка от продаж</p>
            <p className="font-bold text-slate-800">{fmtNum(stats.expenseRevenue)} ₽</p>
          </div>
          <div>
            <p className="text-slate-500">Ср. цена продажи</p>
            <p className="font-bold text-slate-800">{stats.avgSellPrice > 0 ? fmtNum(stats.avgSellPrice) : '—'} ₽/т</p>
          </div>
          <div>
            <p className="text-slate-500">Маржа</p>
            <p className={`font-bold ${stats.margin >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmtNum(stats.margin)} ₽</p>
          </div>
          <div>
            <p className="text-slate-500">Рентабельность</p>
            <p className={`font-bold ${stats.marginPercent >= 0 ? 'text-green-700' : 'text-red-600'}`}>{stats.marginPercent > 0 ? stats.marginPercent.toFixed(1) : '—'}%</p>
          </div>
        </div>
      </div>

      {/* Movements table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800">Все движения ({filtered.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-3 py-2 text-left">Дата</th>
                <th className="px-3 py-2 text-left">Тип</th>
                <th className="px-3 py-2 text-right">Вес (т)</th>
                <th className="px-3 py-2 text-right">Шт</th>
                <th className="px-3 py-2 text-right">Цена/т</th>
                <th className="px-3 py-2 text-right">Сумма</th>
                <th className="px-3 py-2 text-left">Контрагент</th>
                <th className="px-3 py-2 text-left">Примечание</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-slate-400 py-8">Нет движений</td></tr>
              ) : filtered.map(m => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2">{new Date(m.movement_date).toLocaleDateString('ru-RU')}</td>
                  <td className="px-3 py-2"><span className={`badge ${m.operation === 'income' ? 'badge-green' : 'badge-red'}`}>{m.operation === 'income' ? 'Приход' : 'Расход'}</span></td>
                  <td className="px-3 py-2 text-right font-medium">{m.weight.toFixed(3)}</td>
                  <td className="px-3 py-2 text-right">{m.quantity || '—'}</td>
                  <td className="px-3 py-2 text-right">{m.price_per_ton ? fmtNum(m.price_per_ton) : '—'}</td>
                  <td className="px-3 py-2 text-right font-bold">{(m.total_value || 0) > 0 ? fmtNum(m.total_value || 0) : '—'}</td>
                  <td className="px-3 py-2 text-slate-600">{m.operation === 'income' ? m.supplier?.name : m.buyer?.name || '—'}</td>
                  <td className="px-3 py-2 text-slate-500 max-w-[200px] truncate">{m.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InventoryCard;
