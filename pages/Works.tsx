import React, { useState, useEffect } from 'react';
import { WorkLog, ServiceRate, Company, Material, WorkLogInput } from '../types';
import { getWorkLogs, createWorkLog, updateWorkLog, deleteWorkLog, getServiceRates, getCompanies, getMaterials } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Loader2, Hammer, Search, Filter, FileSpreadsheet, Edit2 } from 'lucide-react';
import DateFilter, { DateRange } from '../components/DateFilter';
import { useConfirm } from '../hooks/useConfirm';
import { exportToXlsx, formatDate, formatNumber, formatCurrency } from '../utils/export';

const Works: React.FC = () => {
  const { isAdmin, user } = useAuth();
  const { confirm, confirmDialog } = useConfirm();
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [rates, setRates] = useState<ServiceRate[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formDirty, setFormDirty] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>({ dateFrom: null, dateTo: null });

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

  const getEmptyForm = (): WorkLogInput => ({
    work_date: new Date().toISOString().split('T')[0],
    company_id: '',
    material_id: null,
    service_id: '',
    quantity: 0,
    note: '',
  });

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormState(getEmptyForm());
    setFormDirty(false);
  };

  const requestCloseModal = async () => {
    if (formDirty && !await confirm('Закрыть?', 'Несохранённые данные будут потеряны.', 'warning')) return;
    closeModal();
  };

  const openCreate = () => {
    setEditingId(null);
    setFormState(getEmptyForm());
    setFormDirty(false);
    setIsModalOpen(true);
  };

  const openEdit = (log: WorkLog) => {
    setEditingId(log.id);
    setFormState({
      work_date: log.work_date,
      company_id: log.company_id,
      material_id: log.material_id || null,
      service_id: log.service_id,
      quantity: log.quantity,
      note: log.note || '',
    });
    setFormDirty(false);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRate || !formState.company_id) return;

    try {
      setSubmitting(true);
      if (editingId) {
        const updated = await updateWorkLog(editingId, formState, selectedRate.price);
        setLogs((prev) => prev.map((l) => (l.id === editingId ? updated : l)));
      } else {
        const newLog = await createWorkLog(formState, selectedRate.price);
        setLogs((prev) => [newLog, ...prev]);
      }
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : editingId ? 'Ошибка обновления записи' : 'Ошибка создания записи');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, createdBy: string | null) => {
    if (!isAdmin && createdBy !== user?.id) {
      alert('Вы можете удалять только свои записи');
      return;
    }

    if (!await confirm('Удалить?', 'Удалить эту запись? Это действие нельзя отменить.', 'danger')) return;

    try {
      await deleteWorkLog(id);
      setLogs((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = !searchTerm ||
      log.company?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.material?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.service?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.note || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDateRange = (() => {
      if (!dateRange.dateFrom && !dateRange.dateTo) return true;
      const workDate = log.work_date;
      if (dateRange.dateFrom && workDate < dateRange.dateFrom) return false;
      if (dateRange.dateTo && workDate > dateRange.dateTo) return false;
      return true;
    })();
    
    return matchesSearch && matchesDateRange;
  });

  const totalSum = filteredLogs.reduce((acc, l) => acc + l.total_price, 0);

  const handleExportXlsx = () => {
    exportToXlsx<WorkLog>(filteredLogs, [
      { header: 'Дата', accessor: (l: WorkLog) => formatDate(l.work_date), width: 12 },
      { header: 'Компания', accessor: (l: WorkLog) => l.company?.name || '', width: 20 },
      { header: 'Материал', accessor: (l: WorkLog) => l.material?.name || '', width: 18 },
      { header: 'Услуга', accessor: (l: WorkLog) => l.service?.name || '', width: 20 },
      { header: 'Кол-во', accessor: (l: WorkLog) => formatNumber(l.quantity, 2), width: 10 },
      { header: 'Ед.', accessor: (l: WorkLog) => l.service?.unit || '', width: 8 },
      { header: 'Цена/ед', accessor: (l: WorkLog) => formatCurrency(l.service?.price || 0), width: 12 },
      { header: 'Сумма', accessor: (l: WorkLog) => formatCurrency(l.total_price), width: 12 },
      { header: 'Примечание', accessor: (l: WorkLog) => l.note || '', width: 25 },
    ], `Работы_${new Date().toISOString().split('T')[0]}.xlsx`);
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
            <Hammer className="text-blue-600" />
            Учет работ
          </h2>
          <p className="text-slate-500 text-sm">Выполненные услуги и их стоимость</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExportXlsx}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 sm:py-2 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all min-h-[48px] sm:min-h-0 touch-manipulation"
            title="Экспорт в Excel"
          >
            <FileSpreadsheet size={20} />
            <span className="hidden sm:inline">XLSX</span>
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 sm:py-2 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all min-h-[48px] sm:min-h-0 touch-manipulation"
          >
            <Plus size={20} />
            Добавить работу
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Поиск по компании, материалу, услуге..."
              className="w-full pl-10 pr-4 py-3 sm:py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center text-slate-500 text-sm gap-2 sm:px-3 sm:border-l border-slate-200">
            <Filter size={16} />
            <span>Записей: {filteredLogs.length}</span>
          </div>
        </div>
        <DateFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-400">
            Нет записей о работах.
          </div>
        ) : (
          <>
            {filteredLogs.map((log) => (
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
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => openEdit(log)}
                      className="p-2 text-slate-400 hover:text-blue-600 transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-blue-50"
                      aria-label="Редактировать"
                    >
                      <Edit2 size={20} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(log.id, log.created_by)}
                      className="p-2 text-slate-400 hover:text-red-600 transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-red-50"
                      aria-label="Удалить"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
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
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-slate-400">
                    Нет записей о работах.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
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
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(log)}
                          className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                          title="Редактировать"
                        >
                          <Edit2 size={16} />
                        </button>
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
                      </div>
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
              <h3 className="font-bold text-lg text-slate-800">
                {editingId ? 'Редактирование работы' : 'Новая запись о работе'}
              </h3>
              <button
                type="button"
                onClick={requestCloseModal}
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
                    onChange={(e) => { setFormState({ ...formState, work_date: e.target.value }); setFormDirty(true); }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Компания</label>
                  <select
                    required
                    className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                    value={formState.company_id}
                    onChange={(e) => { setFormState({ ...formState, company_id: e.target.value }); setFormDirty(true); }}
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
                    { setFormState({ ...formState, material_id: e.target.value || null }); setFormDirty(true); }
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
                    onChange={(e) => { setFormState({ ...formState, service_id: e.target.value }); setFormDirty(true); }}
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
                      { setFormState({ ...formState, quantity: parseFloat(e.target.value) || 0 }); setFormDirty(true); }
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
                  onChange={(e) => { setFormState({ ...formState, note: e.target.value }); setFormDirty(true); }}
                />
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100 flex-shrink-0">
                <button
                  type="button"
                  onClick={requestCloseModal}
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
      {confirmDialog}
    </div>
  );
};

export default Works;
