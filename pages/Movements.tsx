import React, { useState, useEffect } from 'react';
import { Movement, Company, Material, MovementInput, OwnershipType, OperationType } from '../types';
import { getMovements, createMovement, deleteMovement, getCompanies, getMaterials, getPositionBalance } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Search, Filter, Loader2, Edit2, AlertTriangle } from 'lucide-react';

const Movements: React.FC = () => {
  const { isAdmin, user } = useAuth();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formState, setFormState] = useState<MovementInput>({
    movement_date: new Date().toISOString().split('T')[0],
    operation: 'income',
    company_id: '',
    material_id: '',
    size: '',
    ownership: 'own',
    weight: 0,
    cost: 0,
    note: '',
  });

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        setLoading(true);
        const [movementsData, companiesData, materialsData] = await Promise.all([
          getMovements(),
          getCompanies(),
          getMaterials(),
        ]);
        if (isMounted) {
          setMovements(movementsData);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.company_id || !formState.material_id || !formState.size) return;

    // Check for negative balance warning
    if (formState.operation === 'expense') {
      try {
        // We need to check if there's an existing position and its balance
        const existingMovements = movements.filter(
          (m) =>
            m.position?.company_id === formState.company_id &&
            m.position?.material_id === formState.material_id &&
            m.position?.size === formState.size &&
            m.position?.ownership === formState.ownership
        );

        const currentBalance = existingMovements.reduce((acc, m) => {
          return m.operation === 'income' ? acc + m.weight : acc - m.weight;
        }, 0);

        if (currentBalance - formState.weight < 0) {
          const confirmed = window.confirm(
            `Внимание! После операции баланс станет отрицательным (${(currentBalance - formState.weight).toFixed(3)} т). Продолжить?`
          );
          if (!confirmed) return;
        }
      } catch {
        // Ignore balance check errors
      }
    }

    try {
      setSubmitting(true);
      const newMovement = await createMovement(formState);
      setMovements((prev) => [newMovement, ...prev]);
      setIsModalOpen(false);
      // Reset form
      setFormState((prev) => ({ ...prev, size: '', weight: 0, cost: 0, note: '' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания записи');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, createdBy: string | null) => {
    // Only admin or creator can delete
    if (!isAdmin && createdBy !== user?.id) {
      alert('Вы можете удалять только свои записи');
      return;
    }

    if (!window.confirm('Удалить эту запись?')) return;

    try {
      await deleteMovement(id);
      setMovements((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  const filteredMovements = movements.filter((m) => {
    const companyName = m.position?.company?.name || '';
    const materialName = m.position?.material?.name || '';
    const size = m.position?.size || '';
    return (
      companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      size.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

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
          <h2 className="text-2xl font-bold text-slate-800">Движение металла</h2>
          <p className="text-slate-500 text-sm">Приход и расход материалов со склада</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus size={18} />
          Добавить запись
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Поиск по компании, материалу..."
            className="w-full pl-10 pr-4 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center text-slate-500 text-sm gap-2 px-3 border-l border-slate-200">
          <Filter size={16} />
          <span>Всего записей: {filteredMovements.length}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Дата</th>
                <th className="px-6 py-4 whitespace-nowrap">Компания</th>
                <th className="px-6 py-4 whitespace-nowrap">Операция</th>
                <th className="px-6 py-4 whitespace-nowrap">Материал</th>
                <th className="px-6 py-4 whitespace-nowrap">Размер</th>
                <th className="px-6 py-4 whitespace-nowrap">Владение</th>
                <th className="px-6 py-4 text-right whitespace-nowrap">Вес (т)</th>
                <th className="px-6 py-4 text-right whitespace-nowrap">Погр./Разгр.</th>
                <th className="px-6 py-4 whitespace-nowrap">Примечание</th>
                <th className="px-6 py-4 text-center">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-slate-400">
                    Нет записей. Добавьте первую операцию.
                  </td>
                </tr>
              ) : (
                filteredMovements.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3">
                      {new Date(item.movement_date).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-700">
                      {item.position?.company?.name || '—'}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`badge ${
                          item.operation === 'income' ? 'badge-green' : 'badge-red'
                        }`}
                      >
                        {item.operation === 'income' ? 'Приход' : 'Расход'}
                      </span>
                    </td>
                    <td className="px-6 py-3">{item.position?.material?.name || '—'}</td>
                    <td className="px-6 py-3">{item.position?.size || '—'}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`badge ${
                          item.position?.ownership === 'own' ? 'badge-blue' : 'badge-orange'
                        }`}
                      >
                        {item.position?.ownership === 'own' ? 'Наш' : 'Клиента'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-medium">{item.weight}</td>
                    <td className="px-6 py-3 text-right text-slate-500">{item.cost || '—'}</td>
                    <td className="px-6 py-3 text-slate-500 truncate max-w-xs">{item.note}</td>
                    <td className="px-6 py-3 text-center">
                      <button
                        onClick={() => handleDelete(item.id, item.created_by)}
                        className="text-slate-400 hover:text-red-600 transition-colors p-1"
                        title={
                          isAdmin || item.created_by === user?.id
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
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">Новое движение</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Дата</label>
                <input
                  type="date"
                  required
                  className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  value={formState.movement_date}
                  onChange={(e) => setFormState({ ...formState, movement_date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Операция</label>
                <select
                  className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  value={formState.operation}
                  onChange={(e) =>
                    setFormState({ ...formState, operation: e.target.value as OperationType })
                  }
                >
                  <option value="income">Приход</option>
                  <option value="expense">Расход</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Компания</label>
                <select
                  required
                  className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  value={formState.company_id}
                  onChange={(e) => setFormState({ ...formState, company_id: e.target.value })}
                >
                  <option value="">Выберите компанию...</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Материал</label>
                <select
                  required
                  className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  value={formState.material_id}
                  onChange={(e) => setFormState({ ...formState, material_id: e.target.value })}
                >
                  <option value="">Выберите материал...</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Размер</label>
                <input
                  type="text"
                  required
                  placeholder="Например: 530x6"
                  className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  value={formState.size}
                  onChange={(e) => setFormState({ ...formState, size: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Владение</label>
                <select
                  className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  value={formState.ownership}
                  onChange={(e) =>
                    setFormState({ ...formState, ownership: e.target.value as OwnershipType })
                  }
                >
                  <option value="own">Наш товар</option>
                  <option value="client_storage">На хранении у клиента</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Вес (тонн)</label>
                <input
                  type="number"
                  step="0.001"
                  required
                  className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  value={formState.weight}
                  onChange={(e) =>
                    setFormState({ ...formState, weight: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Стоимость погр./разгр.
                </label>
                <input
                  type="number"
                  className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  value={formState.cost}
                  onChange={(e) =>
                    setFormState({ ...formState, cost: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Примечание</label>
                <textarea
                  rows={2}
                  className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  value={formState.note}
                  onChange={(e) => setFormState({ ...formState, note: e.target.value })}
                />
              </div>

              <div className="sm:col-span-2 flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
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

export default Movements;
