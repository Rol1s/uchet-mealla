import React, { useState, useEffect, useMemo } from 'react';
import { Position, OwnershipType } from '../types';
import { getPositions } from '../services/supabase';
import { Download, Layers, Users, Loader2, Package } from 'lucide-react';

const Inventory: React.FC = () => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGroupedByCompany, setIsGroupedByCompany] = useState(false);
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipType | 'all'>('all');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await getPositions();
        setPositions(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const inventory = useMemo(() => {
    // Filter by ownership
    let filtered = positions;
    if (ownershipFilter !== 'all') {
      filtered = positions.filter((p) => p.ownership === ownershipFilter);
    }

    // Group if needed
    if (!isGroupedByCompany) {
      // Merge positions by material + size (ignoring company)
      const map = new Map<
        string,
        {
          id: string;
          company: string;
          material: string;
          size: string;
          ownership: OwnershipType;
          balance: number;
        }
      >();

      filtered.forEach((p) => {
        const key = `${p.material?.name || ''}|${p.size}|${p.ownership}`;
        if (!map.has(key)) {
          map.set(key, {
            id: key,
            company: '—',
            material: p.material?.name || 'Неизвестный',
            size: p.size,
            ownership: p.ownership,
            balance: 0,
          });
        }
        const item = map.get(key)!;
        item.balance += p.balance;
      });

      return Array.from(map.values()).sort((a, b) => {
        const matDiff = a.material.localeCompare(b.material);
        if (matDiff !== 0) return matDiff;
        return a.size.localeCompare(b.size);
      });
    }

    // Grouped by company
    return filtered
      .map((p) => ({
        id: p.id,
        company: p.company?.name || 'Неизвестная',
        material: p.material?.name || 'Неизвестный',
        size: p.size,
        ownership: p.ownership,
        balance: p.balance,
      }))
      .sort((a, b) => {
        const compDiff = a.company.localeCompare(b.company);
        if (compDiff !== 0) return compDiff;
        const matDiff = a.material.localeCompare(b.material);
        if (matDiff !== 0) return matDiff;
        return a.size.localeCompare(b.size);
      });
  }, [positions, isGroupedByCompany, ownershipFilter]);

  const totalBalance = inventory.reduce((acc, i) => acc + i.balance, 0);

  const handleExport = () => {
    // Simple CSV export
    const headers = isGroupedByCompany
      ? ['Компания', 'Материал', 'Размер', 'Владение', 'Остаток']
      : ['Материал', 'Размер', 'Владение', 'Остаток'];

    const rows = inventory.map((item) =>
      isGroupedByCompany
        ? [
            item.company,
            item.material,
            item.size,
            item.ownership === 'own' ? 'Наш' : 'Клиента',
            item.balance.toFixed(3),
          ]
        : [
            item.material,
            item.size,
            item.ownership === 'own' ? 'Наш' : 'Клиента',
            item.balance.toFixed(3),
          ]
    );

    const csv = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `inventory_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
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
            <option value="client_storage">На хранении</option>
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

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                {isGroupedByCompany && (
                  <th className="px-6 py-4 whitespace-nowrap">Компания</th>
                )}
                <th className="px-6 py-4 whitespace-nowrap">Материал</th>
                <th className="px-6 py-4 whitespace-nowrap">Размер</th>
                <th className="px-6 py-4 whitespace-nowrap">Владение</th>
                <th className="px-6 py-4 text-right font-bold bg-blue-50/50 whitespace-nowrap">
                  Остаток (т)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inventory.length === 0 ? (
                <tr>
                  <td
                    colSpan={isGroupedByCompany ? 5 : 4}
                    className="px-6 py-8 text-center text-slate-400"
                  >
                    Нет данных о движениях.
                  </td>
                </tr>
              ) : (
                inventory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    {isGroupedByCompany && (
                      <td className="px-6 py-3 font-medium text-slate-700">{item.company}</td>
                    )}
                    <td className="px-6 py-3 font-medium text-slate-800">{item.material}</td>
                    <td className="px-6 py-3">{item.size}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`badge ${
                          item.ownership === 'own' ? 'badge-blue' : 'badge-orange'
                        }`}
                      >
                        {item.ownership === 'own' ? 'Наш' : 'Клиента'}
                      </span>
                    </td>
                    <td
                      className={`px-6 py-3 text-right font-bold bg-blue-50/30 ${
                        item.balance < 0 ? 'text-red-600' : 'text-slate-800'
                      }`}
                    >
                      {item.balance.toFixed(3)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
              <tr>
                <td
                  colSpan={isGroupedByCompany ? 4 : 3}
                  className="px-6 py-3 text-right"
                >
                  ИТОГО:
                </td>
                <td className="px-6 py-3 text-right">{totalBalance.toFixed(3)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
