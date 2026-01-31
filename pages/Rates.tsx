import React, { useState, useEffect } from 'react';
import { ServiceRate } from '../types';
import { getServiceRates, createServiceRate, updateServiceRate, deleteServiceRate } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Edit2, Save, X, Loader2, Book } from 'lucide-react';

const Rates: React.FC = () => {
  const { isAdmin } = useAuth();
  const [rates, setRates] = useState<ServiceRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ServiceRate>>({});
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadRates = async () => {
      try {
        setLoading(true);
        const data = await getServiceRates(!showInactive);
        if (isMounted) {
          setRates(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Ошибка загрузки тарифов');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadRates();
    return () => { isMounted = false; };
  }, [showInactive]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Вы уверены? Это может повлиять на расчеты работ.')) return;
    try {
      await deleteServiceRate(id);
      setRates((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  const startEdit = (rate: ServiceRate) => {
    setEditingId(rate.id);
    setEditForm(rate);
  };

  const saveEdit = async () => {
    if (!editingId || !editForm.name) return;
    try {
      const updated = await updateServiceRate(editingId, {
        name: editForm.name,
        price: editForm.price,
        unit: editForm.unit,
        active: editForm.active,
      });
      setRates((prev) => prev.map((r) => (r.id === editingId ? updated : r)));
      setEditingId(null);
      setEditForm({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    }
  };

  const addNew = async () => {
    setError(null);
    try {
      const uniqueSuffix = new Date().toISOString().slice(11, 19);
      const newRate = await createServiceRate({
        name: `Новая услуга ${uniqueSuffix}`,
        price: 0,
        unit: 'шт',
        active: true,
      });
      setRates((prev) => [...prev, newRate]);
      startEdit(newRate);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка создания';
      setError(msg);
      console.error('createServiceRate:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Book className="text-blue-600" />
            Справочник работ
          </h2>
          <p className="text-slate-500 text-sm">Цены на услуги (сварка, резка и т.д.)</p>
        </div>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-slate-300"
            />
            Показать неактивные
          </label>
          <button
            onClick={addNew}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-all"
          >
            <Plus size={18} />
            Добавить услугу
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {rates.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-400">
            Нет тарифов. Добавьте первый.
          </div>
        ) : (
          rates.map((rate) => (
            <div
              key={rate.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-3"
            >
              {editingId === rate.id ? (
                <>
                  <input
                    className="w-full border-slate-300 rounded-lg p-3 text-sm border focus:ring-2 focus:ring-blue-500"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Вид работ"
                  />
                  <select
                    className="w-full border-slate-300 rounded-lg p-3 text-sm border focus:ring-2 focus:ring-blue-500"
                    value={editForm.unit || 'шт'}
                    onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                  >
                    <option value="тн">тонна (тн)</option>
                    <option value="шт">штука (шт)</option>
                    <option value="м/п">пог. метр (м/п)</option>
                    <option value="час">час</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Цена"
                    className="w-full border-slate-300 rounded-lg p-3 text-sm border focus:ring-2 focus:ring-blue-500"
                    value={editForm.price || ''}
                    onChange={(e) =>
                      setEditForm({ ...editForm, price: parseFloat(e.target.value) || 0 })
                    }
                  />
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.active ?? true}
                      onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-600">Активен</span>
                  </label>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={saveEdit}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 text-white font-medium touch-manipulation min-h-[48px]"
                    >
                      <Save size={18} />
                      Сохранить
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="flex items-center justify-center p-3 rounded-xl border border-slate-300 text-slate-600 touch-manipulation min-h-[48px]"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-slate-800">{rate.name}</div>
                    <div className="text-sm text-slate-600 mt-1">
                      {(Number(rate.price) || 0).toLocaleString('ru-RU')} ₽ / {rate.unit}
                    </div>
                    <span className={`badge mt-2 inline-block ${rate.active ? 'badge-green' : 'badge-gray'}`}>
                      {rate.active ? 'Активен' : 'Неактивен'}
                    </span>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEdit(rate)}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label="Редактировать"
                      >
                        <Edit2 size={20} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(rate.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label="Удалить"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Table: desktop only */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 w-2/5">Вид работ</th>
                <th className="px-6 py-4 w-1/5">Ед. измерения</th>
                <th className="px-6 py-4 w-1/5 text-right">Цена за ед. (руб)</th>
                <th className="px-6 py-4 w-1/10 text-center">Статус</th>
                <th className="px-6 py-4 w-20 text-center">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    Нет тарифов. Добавьте первый.
                  </td>
                </tr>
              ) : (
                rates.map((rate) => (
                  <tr key={rate.id} className="hover:bg-slate-50 group">
                    {editingId === rate.id ? (
                      <>
                        <td className="px-6 py-3">
                          <input
                            className="w-full border-slate-300 rounded p-1 text-sm border focus:ring-1 focus:ring-blue-500"
                            value={editForm.name || ''}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            autoFocus
                          />
                        </td>
                        <td className="px-6 py-3">
                          <select
                            className="w-full border-slate-300 rounded p-1 text-sm border focus:ring-1 focus:ring-blue-500"
                            value={editForm.unit || 'шт'}
                            onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                          >
                            <option value="тн">тонна (тн)</option>
                            <option value="шт">штука (шт)</option>
                            <option value="м/п">пог. метр (м/п)</option>
                            <option value="час">час</option>
                          </select>
                        </td>
                        <td className="px-6 py-3">
                          <input
                            type="number"
                            placeholder="Цена"
                            className="w-full border-slate-300 rounded p-1 text-sm border text-right focus:ring-1 focus:ring-blue-500"
                            value={editForm.price || ''}
                            onChange={(e) =>
                              setEditForm({ ...editForm, price: parseFloat(e.target.value) || 0 })
                            }
                          />
                        </td>
                        <td className="px-6 py-3 text-center">
                          <label className="inline-flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editForm.active ?? true}
                              onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                              className="rounded border-slate-300"
                            />
                          </label>
                        </td>
                        <td className="px-6 py-3 flex justify-center gap-2">
                          <button
                            onClick={saveEdit}
                            className="text-green-600 hover:bg-green-50 p-1 rounded"
                          >
                            <Save size={16} />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-red-500 hover:bg-red-50 p-1 rounded"
                          >
                            <X size={16} />
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-3 font-medium text-slate-700">{rate.name}</td>
                        <td className="px-6 py-3 text-slate-500">{rate.unit}</td>
                        <td className="px-6 py-3 text-right font-mono text-slate-700">
                          {(Number(rate.price) || 0).toLocaleString('ru-RU')}
                        </td>
                        <td className="px-6 py-3 text-center">
                          <span className={`badge ${rate.active ? 'badge-green' : 'badge-gray'}`}>
                            {rate.active ? 'Активен' : 'Неактивен'}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex justify-center gap-2">
                            {isAdmin && (
                              <>
                                <button
                                  onClick={() => startEdit(rate)}
                                  className="text-blue-500 hover:text-blue-700"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => handleDelete(rate.id)}
                                  className="text-slate-400 hover:text-red-600"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </>
                    )}
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

export default Rates;
