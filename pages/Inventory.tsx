import React, { useState, useEffect, useMemo } from 'react';
import { Position, Movement, OwnershipType } from '../types';
import { getPositions, getMovements } from '../services/supabase';
import { Download, Layers, Users, Loader2, Package } from 'lucide-react';

const Inventory: React.FC = () => {
  const [positions, setPositions] = useState<Position[]>([]);
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
        const [posData, movData] = await Promise.all([getPositions(), getMovements()]);
        if (isMounted) {
          setPositions(posData);
          setMovements(movData);
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

  // Avg purchase price per position_id
  const avgPriceByPosition = useMemo(() => {
    const map = new Map<string, { totalValue: number; totalWeight: number }>();
    movements.filter((m) => m.operation === 'income').forEach((m) => {
      if (!map.has(m.position_id)) map.set(m.position_id, { totalValue: 0, totalWeight: 0 });
      const entry = map.get(m.position_id)!;
      entry.totalValue += m.total_value || 0;
      entry.totalWeight += m.weight;
    });
    const prices = new Map<string, number>();
    map.forEach((v, k) => {
      prices.set(k, v.totalWeight > 0 ? v.totalValue / v.totalWeight : 0);
    });
    return prices;
  }, [movements]);

  const inventory = useMemo(() => {
    let filtered = positions;
    if (ownershipFilter !== 'all') {
      filtered = positions.filter((p) => p.ownership === ownershipFilter);
    }

    if (!isGroupedByCompany) {
      const map = new Map<
        string,
        {
          id: string;
          company: string;
          material: string;
          size: string;
          ownership: OwnershipType;
          balance: number;
          value: number;
        }
      >();

      filtered.forEach((p) => {
        const key = `${p.material?.name || ''}|${p.size}|${p.company?.name || ''}`;
        if (!map.has(key)) {
          map.set(key, {
            id: key,
            company: p.company?.name || 'Неизвестная',
            material: p.material?.name || 'Неизвестный',
            size: p.size,
            ownership: p.ownership,
            balance: 0,
            value: 0,
          });
        }
        const item = map.get(key)!;
        item.balance += p.balance;
        const avgPrice = avgPriceByPosition.get(p.id) || 0;
        item.value += p.balance * avgPrice;
      });

      return Array.from(map.values()).sort((a, b) => {
        const matDiff = a.material.localeCompare(b.material);
        if (matDiff !== 0) return matDiff;
        return a.size.localeCompare(b.size);
      });
    }

    return filtered
      .map((p) => {
        const avgPrice = avgPriceByPosition.get(p.id) || 0;
        return {
          id: p.id,
          company: p.company?.name || 'Неизвестная',
          material: p.material?.name || 'Неизвестный',
          size: p.size,
          ownership: p.ownership,
          balance: p.balance,
          value: p.balance * avgPrice,
        };
      })
      .sort((a, b) => {
        const compDiff = a.company.localeCompare(b.company);
        if (compDiff !== 0) return compDiff;
        const matDiff = a.material.localeCompare(b.material);
        if (matDiff !== 0) return matDiff;
        return a.size.localeCompare(b.size);
      });
  }, [positions, isGroupedByCompany, ownershipFilter, avgPriceByPosition]);

  const totalBalance = inventory.reduce((acc, i) => acc + i.balance, 0);
  const totalValue = inventory.reduce((acc, i) => acc + i.value, 0);

  const handleExport = () => {
    // Simple CSV export
    const headers = isGroupedByCompany
      ? ['Компания', 'Материал', 'Размер', 'Остаток', 'Стоимость']
      : ['Материал', 'Размер', 'Компания', 'Остаток', 'Стоимость'];

    const rows = inventory.map((item) =>
      isGroupedByCompany
        ? [
            item.company,
            item.material,
            item.size,
            item.balance.toFixed(3),
            item.value > 0 ? item.value.toFixed(0) : '',
          ]
        : [
            item.material,
            item.size,
            item.company,
            item.balance.toFixed(3),
            item.value > 0 ? item.value.toFixed(0) : '',
          ]
    );

    const csv = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `inventory_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    // Release memory
    URL.revokeObjectURL(url);
  };

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="text-blue-600" />
            Остатки на складе
          </h2>
          <p className="text-slate-500 text-sm">
            {isGroupedByCompany
              ? 'Детализированный отчет с разбивкой по контрагентам'
              : 'Сводный отчет (общий котел)'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {/* Ownership filter */}
          <select
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-600 shadow-sm"
            value={ownershipFilter}
            onChange={(e) => setOwnershipFilter(e.target.value as OwnershipType | 'all')}
          >
            <option value="all">Все товары</option>
            <option value="own">Только наши</option>
            <option value="client_storage">Товар клиента</option>
          </select>

          <button
            onClick={() => setIsGroupedByCompany(!isGroupedByCompany)}
            className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border shadow-sm transition-colors ${
              isGroupedByCompany
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-slate-600 border-slate-200 hover:text-blue-600'
            }`}
          >
            {isGroupedByCompany ? <Users size={16} /> : <Layers size={16} />}
            {isGroupedByCompany ? 'Показать сводно' : 'Разбить по компаниям'}
          </button>
          <button
            onClick={handleExport}
            className="text-slate-600 hover:text-blue-600 flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border border-slate-200 bg-white shadow-sm transition-colors"
          >
            <Download size={16} />
            Экспорт CSV
          </button>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {inventory.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-400">
            Нет данных о движениях.
          </div>
        ) : (
          <>
            {inventory.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-2"
              >
                {isGroupedByCompany && (
                  <div className="text-sm font-medium text-slate-700">{item.company}</div>
                )}
                <div className="text-sm font-medium text-slate-800">{item.material}</div>
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-sm text-slate-600">Размер: {item.size}</span>
                  {!isGroupedByCompany && (
                    <span className="badge badge-blue">{item.company}</span>
                  )}
                </div>
                <div className="flex justify-between items-end">
                  <div
                    className={`font-bold text-lg ${
                      item.balance < 0 ? 'text-red-600' : 'text-slate-800'
                    }`}
                  >
                    {item.balance.toFixed(3)} т
                  </div>
                  {item.value > 0 && (
                    <div className="text-sm font-medium text-blue-700">
                      {item.value.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex justify-between items-center font-bold text-slate-800">
              <span>ИТОГО:</span>
              <div className="text-right">
                <div>{totalBalance.toFixed(3)} т</div>
                {totalValue > 0 && (
                  <div className="text-sm text-blue-700">
                    {totalValue.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Table: desktop only */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                {isGroupedByCompany && (
                  <th className="px-4 py-3 whitespace-nowrap">Компания</th>
                )}
                <th className="px-4 py-3 whitespace-nowrap">Материал</th>
                <th className="px-4 py-3 whitespace-nowrap">Размер</th>
                {!isGroupedByCompany && (
                  <th className="px-4 py-3 whitespace-nowrap">Компания</th>
                )}
                <th className="px-4 py-3 text-right font-bold bg-blue-50/50 whitespace-nowrap">
                  Остаток (т)
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap">
                  Стоимость (₽)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inventory.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-slate-400"
                  >
                    Нет данных о движениях.
                  </td>
                </tr>
              ) : (
                inventory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    {isGroupedByCompany && (
                      <td className="px-4 py-3 font-medium text-slate-700">{item.company}</td>
                    )}
                    <td className="px-4 py-3 font-medium text-slate-800">{item.material}</td>
                    <td className="px-4 py-3">{item.size}</td>
                    {!isGroupedByCompany && (
                      <td className="px-4 py-3 text-slate-600">{item.company}</td>
                    )}
                    <td
                      className={`px-4 py-3 text-right font-bold bg-blue-50/30 ${
                        item.balance < 0 ? 'text-red-600' : 'text-slate-800'
                      }`}
                    >
                      {item.balance.toFixed(3)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {item.value > 0 ? item.value.toLocaleString('ru-RU', { maximumFractionDigits: 0 }) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-3 text-right"
                >
                  ИТОГО:
                </td>
                <td className="px-4 py-3 text-right">{totalBalance.toFixed(3)}</td>
                <td className="px-4 py-3 text-right text-blue-700">
                  {totalValue > 0 ? totalValue.toLocaleString('ru-RU', { maximumFractionDigits: 0 }) : '—'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
