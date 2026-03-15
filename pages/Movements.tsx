import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Movement, Company, Material, MovementInput, OwnershipType, OperationType, PaymentMethodType } from '../types';
import { getMovements, createMovement, updateMovement, deleteMovement, getCompanies, getMaterials, createCompany } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Search, Filter, Loader2, Edit2, ChevronDown, FileSpreadsheet } from 'lucide-react';
import DateFilter, { DateRange } from '../components/DateFilter';
import { exportToXlsx, formatDate, formatNumber, formatCurrency } from '../utils/export';

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
  const [dateRange, setDateRange] = useState<DateRange>({ dateFrom: null, dateTo: null });
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
    linear_meters: 0,
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
  const [hasLoadingCost, setHasLoadingCost] = useState(false);

  // Combobox state for supplier/buyer
  const [supplierInput, setSupplierInput] = useState('');
  const [buyerInput, setBuyerInput] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [showBuyerDropdown, setShowBuyerDropdown] = useState(false);
  const supplierInputRef = useRef<HTMLInputElement>(null);
  const supplierDropdownRef = useRef<HTMLDivElement>(null);
  const buyerInputRef = useRef<HTMLInputElement>(null);
  const buyerDropdownRef = useRef<HTMLDivElement>(null);

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

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        supplierDropdownRef.current && 
        !supplierDropdownRef.current.contains(e.target as Node) &&
        supplierInputRef.current &&
        !supplierInputRef.current.contains(e.target as Node)
      ) {
        setShowSupplierDropdown(false);
      }
      if (
        buyerDropdownRef.current && 
        !buyerDropdownRef.current.contains(e.target as Node) &&
        buyerInputRef.current &&
        !buyerInputRef.current.contains(e.target as Node)
      ) {
        setShowBuyerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormState(getEmptyForm());
    setFormDirty(false);
    setHasLoadingCost(false);
    setSupplierInput('');
    setBuyerInput('');
  }, [getEmptyForm]);

  const requestCloseModal = useCallback(() => {
    if (formDirty && !window.confirm('Закрыть без сохранения? Несохранённые данные будут потеряны.')) return;
    closeModal();
  }, [formDirty, closeModal]);

  const openCreate = useCallback(() => {
    setEditingId(null);
    setFormState(getEmptyForm());
    setFormDirty(false);
    setHasLoadingCost(false);
    setSupplierInput('');
    setBuyerInput('');
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
      linear_meters: m.linear_meters ?? 0,
      cost: m.cost ?? 0,
      price_per_ton: m.price_per_ton ?? 0,
      payment_method: (m.payment_method as PaymentMethodType) ?? 'cashless',
      supplier_id: m.supplier_id ?? '',
      buyer_id: m.buyer_id ?? '',
      destination: m.destination ?? '',
      note: m.note ?? '',
    });
    setSupplierInput(m.supplier?.name || '');
    setBuyerInput(m.buyer?.name || '');
    setFormDirty(false);
    setHasLoadingCost((m.cost ?? 0) > 0);
    setIsModalOpen(true);
  }, []);

  const updateFormField = useCallback(<K extends keyof MovementInput>(field: K, value: MovementInput[K]) => {
    setFormState(prev => {
      const next = { ...prev, [field]: value };
      return next;
    });
    setFormDirty(true);
  }, []);

  const toggleLoadingCost = useCallback((enabled: boolean) => {
    setHasLoadingCost(enabled);
    if (enabled) {
      setFormState(prev => ({ ...prev, cost: Math.round(prev.weight * LOADING_COST_PER_TON) }));
    } else {
      setFormState(prev => ({ ...prev, cost: 0 }));
    }
    setFormDirty(true);
  }, []);

  const handleWeightChange = useCallback((value: number) => {
    setFormState(prev => {
      const next = { ...prev, weight: value };
      if (hasLoadingCost) {
        next.cost = Math.round(value * LOADING_COST_PER_TON);
      }
      return next;
    });
    setFormDirty(true);
  }, [hasLoadingCost]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      try {
        setSubmitting(true);
        const updated = await updateMovement(editingId, {
          movement_date: formState.movement_date,
          operation: formState.operation,
          weight: formState.weight,
          linear_meters: formState.linear_meters || null,
          cost: hasLoadingCost ? formState.cost : 0,
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

  const filteredSuppliers = suppliers.filter(c => 
    c.name.toLowerCase().includes(supplierInput.toLowerCase())
  );
  const filteredBuyers = buyers.filter(c => 
    c.name.toLowerCase().includes(buyerInput.toLowerCase())
  );

  const selectSupplier = (company: Company | null) => {
    if (company) {
      setFormState(prev => ({ ...prev, supplier_id: company.id }));
      setSupplierInput(company.name);
    } else {
      setFormState(prev => ({ ...prev, supplier_id: '' }));
      setSupplierInput('');
    }
    setShowSupplierDropdown(false);
    setFormDirty(true);
  };

  const selectBuyer = (company: Company | null) => {
    if (company) {
      setFormState(prev => ({ ...prev, buyer_id: company.id }));
      setBuyerInput(company.name);
    } else {
      setFormState(prev => ({ ...prev, buyer_id: '' }));
      setBuyerInput('');
    }
    setShowBuyerDropdown(false);
    setFormDirty(true);
  };

  const handleCreateSupplier = async () => {
    if (!supplierInput.trim()) return;
    try {
      const newCompany = await createCompany({ name: supplierInput.trim(), type: 'supplier', active: true });
      setCompanies(prev => [...prev, newCompany]);
      setFormState(prev => ({ ...prev, supplier_id: newCompany.id }));
      setShowSupplierDropdown(false);
      setFormDirty(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания компании');
    }
  };

  const handleCreateBuyer = async () => {
    if (!buyerInput.trim()) return;
    try {
      const newCompany = await createCompany({ name: buyerInput.trim(), type: 'buyer', active: true });
      setCompanies(prev => [...prev, newCompany]);
      setFormState(prev => ({ ...prev, buyer_id: newCompany.id }));
      setShowBuyerDropdown(false);
      setFormDirty(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания компании');
    }
  };

  const filteredMovements = movements.filter((m) => {
    const companyName = m.position?.company?.name || '';
    const materialName = m.position?.material?.name || '';
    const size = m.position?.size || '';
    const supplierName = m.supplier?.name || '';
    const buyerName = m.buyer?.name || '';
    const destination = m.destination || '';
    const term = searchTerm.toLowerCase();
    
    const matchesSearch = (
      companyName.toLowerCase().includes(term) ||
      materialName.toLowerCase().includes(term) ||
      size.toLowerCase().includes(term) ||
      supplierName.toLowerCase().includes(term) ||
      buyerName.toLowerCase().includes(term) ||
      destination.toLowerCase().includes(term)
    );
    
    const matchesDateRange = (() => {
      if (!dateRange.dateFrom && !dateRange.dateTo) return true;
      const movementDate = m.movement_date;
      if (dateRange.dateFrom && movementDate < dateRange.dateFrom) return false;
      if (dateRange.dateTo && movementDate > dateRange.dateTo) return false;
      return true;
    })();
    
    return matchesSearch && matchesDateRange;
  });

  const handleExportXlsx = () => {
    exportToXlsx<Movement>(filteredMovements, [
      { header: 'Дата', accessor: (m: Movement) => formatDate(m.movement_date), width: 12 },
      { header: 'Операция', accessor: (m: Movement) => m.operation === 'income' ? 'Приход' : 'Расход', width: 10 },
      { header: 'Компания', accessor: (m: Movement) => m.position?.company?.name || '', width: 20 },
      { header: 'Материал', accessor: (m: Movement) => m.position?.material?.name || '', width: 20 },
      { header: 'Размер', accessor: (m: Movement) => m.position?.size || '', width: 12 },
      { header: 'Вес (т)', accessor: (m: Movement) => formatNumber(m.weight, 3), width: 10 },
      { header: 'Метры', accessor: (m: Movement) => formatNumber(m.linear_meters || 0, 2), width: 10 },
      { header: 'Цена/т', accessor: (m: Movement) => formatCurrency(m.price_per_ton), width: 12 },
      { header: 'Сумма', accessor: (m: Movement) => formatCurrency(m.total_value), width: 12 },
      { header: 'Погр./разгр.', accessor: (m: Movement) => formatCurrency(m.cost), width: 12 },
      { header: 'Поставщик', accessor: (m: Movement) => m.supplier?.name || '', width: 18 },
      { header: 'Покупатель', accessor: (m: Movement) => m.buyer?.name || '', width: 18 },
      { header: 'Примечание', accessor: (m: Movement) => m.note || '', width: 25 },
    ], `Движение_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

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
            Добавить запись
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
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
        <DateFilter value={dateRange} onChange={setDateRange} />
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
              <div className="text-sm text-slate-500">
                Размер: {item.position?.size || '—'}
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
                <span className="font-medium text-slate-800">
                  Вес: {item.weight} т{item.linear_meters ? ` · ${item.linear_meters} м` : ''}
                </span>
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
                <th className="px-2 py-3 whitespace-nowrap">Дата</th>
                <th className="px-2 py-3 whitespace-nowrap">Компания</th>
                <th className="px-2 py-3 whitespace-nowrap">Операция</th>
                <th className="px-2 py-3 whitespace-nowrap">Материал</th>
                <th className="px-2 py-3 whitespace-nowrap">Размер</th>
                <th className="px-2 py-3 whitespace-nowrap max-w-[100px]">Пост./Пок.</th>
                <th className="px-2 py-3 whitespace-nowrap">Куда</th>
                <th className="px-2 py-3 text-right whitespace-nowrap">Вес (т)</th>
                <th className="px-2 py-3 text-right whitespace-nowrap">Метры</th>
                <th className="px-2 py-3 text-right whitespace-nowrap">Цена/т</th>
                <th className="px-2 py-3 text-right whitespace-nowrap bg-blue-50/50">Сумма</th>
                <th className="px-2 py-3 text-right whitespace-nowrap">Погр.</th>
                <th className="px-2 py-3 whitespace-nowrap">Оплата</th>
                <th className="px-2 py-3 whitespace-nowrap">Примечание</th>
                <th className="px-2 py-3 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-3 py-8 text-center text-slate-400">
                    Нет записей. Добавьте первую операцию.
                  </td>
                </tr>
              ) : (
                filteredMovements.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-2 py-2 text-sm">
                      {new Date(item.movement_date).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-2 py-2 font-medium text-slate-700 text-sm">
                      {item.position?.company?.name || '—'}
                    </td>
                    <td className="px-2 py-2">
                      <span
                        className={`badge text-xs ${
                          item.operation === 'income' ? 'badge-green' : 'badge-red'
                        }`}
                      >
                        {item.operation === 'income' ? 'Приход' : 'Расход'}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-sm">{item.position?.material?.name || '—'}</td>
                    <td className="px-2 py-2 text-sm">{item.position?.size || '—'}</td>
                    <td className="px-2 py-2 text-slate-600 text-sm truncate max-w-[100px]" title={item.operation === 'income' ? (item.supplier?.name || '') : (item.buyer?.name || '')}>
                      {item.operation === 'income' 
                        ? (item.supplier?.name || '—')
                        : (item.buyer?.name || '—')
                      }
                    </td>
                    <td className="px-2 py-2 text-slate-600 text-sm">{item.destination || '—'}</td>
                    <td className="px-2 py-2 text-right font-medium text-sm">{item.weight}</td>
                    <td className="px-2 py-2 text-right text-slate-500 text-sm">
                      {item.linear_meters ? item.linear_meters : '—'}
                    </td>
                    <td className="px-2 py-2 text-right text-slate-500 text-sm">
                      {item.price_per_ton ? item.price_per_ton.toLocaleString('ru-RU') : '—'}
                    </td>
                    <td className="px-2 py-2 text-right font-bold bg-blue-50/30 text-slate-800 text-sm">
                      {item.total_value ? item.total_value.toLocaleString('ru-RU') : '—'}
                    </td>
                    <td className="px-2 py-2 text-right text-slate-500 text-sm">
                      {item.cost ? item.cost.toLocaleString('ru-RU') : '—'}
                    </td>
                    <td className="px-2 py-2 text-slate-600 text-sm">
                      {item.payment_method === 'cash' ? 'Нал' : 'Безнал'}
                    </td>
                    <td className="px-2 py-2 text-slate-500 truncate max-w-[120px] text-sm" title={item.note || ''}>
                      {item.note || '—'}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {(isAdmin || item.created_by === user?.id) && (
                        <div className="flex items-center justify-center gap-0.5">
                          <button
                            onClick={() => openEdit(item)}
                            className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                            title="Редактировать"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.created_by)}
                            className="text-slate-400 hover:text-red-600 transition-colors p-1"
                            title="Удалить"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
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
                  <div className="relative">
                    <input
                      ref={supplierInputRef}
                      type="text"
                      placeholder="Выберите или введите..."
                      className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border pr-8"
                      value={supplierInput}
                      onChange={(e) => {
                        setSupplierInput(e.target.value);
                        setShowSupplierDropdown(true);
                        if (!e.target.value) {
                          setFormState(prev => ({ ...prev, supplier_id: '' }));
                        }
                        setFormDirty(true);
                      }}
                      onFocus={() => setShowSupplierDropdown(true)}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      onClick={() => setShowSupplierDropdown(!showSupplierDropdown)}
                    >
                      <ChevronDown size={18} />
                    </button>
                    {showSupplierDropdown && (
                      <div 
                        ref={supplierDropdownRef}
                        className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                      >
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-500"
                          onClick={() => selectSupplier(null)}
                        >
                          Не указан
                        </button>
                        {filteredSuppliers.map((c) => (
                          <button
                            type="button"
                            key={c.id}
                            className={`w-full text-left px-3 py-2 hover:bg-slate-50 ${formState.supplier_id === c.id ? 'bg-blue-50 text-blue-700' : ''}`}
                            onClick={() => selectSupplier(c)}
                          >
                            {c.name}
                          </button>
                        ))}
                        {supplierInput.trim() && !companies.some(c => c.name.toLowerCase() === supplierInput.toLowerCase()) && (
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-green-50 text-green-700 border-t border-slate-100 flex items-center gap-2"
                            onClick={handleCreateSupplier}
                          >
                            <Plus size={16} />
                            Создать «{supplierInput.trim()}»
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Покупатель (для расхода) */}
              {formState.operation === 'expense' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Покупатель</label>
                  <div className="relative">
                    <input
                      ref={buyerInputRef}
                      type="text"
                      placeholder="Выберите или введите..."
                      className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border pr-8"
                      value={buyerInput}
                      onChange={(e) => {
                        setBuyerInput(e.target.value);
                        setShowBuyerDropdown(true);
                        if (!e.target.value) {
                          setFormState(prev => ({ ...prev, buyer_id: '' }));
                        }
                        setFormDirty(true);
                      }}
                      onFocus={() => setShowBuyerDropdown(true)}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      onClick={() => setShowBuyerDropdown(!showBuyerDropdown)}
                    >
                      <ChevronDown size={18} />
                    </button>
                    {showBuyerDropdown && (
                      <div 
                        ref={buyerDropdownRef}
                        className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                      >
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-500"
                          onClick={() => selectBuyer(null)}
                        >
                          Не указан
                        </button>
                        {filteredBuyers.map((c) => (
                          <button
                            type="button"
                            key={c.id}
                            className={`w-full text-left px-3 py-2 hover:bg-slate-50 ${formState.buyer_id === c.id ? 'bg-blue-50 text-blue-700' : ''}`}
                            onClick={() => selectBuyer(c)}
                          >
                            {c.name}
                          </button>
                        ))}
                        {buyerInput.trim() && !companies.some(c => c.name.toLowerCase() === buyerInput.toLowerCase()) && (
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-green-50 text-green-700 border-t border-slate-100 flex items-center gap-2"
                            onClick={handleCreateBuyer}
                          >
                            <Plus size={16} />
                            Создать «{buyerInput.trim()}»
                          </button>
                        )}
                      </div>
                    )}
                  </div>
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
                  onChange={(e) => handleWeightChange(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Погонные метры</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Опционально"
                  className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  value={formState.linear_meters || ''}
                  onChange={(e) => updateFormField('linear_meters', parseFloat(e.target.value) || 0)}
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
                <div className="flex items-center gap-2 mb-1">
                  <input
                    type="checkbox"
                    id="hasLoadingCost"
                    checked={hasLoadingCost}
                    onChange={(e) => toggleLoadingCost(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="hasLoadingCost" className="text-sm font-medium text-slate-700 cursor-pointer">
                    Погр./разгр. работы
                  </label>
                </div>
                {hasLoadingCost && (
                  <div className="mt-2">
                    <input
                      type="number"
                      placeholder="Авто: 1000×вес"
                      className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                      value={formState.cost || ''}
                      onChange={(e) => updateFormField('cost', parseFloat(e.target.value) || 0)}
                    />
                    <p className="text-xs text-slate-400 mt-1">Авто: {Math.round(formState.weight * LOADING_COST_PER_TON).toLocaleString('ru-RU')} ₽</p>
                  </div>
                )}
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
