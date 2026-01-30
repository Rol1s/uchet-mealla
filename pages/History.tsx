import React, { useState, useEffect } from 'react';
import { AuditLog } from '../types';
import { getAuditLogs } from '../services/supabase';
import { History as HistoryIcon, Loader2, Search, Filter } from 'lucide-react';

const ACTION_LABELS: Record<string, { label: string; class: string }> = {
  insert: { label: 'Создание', class: 'badge-green' },
  update: { label: 'Изменение', class: 'badge-blue' },
  delete: { label: 'Удаление', class: 'badge-red' },
};

const TABLE_LABELS: Record<string, string> = {
  movements: 'Движения',
  work_logs: 'Работы',
  positions: 'Позиции',
  companies: 'Компании',
  materials: 'Материалы',
  service_rates: 'Тарифы',
  users: 'Пользователи',
};

const History: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTable, setFilterTable] = useState<string>('');
  const [filterAction, setFilterAction] = useState<string>('');

  useEffect(() => {
    const loadLogs = async () => {
      try {
        setLoading(true);
        const data = await getAuditLogs(500);
        setLogs(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки истории');
      } finally {
        setLoading(false);
      }
    };
    loadLogs();
  }, []);

  const uniqueTables = [...new Set(logs.map((l) => l.table_name))];

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      !searchTerm ||
      log.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(log.old_data).toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(log.new_data).toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTable = !filterTable || log.table_name === filterTable;
    const matchesAction = !filterAction || log.action === filterAction;

    return matchesSearch && matchesTable && matchesAction;
  });

  const formatData = (data: Record<string, unknown> | null): string => {
    if (!data) return '—';
    const entries = Object.entries(data)
      .filter(([key]) => !['id', 'created_at', 'updated_at', 'created_by'].includes(key))
      .slice(0, 4);
    return entries.map(([key, value]) => `${key}: ${value}`).join(', ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <HistoryIcon className="text-blue-600" />
            История изменений
          </h2>
          <p className="text-slate-500 text-sm">Аудит всех операций в системе</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Поиск..."
            className="w-full pl-10 pr-4 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="px-3 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          value={filterTable}
          onChange={(e) => setFilterTable(e.target.value)}
        >
          <option value="">Все таблицы</option>
          {uniqueTables.map((t) => (
            <option key={t} value={t}>
              {TABLE_LABELS[t] || t}
            </option>
          ))}
        </select>

        <select
          className="px-3 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
        >
          <option value="">Все действия</option>
          <option value="insert">Создание</option>
          <option value="update">Изменение</option>
          <option value="delete">Удаление</option>
        </select>

        <div className="flex items-center text-slate-500 text-sm gap-2 px-3 border-l border-slate-200">
          <Filter size={16} />
          <span>Найдено: {filteredLogs.length}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Дата и время</th>
                <th className="px-6 py-4 whitespace-nowrap">Пользователь</th>
                <th className="px-6 py-4 whitespace-nowrap">Таблица</th>
                <th className="px-6 py-4 whitespace-nowrap">Действие</th>
                <th className="px-6 py-4">Было</th>
                <th className="px-6 py-4">Стало</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    Нет записей в истории
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-700">
                      {log.user?.email || log.user_id?.slice(0, 8) || '—'}
                    </td>
                    <td className="px-6 py-3 text-slate-600">
                      {TABLE_LABELS[log.table_name] || log.table_name}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`badge ${ACTION_LABELS[log.action]?.class || 'badge-gray'}`}>
                        {ACTION_LABELS[log.action]?.label || log.action}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-500 text-xs max-w-xs truncate">
                      {log.action !== 'insert' ? formatData(log.old_data) : '—'}
                    </td>
                    <td className="px-6 py-3 text-slate-500 text-xs max-w-xs truncate">
                      {log.action !== 'delete' ? formatData(log.new_data) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default History;
