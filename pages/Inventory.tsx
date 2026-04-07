import React, { useState, useEffect, useMemo } from 'react';
import { Movement, OwnershipType } from '../types';
import { getPositions, getMovements } from '../services/supabase';
import { Download, Layers, Users, Loader2, Package, FileSpreadsheet, ExternalLink } from 'lucide-react';
import { exportToXlsx, formatNumber } from '../utils/export';
import { useNavigate } from 'react-router-dom';

interface InventoryRow {
  id: string;
  company: string;
  material: string;
  size: string;
  wallThickness: number | null;
  ownership: OwnershipType;
  income: number;
  expense: number;
  balance: number;
  qty: number;
  totalCost: number;
  avgPrice: number;
  value: number;
}

const Inventory: React.FC = () => {
  const navigate = useNavigate();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGroupedByCompany, setIsGroupedByCompany] = useState(false);
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipType | 'all'>('all');

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        setLoading(true);
        const [, movData] = await Promise.all([getPositions(), getMovements()]);
        if (isMounted) { setMovements(movData); setError(null); }
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
      } finally { if (isMounted) setLoading(false); }
    };
    loadData();
    return () => { isMounted = false; };
  }, []);

  const inventory = useMemo<InventoryRow[]>(() => {
    const filtered = ownershipFilter === 'all'
      ? movements
      : movements.filter(m => m.position?.ownership === ownershipFilter);

    const map = new Map<string, InventoryRow>();

    for (const m of filtered) {
      const material = m.position?.material?.name || 'Неизвестный';
      const size = m.position?.size || '—';
      const company = m.position?.company?.name || 'Неизвестная';
      const wt = m.wall_thickness;
      const wtKey = wt != null ? String(wt) : '_null_';

      const key = isGroupedByCompany
        ? `${company}|${material}|${size}|${wtKey}`
        : `${material}|${size}|${wtKey}|${company}`;

      if (!map.has(key)) {
        map.set(key, {
          id: key,
          company,
          material,
          size,
          wallThickness: wt,
          ownership: m.position?.ownership || 'own',
          income: 0,
          expense: 0,
          balance: 0,
          qty: 0,
          totalCost: 0,
          avgPrice: 0,
          value: 0,
        });
      }

      const row = map.get(key)!;
      if (m.operation === 'income') {
        row.income += m.weight;
        row.balance += m.weight;
        row.totalCost += m.total_value || 0;
        row.qty += m.quantity || 0;
      } else {
        row.expense += m.weight;
        row.balance -= m.weight;
        row.qty -= m.quantity || 0;
      }
    }

    const rows = Array.from(map.values());
    for (const r of rows) {
      const incomeW = r.income;
      r.avgPrice = incomeW > 0 ? r.totalCost / incomeW : 0;
      r.value = r.balance * r.avgPrice;
    }

    return rows.sort((a, b) => {
      if (isGroupedByCompany) {
        const cd = a.company.localeCompare(b.company);
        if (cd !== 0) return cd;
      }
      const md = a.material.localeCompare(b.material);
      if (md !== 0) return md;
      const sd = (parseFloat(a.size) || 0) - (parseFloat(b.size) || 0);
      if (sd !== 0) return sd;
      return (a.wallThickness || 0) - (b.wallThickness || 0);
    });
  }, [movements, isGroupedByCompany, ownershipFilter]);

  const totalIncome = inventory.reduce((s, i) => s + i.income, 0);
  const totalExpense = inventory.reduce((s, i) => s + i.expense, 0);
  const totalBalance = inventory.reduce((s, i) => s + i.balance, 0);
  const totalValue = inventory.reduce((s, i) => s + i.value, 0);
  const totalCost = inventory.reduce((s, i) => s + i.totalCost, 0);

  const openCard = (item: InventoryRow) => {
    const params = new URLSearchParams({
      material: item.material,
      size: item.size,
      company: item.company,
    });
    if (item.wallThickness != null) params.set('wall', String(item.wallThickness));
    navigate(`/inventory-card?${params.toString()}`);
  };

  const handleExport = () => {
    const headers = ['Материал', 'Размер', 'Стенка', 'Компания', 'Приход (т)', 'Расход (т)', 'Остаток (т)', 'Шт', 'Ср.цена/т', 'Стоим. закупа', 'Стоим. остатка'];
    const rows = inventory.map(i => [
      i.material, i.size, i.wallThickness != null ? String(i.wallThickness) : '', i.company,
      i.income.toFixed(3), i.expense.toFixed(3), i.balance.toFixed(3),
      i.qty > 0 ? String(i.qty) : '', i.avgPrice > 0 ? i.avgPrice.toFixed(0) : '',
      i.totalCost > 0 ? i.totalCost.toFixed(0) : '', i.value > 0 ? i.value.toFixed(0) : '',
    ]);
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `inventory_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportXlsx = () => {
    type R = typeof inventory[0];
    const columns = [
      { header: 'Материал', accessor: (i: R) => i.material, width: 18 },
      { header: 'Размер', accessor: (i: R) => i.size, width: 10 },
      { header: 'Стенка', accessor: (i: R) => i.wallThickness != null ? String(i.wallThickness) : '', width: 10 },
      { header: 'Компания', accessor: (i: R) => i.company, width: 20 },
      { header: 'Приход (т)', accessor: (i: R) => formatNumber(i.income, 3), width: 12 },
      { header: 'Расход (т)', accessor: (i: R) => formatNumber(i.expense, 3), width: 12 },
      { header: 'Остаток (т)', accessor: (i: R) => formatNumber(i.balance, 3), width: 12 },
      { header: 'Шт', accessor: (i: R) => i.qty > 0 ? String(i.qty) : '', width: 8 },
      { header: 'Ср.цена/т', accessor: (i: R) => i.avgPrice > 0 ? formatNumber(i.avgPrice, 0) : '', width: 12 },
      { header: 'Стоим. закупа', accessor: (i: R) => i.totalCost > 0 ? formatNumber(i.totalCost, 0) : '', width: 14 },
      { header: 'Стоим. остатка', accessor: (i: R) => i.value > 0 ? formatNumber(i.value, 0) : '', width: 14 },
    ];
    exportToXlsx(inventory, columns, `Остатки_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  if (error) return <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>;

  const fmtNum = (n: number) => n.toLocaleString('ru-RU', { maximumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Package className="text-blue-600" /> Склад</h2>
          <p className="text-slate-500 text-sm">Учёт товара: материал, размер, стенка. Клик по строке — карточка позиции.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <select className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-600 shadow-sm" value={ownershipFilter} onChange={e => setOwnershipFilter(e.target.value as OwnershipType | 'all')}>
            <option value="all">Все товары</option>
            <option value="own">Только наши</option>
            <option value="client_storage">Товар клиента</option>
          </select>
          <button onClick={() => setIsGroupedByCompany(!isGroupedByCompany)} className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border shadow-sm transition-colors ${isGroupedByCompany ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-slate-600 border-slate-200 hover:text-blue-600'}`}>
            {isGroupedByCompany ? <Users size={16} /> : <Layers size={16} />}
            {isGroupedByCompany ? 'Сводно' : 'По компаниям'}
          </button>
          <button onClick={handleExport} className="text-slate-600 hover:text-blue-600 flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border border-slate-200 bg-white shadow-sm transition-colors"><Download size={16} /> CSV</button>
          <button onClick={handleExportXlsx} className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg shadow-sm transition-colors"><FileSpreadsheet size={16} /> XLSX</button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3">
          <p className="text-xs text-slate-500">Приход</p>
          <p className="text-lg font-bold text-green-700">{totalIncome.toFixed(3)} <span className="text-xs text-slate-400">т</span></p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3">
          <p className="text-xs text-slate-500">Расход</p>
          <p className="text-lg font-bold text-red-600">{totalExpense.toFixed(3)} <span className="text-xs text-slate-400">т</span></p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3">
          <p className="text-xs text-slate-500">Остаток</p>
          <p className="text-lg font-bold text-slate-800">{totalBalance.toFixed(3)} <span className="text-xs text-slate-400">т</span></p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3">
          <p className="text-xs text-slate-500">Стоим. закупа</p>
          <p className="text-lg font-bold text-slate-800">{fmtNum(totalCost)} <span className="text-xs text-slate-400">₽</span></p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3">
          <p className="text-xs text-slate-500">Стоим. остатка</p>
          <p className="text-lg font-bold text-blue-700">{fmtNum(totalValue)} <span className="text-xs text-slate-400">₽</span></p>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {inventory.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-400">Нет данных.</div>
        ) : inventory.map(item => (
          <div key={item.id} onClick={() => openCard(item)} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-2 cursor-pointer hover:border-blue-300 transition-colors active:bg-slate-50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-800">{item.material}</span>
              <ExternalLink size={14} className="text-slate-400" />
            </div>
            <div className="flex flex-wrap gap-2 items-center text-sm">
              <span className="text-slate-600">{item.size}</span>
              {item.wallThickness != null && <span className="badge badge-slate">ст. {item.wallThickness}</span>}
              <span className="badge badge-blue">{item.company}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="text-center"><div className="text-slate-500 text-xs">Приход</div><div className="font-medium text-green-700">{item.income.toFixed(3)}</div></div>
              <div className="text-center"><div className="text-slate-500 text-xs">Расход</div><div className="font-medium text-red-600">{item.expense.toFixed(3)}</div></div>
              <div className="text-center"><div className="text-slate-500 text-xs">Остаток</div><div className={`font-bold ${item.balance < 0 ? 'text-red-600' : 'text-slate-800'}`}>{item.balance.toFixed(3)}</div></div>
            </div>
            <div className="flex justify-between items-center text-sm">
              {item.avgPrice > 0 && <span className="text-slate-500">Ср. {fmtNum(item.avgPrice)} ₽/т</span>}
              {item.value > 0 && <span className="font-medium text-blue-700">{fmtNum(item.value)} ₽</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                {isGroupedByCompany && <th className="px-3 py-3 whitespace-nowrap">Компания</th>}
                <th className="px-3 py-3 whitespace-nowrap">Материал</th>
                <th className="px-3 py-3 whitespace-nowrap">Размер</th>
                <th className="px-3 py-3 whitespace-nowrap">Стенка</th>
                {!isGroupedByCompany && <th className="px-3 py-3 whitespace-nowrap">Компания</th>}
                <th className="px-3 py-3 text-right whitespace-nowrap text-green-700">Приход (т)</th>
                <th className="px-3 py-3 text-right whitespace-nowrap text-red-600">Расход (т)</th>
                <th className="px-3 py-3 text-right font-bold bg-blue-50/50 whitespace-nowrap">Остаток (т)</th>
                <th className="px-3 py-3 text-right whitespace-nowrap">Шт</th>
                <th className="px-3 py-3 text-right whitespace-nowrap">Ср. цена/т</th>
                <th className="px-3 py-3 text-right whitespace-nowrap">Стоим. остатка</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inventory.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-8 text-center text-slate-400">Нет данных.</td></tr>
              ) : inventory.map(item => (
                <tr key={item.id} onClick={() => openCard(item)} className="hover:bg-blue-50/50 transition-colors cursor-pointer">
                  {isGroupedByCompany && <td className="px-3 py-2 font-medium text-slate-700">{item.company}</td>}
                  <td className="px-3 py-2 font-medium text-slate-800">{item.material}</td>
                  <td className="px-3 py-2">{item.size}</td>
                  <td className="px-3 py-2 text-slate-600">{item.wallThickness != null ? item.wallThickness : '—'}</td>
                  {!isGroupedByCompany && <td className="px-3 py-2 text-slate-600">{item.company}</td>}
                  <td className="px-3 py-2 text-right text-green-700">{item.income > 0 ? item.income.toFixed(3) : '—'}</td>
                  <td className="px-3 py-2 text-right text-red-600">{item.expense > 0 ? item.expense.toFixed(3) : '—'}</td>
                  <td className={`px-3 py-2 text-right font-bold bg-blue-50/30 ${item.balance < 0 ? 'text-red-600' : 'text-slate-800'}`}>{item.balance.toFixed(3)}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{item.qty > 0 ? item.qty : '—'}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{item.avgPrice > 0 ? fmtNum(item.avgPrice) : '—'}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{item.value > 0 ? fmtNum(item.value) : '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
              <tr>
                <td colSpan={isGroupedByCompany ? 4 : 5} className="px-3 py-3 text-right">ИТОГО:</td>
                <td className="px-3 py-3 text-right text-green-700">{totalIncome.toFixed(3)}</td>
                <td className="px-3 py-3 text-right text-red-600">{totalExpense.toFixed(3)}</td>
                <td className="px-3 py-3 text-right">{totalBalance.toFixed(3)}</td>
                <td className="px-3 py-3 text-right"></td>
                <td className="px-3 py-3 text-right"></td>
                <td className="px-3 py-3 text-right text-blue-700">{totalValue > 0 ? fmtNum(totalValue) : '—'}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
