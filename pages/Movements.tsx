import React, { useState, useEffect, useCallback } from 'react';
import { Movement, Company, Material, MovementInput, OwnershipType, OperationType, PaymentMethodType } from '../types';
import { getMovements, createMovement, updateMovement, deleteMovement, getCompanies, getMaterials } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Search, Filter, Loader2, Edit2 } from 'lucide-react';

const LOADING_COST_PER_TON = 1000;

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
  const [editingId, setEditingId] = useState<string | null>(null);

  const getEmptyForm = useCallback((): MovementInput => ({
    movement_date: new Date().toISOString().split('T')[0],
    operation: 'income',
    company_id: '',
    material_id: '',
    size: '',
    ownership: 'own',
    weight: 0,
    cost: 0,
    price_per_ton: 0,
    payment_method: 'cashless',
    supplier_id: '',
    buyer_id: '',
    destination: '',
    note: '',
  }), []);

  const [formState, setFormState] = useState<MovementInput>(getEmptyForm);
  const [formDirty, setFormDirty] = useState(false);
  const [costManuallyEdited, setCostManuallyEdited] = useState(false);

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

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormState(getEmptyForm());
    setFormDirty(false);
    setCostManuallyEdited(false);
  }, [getEmptyForm]);

  const requestCloseModal = useCallback(() => {
    if (formDirty && !window.confirm('Закрыть без сохранения? Несохранённые данные будут потеряны.')) return;
    closeModal();
  }, [formDirty, closeModal]);

  const openCreate = useCallback(() => {
    setEditingId(null);
    setFormState(getEmptyForm());
    setFormDirty(false);
    setCostManuallyEdited(false);
    setIsModalOpen(true);
  }, [getEmptyForm]);

  const openEdit = useCallback((m: Movement) => {
    setEditingId(m.id);
    setFormState({
      movement_date: m.movement_date,
      operation: m.operation,
      company_id: m.position?.company_id ?? '',
      material_id: m.position?.material_id ?? '',
      size: m.position?.size ?? '',
      ownership: (m.position?.ownership as OwnershipType) ?? 'own',
      weight: m.weight,
      cost: m.cost ?? 0,
      price_per_ton: m.price_per_ton ?? 0,
      payment_method: (m.payment_method as PaymentMethodType) ?? 'cashless',
      supplier_id: m.supplier_id ?? '',
      buyer_id: m.buyer_id ?? '',
      destination: m.destination ?? '',
      note: m.note ?? '',
    });
    setFormDirty(false);
    setCostManuallyEdited(true);
    setIsModalOpen(true);
  }, []);

  const updateFormField = useCallback(<K extends keyof MovementInput>(field: K, value: MovementInput[K]) => {
    setFormState(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'weight' && !costManuallyEdited) {
        next.cost = Math.round((value as number) * LOADING_COST_PER_TON);
      }
      return next;
    });
    setFormDirty(true);
  }, [costManuallyEdited]);

  const handleCostChange = useCallback((value: number) => {
    setFormState(prev => ({ ...prev, cost: value }));
    setCostManuallyEdited(true);
    setFormDirty(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      try {
        setSubmitting(true);
        const updated = await updateMovement(editingId, {
          movement_date: formState.movement_date,
          operation: formState.operation,
          weight: formState.weight,
          cost: formState.cost,
          price_per_ton: formState.price_per_ton,
          note: formState.note,
          payment_method: formState.payment_method,
          supplier_id: formState.supplier_id || null,
          buyer_id: formState.buyer_id || null,
          destination: formState.destination || null,
        });
        setMovements((prev) => prev.map((m) => (m.id === editingId ? updated : m)));
        closeModal();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка сохранения');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!formState.company_id || !formState.material_id || !formState.size) return;

    if (formState.operation === 'expense') {
      try {
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
        // ignore
      }
    }

    try {
      setSubmitting(true);
      const newMovement = await createMovement(formState);
      setMovements((prev) => [newMovement, ...prev]);
      closeModal();
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
      await deleteMovement(id);
      setMovements((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  const suppliers = companies.filter(c => c.type === 'supplier' || c.type === 'both');
  const buyers = companies.filter(c => c.type === 'buyer' || c.type === 'both');

  const filteredMovements = movements.filter((m) => {
    const companyName = m.position?.company?.name || '';
    const materialName = m.position?.material?.name || '';
    const size = m.position?.size || '';
    const supplierName = m.supplier?.name || '';
    const buyerName = m.buyer?.name || '';
    const destination = m.destination || '';
    const term = searchTerm.toLowerCase();
    return (
      companyName.toLowerCase().includes(term) ||
      materialName.toLowerCase().includes(term) ||
      size.toLowerCase().includes(term) ||
      supplierName.toLowerCase().includes(term) ||
      buyerName.toLowerCase().includes(term) ||
      destination.toLowerCase().includes(term)
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
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Движение металла</h2>
          <p className="text-slate-500 text-sm">Приход и расход материалов со склада</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 sm:py-2 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all min-h-[48px] sm:min-h-0 touch-manipulation"
        >
          <Plus size={20} />
          Добавить запись
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Поиск по компании, материалу, поставщику..."
            className="w-full pl-10 pr-4 py-3 sm:py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center text-slate-500 text-sm gap-2 sm:px-3 sm:border-l border-slate-200">
          <Filter size={16} />
          <span>Всего записей: {filteredMovements.length}</span>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filteredMovements.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-400">
            Нет записей. Добавьте первую операцию.
          </div>
        ) : (
          filteredMovements.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium text-slate-700">
                  {new Date(item.movement_date).toLocaleDateString('ru-RU')}
                </span>
                <span
                  className={`badge shrink-0 ${
                    item.operation === 'income' ? 'badge-green' : 'badge-red'
                  }`}
                >
                  {item.operation === 'income' ? 'Приход' : 'Расход'}
                </span>
              </div>
              <div className="text-sm text-slate-600">
                {item.position?.company?.name || '—'} · {item.position?.material?.name || '—'}
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="text-slate-500">Размер: {item.position?.size || '—'}</span>
                <span
                  className={`badge ${
                    item.position?.ownership === 'own' ? 'badge-blue' : 'badge-orange'
                  }`}
                >
                  {item.position?.ownership === 'own' ? 'Наш' : 'Клиента'}
                </span>
              </div>
              {item.operation === 'income' && item.supplier && (
                <div className="text-sm text-slate-500">
                  Поставщик: <span className="text-slate-700">{item.supplier.name}</span>
                </div>
              )}
              {item.operation === 'expense' && item.buyer && (
                <div className="text-sm text-slate-500">
                  Покупатель: <span className="text-slate-700">{item.buyer.name}</span>
                </div>
              )}
              {item.destination && (
                <div className="text-sm text-slate-500">
                  Куда: <span className="text-slate-700">{item.destination}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-slate-800">Вес: {item.weight} т</span>
                {item.price_per_ton ? (
                  <span className="text-slate-500">{item.price_per_ton.toLocaleString('ru-RU')} ₽/т</span>
                ) : null}
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="font-bold text-slate-800">
                  {item.total_value ? `Сумма: ${item.total_value.toLocaleString('ru-RU')} ₽` : ''}
                </span>
                <span className="text-slate-400">{item.cost ? `Погр./Разгр.: ${item.cost.toLocaleString('ru-RU')}` : ''}</span>
              </div>
              {item.payment_method && (
                <span className="text-xs text-slate-500">
                  {item.payment_method === 'cash' ? 'Нал' : 'Безнал'}
                </span>
              )}
              {item.note ? (
                <p className="text-sm text-slate-500 truncate">{item.note}</p>
              ) : null}
              {(isAdmin || item.created_by === user?.id) && (
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className="p-2 text-slate-400 hover:text-blue-600 transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-blue-50"
                    aria-label="Редактировать"
                  >
                    <Edit2 size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id, item.created_by)}
                    className="p-2 text-slate-400 hover:text-red-600 transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-red-50"
                    aria-label="Удалить"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Table: desktop only - full width */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-3 py-3 whitespace-nowrap">Дата</th>
                <th className="px-3 py-3 whitespace-nowrap">Компания</th>
                <th className="px-3 py-3 whitespace-nowrap">Операция</th>
                <th className="px-3 py-3 whitespace-nowrap">Материал</th>
                <th className="px-3 py-3 whitespace-nowrap">Размер</th>
                <th className="px-3 py-3 whitespace-nowrap">Владение</th>
                <th className="px-3 py-3 whitespace-nowrap">Поставщик/Покупатель</th>
                <th className="px-3 py-3 whitespace-nowrap">Куда</th>
                <th className="px-3 py-3 text-right whitespace-nowrap">Вес (т)</th>
                <th className="px-3 py-3 text-right whitespace-nowrap">Цена/т</th>
                <th className="px-3 py-3 text-right whitespace-nowrap bg-blue-50/50">Сумма</th>
                <th className="px-3 py-3 text-right whitespace-nowrap">Погр./Разгр.</th>
                <th className="px-3 py-3 whitespace-nowrap">Оплата</th>
                <th className="px-3 py-3 whitespace-nowrap">Примечание</th>
                <th className="px-3 py-3 text-center">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={15} className="px-3 py-8 text-center text-slate-400">
                    Нет записей. Добавьте первую операцию.
                  </td>
                </tr>
              ) : (
                filteredMovements.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2">
                      {new Date(item.movement_date).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-700">
                      {item.position?.company?.name || '—'}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`badge ${
                          item.operation === 'income' ? 'badge-green' : 'badge-red'
                        }`}
                      >
                        {item.operation === 'income' ? 'Приход' : 'Расход'}
                      </span>
                    </td>
                    <td className="px-3 py-2">{item.position?.material?.name || '—'}</td>
                    <td className="px-3 py-2">{item.position?.size || '—'}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`badge ${
                          item.position?.ownership === 'own' ? 'badge-blue' : 'badge-orange'
                        }`}
                      >
                        {item.position?.ownership === 'own' ? 'Наш' : 'Клиента'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {item.operation === 'income' 
                        ? (item.supplier?.name || '—')
                        : (item.buyer?.name || '—')
                      }
                    </td>
                    <td className="px-3 py-2 text-slate-600">{item.destination || '—'}</td>
                    <td className="px-3 py-2 text-right font-medium">{item.weight}</td>
                    <td className="px-3 py-2 text-right text-slate-500">
                      {item.price_per_ton ? item.price_per_ton.toLocaleString('ru-RU') : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-bold bg-blue-50/30 text-slate-800">
                      {item.total_value ? item.total_value.toLocaleString('ru-RU') : '—'}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-500">
                      {item.cost ? item.cost.toLocaleString('ru-RU') : '—'}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {item.payment_method === 'cash' ? 'Нал' : 'Безнал'}
                    </td>
                    <td className="px-3 py-2 text-slate-500 truncate max-w-[150px]" title={item.note || ''}>
                      {item.note || '—'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {(isAdmin || item.created_by === user?.id) && (
                        <>
                          <button
                            onClick={() => openEdit(item)}
                            className="text-slate-400 hover:text-blue-600 transition-colors p-1 mr-1"
                            title="Редактировать"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.created_by)}
                            className="text-slate-400 hover:text-red-600 transition-colors p-1"
                            title="Удалить"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 safe-area-inset"
          onClick={(e) => e.target === e.currentTarget && requestCloseModal()}
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] sm:max-h-[85vh] overflow-hidden animate-fade-in flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 flex-shrink-0">
              <h3 className="font-bold text-lg text-slate-800">{editingId ? 'Редактировать движение' : 'Новое движение'}</h3>
              <button
                type="button"
                onClick={requestCloseModal}
                className="p-2 -m-2 text-slate-400 hover:text-slate-600 text-2xl leading-none touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Закрыть"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Дата</label>
                <input
                  type="date"
                  required
                  className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  value={formState.movement_date}
                  onChange={(e) => updateFormField('movement_date', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Операция</label>
                <select
                  className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  value={formState.operation}
                  onChange={(e) => updateFormField('operation', e.target.value as OperationType)}
                >
                  <option value="income">Приход</option>
                  <option value="expense">Расход</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Компания (владелец)</label>
                <select
                  required
                  disabled={!!editingId}
                  className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border disabled:bg-slate-100 disabled:text-slate-500"
                  value={formState.company_id}
                  onChange={(e) => updateFormField('company_id', e.target.value)}
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
                  disabled={!!editingId}
                  className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border disabled:bg-slate-100 disabled:text-slate-500"
                  value={formState.material_id}
                  onChange={(e) => updateFormField('material_id', e.target.value)}
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
                  placeholder="Например: 530"
                  disabled={!!editingId}
                  className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border disabled:bg-slate-100 disabled:text-slate-500"
                  value={formState.size}
                  onChange={(e) => updateFormField('size', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Владение</label>
                <select
                  className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border disabled:bg-slate-100 disabled:text-slate-500"
                  value={formState.ownership}
                  disabled={!!editingId}
                  onChange={(e) => updateFormField('ownership', e.target.value as OwnershipType)}
                >
                  <option value="own">Наш товар</option>
                  <option value="client_storage">Товар клиента</option>
                </select>
              </div>

              {/* Поставщик (для прихода) */}
              {formState.operation === 'income' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Поставщик</label>
                  <select
                    className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                    value={formState.supplier_id}
                    onChange={(e) => updateFormField('supplier_id', e.target.value)}
                  >
                    <option value="">Выберите поставщика...</option>
                    {suppliers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Покупатель (для расхода) */}
              {formState.operation === 'expense' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Покупатель</label>
                  <select
                    className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                    value={formState.buyer_id}
                    onChange={(e) => updateFormField('buyer_id', e.target.value)}
                  >
                    <option value="">Выберите покупателя...</option>
                    {buyers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Место хранения / Куда */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Куда (место хранения)</label>
                <input
                  type="text"
                  placeholder="Например: Кулаково, транзит..."
                  className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  value={formState.destination}
                  onChange={(e) => updateFormField('destination', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Способ оплаты</label>
                <select
                  className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  value={formState.payment_method}
                  onChange={(e) => updateFormField('payment_method', e.target.value as PaymentMethodType)}
                >
                  <option value="cash">Нал</option>
                  <option value="cashless">Безнал</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Вес (тонн)</label>
                <input
                  type="number"
                  step="0.001"
                  required
                  placeholder="Введите вес"
                  className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  value={formState.weight || ''}
                  onChange={(e) => updateFormField('weight', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Цена за тонну (₽)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Цена за тонну"
                  className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  value={formState.price_per_ton || ''}
                  onChange={(e) => updateFormField('price_per_ton', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Сумма сделки</label>
                <div className="w-full bg-slate-100 rounded-lg p-2 border border-slate-200 text-slate-700 font-mono">
                  {((formState.weight || 0) * (formState.price_per_ton || 0)).toLocaleString('ru-RU')} ₽
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Стоимость погр./разгр. <span className="text-slate-400 font-normal">(авто: 1000×вес)</span>
                </label>
                <input
                  type="number"
                  placeholder="Введите стоимость"
                  className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  value={formState.cost || ''}
                  onChange={(e) => handleCostChange(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Примечание</label>
                <textarea
                  rows={2}
                  className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  value={formState.note}
                  onChange={(e) => updateFormField('note', e.target.value)}
                />
              </div>

              <div className="sm:col-span-2 flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100 flex-shrink-0">
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
    </div>
  );
};

export default Movements;
