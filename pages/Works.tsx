import React, { useState, useEffect } from 'react';
import { WorkLog, ServiceRate, Company, Material, WorkLogInput } from '../types';
import { getWorkLogs, createWorkLog, deleteWorkLog, getServiceRates, getCompanies, getMaterials } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Loader2, Hammer } from 'lucide-react';

const Works: React.FC = () => {
  const { isAdmin, user } = useAuth();
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [rates, setRates] = useState<ServiceRate[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formState, setFormState] = useState<WorkLogInput>({
    work_date: new Date().toISOString().split('T')[0],
    company_id: '',
    material_id: null,
    service_id: '',
    quantity: 0,
    note: '',
  });

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        setLoading(true);
        const [logsData, ratesData, companiesData, materialsData] = await Promise.all([
          getWorkLogs(),
          getServiceRates(),
          getCompanies(),
          getMaterials(),
        ]);
        if (isMounted) {
          setLogs(logsData);
          setRates(ratesData);
          setCompanies(companiesData);
          setMaterials(materialsData);
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

  const selectedRate = rates.find((r) => r.id === formState.service_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRate || !formState.company_id) return;

    try {
      setSubmitting(true);
      const newLog = await createWorkLog(formState, selectedRate.price);
      setLogs((prev) => [newLog, ...prev]);
      setIsModalOpen(false);
      setFormState((prev) => ({ ...prev, quantity: 0, note: '', material_id: null }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания записи');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, createdBy: string | null) => {
    if (!isAdmin && createdBy !== user?.id) {
      alert('Вы можете удалять только свои записи');
      return;
    }

    if (!window.confirm('Удалить эту запись?')) return;

    try {
      await deleteWorkLog(id);
      setLogs((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  const totalSum = logs.reduce((acc, l) => acc + l.total_price, 0);

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
            <Hammer className="text-blue-600" />
            Учет работ
          </h2>
          <p className="text-slate-500 text-sm">Выполненные услуги и их стоимость</p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 sm:py-2 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all min-h-[48px] sm:min-h-0 touch-manipulation"
        >
          <Plus size={20} />
          Добавить работу
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {logs.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-400">
            Нет записей о работах.
          </div>
        ) : (
          <>
            {logs.map((log) => (
              <div
                key={log.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-2"
              >
                <div className="text-sm font-medium text-slate-700">
                  {new Date(log.work_date).toLocaleDateString('ru-RU')}
                </div>
                <div className="text-sm text-slate-600">
                  {log.company?.name || '—'}
                  {log.material?.name ? ` · ${log.material.name}` : ''}
                </div>
                <div className="text-sm font-medium text-slate-800">
                  {log.service?.name || 'Неизвестная услуга'} ({log.service?.unit})
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">
                    Количество: {log.quantity} {log.service?.unit}
                  </span>
                  <span className="font-bold text-slate-800">
                    {log.total_price.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
                {log.note ? (
                  <p className="text-sm text-slate-500 truncate">{log.note}</p>
                ) : null}
                {(isAdmin || log.created_by === user?.id) && (
                  <button
                    type="button"
                    onClick={() => handleDelete(log.id, log.created_by)}
                    className="mt-2 p-2 text-slate-400 hover:text-red-600 transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-red-50"
                    aria-label="Удалить"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            ))}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex justify-between items-center font-bold text-slate-800">
              <span>ИТОГО:</span>
              <span className="text-blue-700">{totalSum.toLocaleString('ru-RU')} ₽</span>
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
                <th className="px-6 py-4 whitespace-nowrap">Дата</th>
                <th className="px-6 py-4 whitespace-nowrap">Компания</th>
                <th className="px-6 py-4 whitespace-nowrap">Материал</th>
                <th className="px-6 py-4 whitespace-nowrap">Вид работ</th>
                <th className="px-6 py-4 text-right whitespace-nowrap">Кол-во</th>
                <th className="px-6 py-4 text-right whitespace-nowrap">Цена за ед.</th>
                <th className="px-6 py-4 text-right whitespace-nowrap bg-blue-50/50">Сумма</th>
                <th className="px-6 py-4 whitespace-nowrap">Примечание</th>
                <th className="px-6 py-4 text-center">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-slate-400">
                    Нет записей о работах.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3">
                      {new Date(log.work_date).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-700">
                      {log.company?.name || '—'}
                    </td>
                    <td className="px-6 py-3">{log.material?.name || '—'}</td>
                    <td className="px-6 py-3">{log.service?.name || 'Неизвестная услуга'}</td>
                    <td className="px-6 py-3 text-right">
                      {log.quantity}{' '}
                      <span className="text-xs text-slate-400">{log.service?.unit}</span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      {log.service?.price.toLocaleString('ru-RU')}
                    </td>
                    <td className="px-6 py-3 text-right font-bold bg-blue-50/30 text-slate-800">
                      {log.total_price.toLocaleString('ru-RU')}
                    </td>
                    <td className="px-6 py-3 text-slate-500 truncate max-w-xs">{log.note}</td>
                    <td className="px-6 py-3 text-center">
                      <button
                        onClick={() => handleDelete(log.id, log.created_by)}
                        className="text-slate-400 hover:text-red-600 transition-colors p-1"
                        title={
                          isAdmin || log.created_by === user?.id
                            ? 'Удалить'
                            : 'Только свои записи'
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
              <tr>
                <td colSpan={6} className="px-6 py-3 text-right">
                  ИТОГО:
                </td>
                <td className="px-6 py-3 text-right text-blue-700">
                  {totalSum.toLocaleString('ru-RU')} ₽
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 safe-area-inset">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] sm:max-h-[85vh] overflow-hidden animate-fade-in flex flex-col">
            <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 flex-shrink-0">
              <h3 className="font-bold text-lg text-slate-800">Новая запись о работе</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 -m-2 text-slate-400 hover:text-slate-600 text-2xl leading-none touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Закрыть"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Дата</label>
                  <input
                    type="date"
                    required
                    className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                    value={formState.work_date}
                    onChange={(e) => setFormState({ ...formState, work_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Компания</label>
                  <select
                    required
                    className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                    value={formState.company_id}
                    onChange={(e) => setFormState({ ...formState, company_id: e.target.value })}
                  >
                    <option value="">Выберите...</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Материал (опционально)
                </label>
                <select
                  className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  value={formState.material_id || ''}
                  onChange={(e) =>
                    setFormState({ ...formState, material_id: e.target.value || null })
                  }
                >
                  <option value="">Не указан</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Вид работ</label>
                <select
                  required
                  className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  value={formState.service_id}
                  onChange={(e) => setFormState({ ...formState, service_id: e.target.value })}
                >
                  <option value="">Выберите услугу...</option>
                  {rates.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.price} руб/{r.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Количество {selectedRate ? `(${selectedRate.unit})` : ''}
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    placeholder="Введите количество"
                    className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                    value={formState.quantity || ''}
                    onChange={(e) =>
                      setFormState({ ...formState, quantity: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Итого сумма
                  </label>
                  <div className="w-full bg-slate-100 rounded-lg p-2 border border-slate-200 text-slate-700 font-mono">
                    {(formState.quantity * (selectedRate?.price || 0)).toFixed(2)}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Примечание</label>
                <input
                  type="text"
                  className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  value={formState.note}
                  onChange={(e) => setFormState({ ...formState, note: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-3 min-h-[48px] text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 touch-manipulation"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-3 min-h-[48px] text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 touch-manipulation"
                >
                  {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Works;
