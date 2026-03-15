import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Expense, ExpenseInput, ExpenseCategory, Company, FinanceOperationType, PaymentMethodType, Movement } from '../types';
import { getExpenses, createExpense, updateExpense, deleteExpense, getCompanies, createCompany, getMovements } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Loader2, Wallet, Search, Filter, Edit2, ChevronDown, ArrowDownCircle, ArrowUpCircle, Link, FileSpreadsheet } from 'lucide-react';
import DateFilter, { DateRange } from '../components/DateFilter';
import { exportToXlsx, formatDate, formatCurrency } from '../utils/export';

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  transport: 'Логистика',
  loading: 'Погрузка/Разгрузка',
  processing: 'Обработка',
  rent_salary: 'Аренда/Зарплата',
  other: 'Прочее',
};

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  transport: 'badge-blue',
  loading: 'badge-orange',
  processing: 'badge-green',
  rent_salary: 'badge-red',
  other: 'badge-gray',
};

const Finance: React.FC = () => {
  const { isAdmin, user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formDirty, setFormDirty] = useState(false);
  
  // Filters
  const [filterCategory, setFilterCategory] = useState<ExpenseCategory | ''>('');
  const [filterOperationType, setFilterOperationType] = useState<FinanceOperationType | ''>('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<PaymentMethodType | ''>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>({ dateFrom: null, dateTo: null });

  // Combobox state for counterparty
  const [counterpartyInput, setCounterpartyInput] = useState('');
  const [showCounterpartyDropdown, setShowCounterpartyDropdown] = useState(false);
  const counterpartyInputRef = useRef<HTMLInputElement>(null);
  const counterpartyDropdownRef = useRef<HTMLDivElement>(null);

  const getEmptyForm = useCallback((): ExpenseInput => ({
    expense_date: new Date().toISOString().split('T')[0],
    operation_type: 'expense',
    category: 'transport',
    description: '',
    amount: 0,
    payment_method: 'cashless',
    payment_status: 'unpaid',
    payer_id: null,
    recipient_id: null,
    company_id: null,
    movement_id: null,
    note: '',
  }), []);

  const [formState, setFormState] = useState<ExpenseInput>(getEmptyForm);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        setLoading(true);
        const [expensesData, companiesData, movementsData] = await Promise.all([
          getExpenses(),
          getCompanies(),
          getMovements(),
        ]);
        if (isMounted) {
          setExpenses(expensesData);
          setCompanies(companiesData);
          setMovements(movementsData);
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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        counterpartyDropdownRef.current && 
        !counterpartyDropdownRef.current.contains(e.target as Node) &&
        counterpartyInputRef.current &&
        !counterpartyInputRef.current.contains(e.target as Node)
      ) {
        setShowCounterpartyDropdown(false);
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
    setCounterpartyInput('');
  }, [getEmptyForm]);

  const requestCloseModal = useCallback(() => {
    if (formDirty && !window.confirm('Закрыть без сохранения? Несохранённые данные будут потеряны.')) return;
    closeModal();
  }, [formDirty, closeModal]);

  const openCreate = useCallback(() => {
    setEditingId(null);
    setFormState(getEmptyForm());
    setCounterpartyInput('');
    setFormDirty(false);
    setIsModalOpen(true);
  }, [getEmptyForm]);

  const openEdit = useCallback((exp: Expense) => {
    setEditingId(exp.id);
    setFormState({
      expense_date: exp.expense_date,
      operation_type: exp.operation_type || 'expense',
      category: exp.category,
      description: exp.description,
      amount: exp.amount,
      payment_method: exp.payment_method || 'cashless',
      payment_status: exp.payment_status ?? 'unpaid',
      payer_id: exp.payer_id ?? null,
      recipient_id: exp.recipient_id ?? null,
      company_id: exp.company_id ?? null,
      movement_id: exp.movement_id ?? null,
      note: exp.note ?? '',
    });
    setCounterpartyInput(exp.company?.name || exp.payer?.name || exp.recipient?.name || '');
    setFormDirty(false);
    setIsModalOpen(true);
  }, []);

  const filteredCounterpartyCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(counterpartyInput.toLowerCase())
  );

  const selectCounterparty = (company: Company | null) => {
    if (company) {
      setFormState(prev => ({ ...prev, company_id: company.id }));
      setCounterpartyInput(company.name);
    } else {
      setFormState(prev => ({ ...prev, company_id: null }));
      setCounterpartyInput('');
    }
    setShowCounterpartyDropdown(false);
    setFormDirty(true);
  };

  const handleCreateCounterparty = async () => {
    if (!counterpartyInput.trim()) return;
    try {
      const newCompany = await createCompany({ name: counterpartyInput.trim(), type: 'both', active: true });
      setCompanies(prev => [...prev, newCompany]);
      setFormState(prev => ({ ...prev, company_id: newCompany.id }));
      setShowCounterpartyDropdown(false);
      setFormDirty(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания компании');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.description || !formState.amount) return;
    try {
      setSubmitting(true);
      setError(null);
      if (editingId) {
        const updated = await updateExpense(editingId, formState);
        setExpenses((prev) => prev.map((ex) => (ex.id === editingId ? updated : ex)));
      } else {
        const newExpense = await createExpense(formState);
        setExpenses((prev) => [newExpense, ...prev]);
      }
      closeModal();
    } catch (err) {
      console.error('Finance handleSubmit error:', err);
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
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
      await deleteExpense(id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  const filtered = expenses.filter((e) => {
    const matchCategory = !filterCategory || e.category === filterCategory;
    const matchOperationType = !filterOperationType || e.operation_type === filterOperationType;
    const matchPaymentMethod = !filterPaymentMethod || e.payment_method === filterPaymentMethod;
    const matchSearch = !searchTerm ||
      e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.company?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.payer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.recipient?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.note || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchDateRange = (() => {
      if (!dateRange.dateFrom && !dateRange.dateTo) return true;
      const expenseDate = e.expense_date;
      if (dateRange.dateFrom && expenseDate < dateRange.dateFrom) return false;
      if (dateRange.dateTo && expenseDate > dateRange.dateTo) return false;
      return true;
    })();
    
    return matchCategory && matchOperationType && matchPaymentMethod && matchSearch && matchDateRange;
  });

  const totalIncome = filtered.filter(e => e.operation_type === 'income').reduce((acc, e) => acc + e.amount, 0);
  const totalExpense = filtered.filter(e => e.operation_type === 'expense' || !e.operation_type).reduce((acc, e) => acc + e.amount, 0);

  const handleExportXlsx = () => {
    exportToXlsx<Expense>(filtered, [
      { header: 'Дата', accessor: (e: Expense) => formatDate(e.expense_date), width: 12 },
      { header: 'Тип', accessor: (e: Expense) => e.operation_type === 'income' ? 'Приход' : 'Расход', width: 10 },
      { header: 'Категория', accessor: (e: Expense) => CATEGORY_LABELS[e.category], width: 18 },
      { header: 'Описание', accessor: (e: Expense) => e.description, width: 30 },
      { header: 'Сумма', accessor: (e: Expense) => formatCurrency(e.amount), width: 12 },
      { header: 'Оплата', accessor: (e: Expense) => e.payment_method === 'cash' ? 'Нал' : 'Безнал', width: 10 },
      { header: 'Статус', accessor: (e: Expense) => e.payment_status === 'paid' ? 'Оплачено' : 'Не оплачено', width: 12 },
      { header: 'Контрагент', accessor: (e: Expense) => e.company?.name || e.payer?.name || e.recipient?.name || '', width: 20 },
      { header: 'Примечание', accessor: (e: Expense) => e.note || '', width: 25 },
    ], `Финансы_${new Date().toISOString().split('T')[0]}.xlsx`);
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
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Wallet className="text-blue-600" />
            Финансы
          </h2>
          <p className="text-slate-500 text-sm">Приходы и расходы денежных средств</p>
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

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="text-sm text-green-700 font-medium">Приход</div>
          <div className="text-xl font-bold text-green-800">{totalIncome.toLocaleString('ru-RU')} ₽</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="text-sm text-red-700 font-medium">Расход</div>
          <div className="text-xl font-bold text-red-800">{totalExpense.toLocaleString('ru-RU')} ₽</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Поиск..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-600"
            value={filterOperationType}
            onChange={(e) => setFilterOperationType(e.target.value as FinanceOperationType | '')}
          >
            <option value="">Все операции</option>
            <option value="income">Приход</option>
            <option value="expense">Расход</option>
          </select>
          <select
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-600"
            value={filterPaymentMethod}
            onChange={(e) => setFilterPaymentMethod(e.target.value as PaymentMethodType | '')}
          >
            <option value="">Нал + Безнал</option>
            <option value="cash">Только нал</option>
            <option value="cashless">Только безнал</option>
          </select>
          <select
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-600"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as ExpenseCategory | '')}
          >
            <option value="">Все категории</option>
            {(Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map((cat) => (
              <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
            ))}
          </select>
          <div className="flex items-center text-slate-500 text-sm gap-2 sm:px-2">
            <Filter size={16} />
            <span>{filtered.length}</span>
          </div>
        </div>
        <DateFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-400">
            Нет записей.
          </div>
        ) : (
          filtered.map((item) => (
            <div key={item.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {item.operation_type === 'income' ? (
                    <ArrowDownCircle size={18} className="text-green-600" />
                  ) : (
                    <ArrowUpCircle size={18} className="text-red-600" />
                  )}
                  <span className="text-sm font-medium text-slate-700">
                    {new Date(item.expense_date).toLocaleDateString('ru-RU')}
                  </span>
                </div>
                <div className="flex gap-1">
                  <span className={`badge shrink-0 ${item.payment_method === 'cash' ? 'badge-orange' : 'badge-blue'}`}>
                    {item.payment_method === 'cash' ? 'Нал' : 'БН'}
                  </span>
                  <span className={`badge shrink-0 ${CATEGORY_COLORS[item.category]}`}>
                    {CATEGORY_LABELS[item.category]}
                  </span>
                </div>
              </div>
              <div className="text-sm font-medium text-slate-800">{item.description}</div>
              <div className="text-xs text-slate-500 space-y-0.5">
                {(item.company || item.payer || item.recipient) && (
                  <div>{item.operation_type === 'income' ? 'От' : 'Кому'}: {item.company?.name || item.payer?.name || item.recipient?.name}</div>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className={`font-bold text-lg ${item.operation_type === 'income' ? 'text-green-700' : 'text-red-700'}`}>
                  {item.operation_type === 'income' ? '+' : '-'}{item.amount.toLocaleString('ru-RU')} ₽
                </span>
                <span className={`badge ${item.payment_status === 'paid' ? 'badge-green' : 'badge-orange'}`}>
                  {item.payment_status === 'paid' ? 'Оплачено' : 'Не оплачено'}
                </span>
              </div>
              {item.note && <p className="text-sm text-slate-500 truncate">{item.note}</p>}
              {(isAdmin || item.created_by === user?.id) && (
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className="p-2 text-slate-400 hover:text-blue-600 transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-blue-50"
                  >
                    <Edit2 size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id, item.created_by)}
                    className="p-2 text-slate-400 hover:text-red-600 transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-red-50"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-3 py-3 whitespace-nowrap">Дата</th>
                <th className="px-3 py-3 whitespace-nowrap">Тип</th>
                <th className="px-3 py-3 whitespace-nowrap">Нал/БН</th>
                <th className="px-3 py-3 whitespace-nowrap">Категория</th>
                <th className="px-3 py-3 whitespace-nowrap">Описание</th>
                <th className="px-3 py-3 whitespace-nowrap">Контрагент</th>
                <th className="px-3 py-3 text-right whitespace-nowrap">Сумма</th>
                <th className="px-3 py-3 whitespace-nowrap">Статус</th>
                <th className="px-3 py-3 whitespace-nowrap">Прим.</th>
                <th className="px-3 py-3 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center text-slate-400">
                    Нет записей.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2 text-sm">
                      {new Date(item.expense_date).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-3 py-2">
                      {item.operation_type === 'income' ? (
                        <span className="badge badge-green">Приход</span>
                      ) : (
                        <span className="badge badge-red">Расход</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`badge ${item.payment_method === 'cash' ? 'badge-orange' : 'badge-blue'}`}>
                        {item.payment_method === 'cash' ? 'Нал' : 'БН'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`badge ${CATEGORY_COLORS[item.category]}`}>
                        {CATEGORY_LABELS[item.category]}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-700 max-w-[200px] truncate" title={item.description}>
                      {item.description}
                    </td>
                    <td className="px-3 py-2 text-slate-600 text-sm">{item.company?.name || item.payer?.name || item.recipient?.name || '—'}</td>
                    <td className={`px-3 py-2 text-right font-bold ${item.operation_type === 'income' ? 'text-green-700' : 'text-red-700'}`}>
                      {item.operation_type === 'income' ? '+' : '-'}{item.amount.toLocaleString('ru-RU')}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`badge ${item.payment_status === 'paid' ? 'badge-green' : 'badge-orange'}`}>
                        {item.payment_status === 'paid' ? 'Опл' : 'Нет'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-500 text-sm truncate max-w-[100px]" title={item.note || ''}>
                      {item.note || '—'}
                    </td>
                    <td className="px-3 py-2 text-center">
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
            <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
              <tr>
                <td colSpan={6} className="px-3 py-3 text-right">ИТОГО:</td>
                <td className="px-3 py-3 text-right">
                  <span className="text-green-700">+{totalIncome.toLocaleString('ru-RU')}</span>
                  {' / '}
                  <span className="text-red-700">-{totalExpense.toLocaleString('ru-RU')}</span>
                </td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
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
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] sm:max-h-[85vh] overflow-hidden animate-fade-in flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 flex-shrink-0">
              <h3 className="font-bold text-lg text-slate-800">{editingId ? 'Редактировать' : 'Новая запись'}</h3>
              <button
                type="button"
                onClick={requestCloseModal}
                className="p-2 -m-2 text-slate-400 hover:text-slate-600 text-2xl leading-none touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {/* Row 1: Date, Operation Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Дата</label>
                  <input
                    type="date"
                    required
                    className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                    value={formState.expense_date}
                    onChange={(e) => { setFormState({ ...formState, expense_date: e.target.value }); setFormDirty(true); }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Тип операции</label>
                  <select
                    required
                    className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                    value={formState.operation_type}
                    onChange={(e) => { setFormState({ ...formState, operation_type: e.target.value as FinanceOperationType }); setFormDirty(true); }}
                  >
                    <option value="income">Приход</option>
                    <option value="expense">Расход</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Payment Method, Category */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Способ оплаты</label>
                  <select
                    required
                    className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                    value={formState.payment_method}
                    onChange={(e) => { setFormState({ ...formState, payment_method: e.target.value as PaymentMethodType }); setFormDirty(true); }}
                  >
                    <option value="cash">Нал</option>
                    <option value="cashless">Безнал</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Категория</label>
                  <select
                    required
                    className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                    value={formState.category}
                    onChange={(e) => { setFormState({ ...formState, category: e.target.value as ExpenseCategory }); setFormDirty(true); }}
                  >
                    {(Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map((cat) => (
                      <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Описание</label>
                <input
                  type="text"
                  required
                  placeholder="За что платёж..."
                  className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  value={formState.description}
                  onChange={(e) => { setFormState({ ...formState, description: e.target.value }); setFormDirty(true); }}
                />
              </div>

              {/* Row 3: Amount, Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Сумма (₽)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Введите сумму"
                    className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                    value={formState.amount || ''}
                    onChange={(e) => { setFormState({ ...formState, amount: parseFloat(e.target.value) || 0 }); setFormDirty(true); }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Статус</label>
                  <select
                    className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                    value={formState.payment_status}
                    onChange={(e) => { setFormState({ ...formState, payment_status: e.target.value as 'paid' | 'unpaid' }); setFormDirty(true); }}
                  >
                    <option value="unpaid">Не оплачено</option>
                    <option value="paid">Оплачено</option>
                  </select>
                </div>
              </div>

              {/* Counterparty (combobox) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {formState.operation_type === 'income' ? 'От кого (контрагент)' : 'Кому (контрагент)'}
                </label>
                <div className="relative">
                  <input
                    ref={counterpartyInputRef}
                    type="text"
                    placeholder={formState.operation_type === 'income' ? 'Кто платит...' : 'Кому платим...'}
                    className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border pr-8"
                    value={counterpartyInput}
                    onChange={(e) => {
                      setCounterpartyInput(e.target.value);
                      setShowCounterpartyDropdown(true);
                      if (!e.target.value) setFormState(prev => ({ ...prev, company_id: null }));
                      setFormDirty(true);
                    }}
                    onFocus={() => setShowCounterpartyDropdown(true)}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowCounterpartyDropdown(!showCounterpartyDropdown)}
                  >
                    <ChevronDown size={18} />
                  </button>
                  {showCounterpartyDropdown && (
                    <div ref={counterpartyDropdownRef} className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      <button type="button" className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-500" onClick={() => selectCounterparty(null)}>
                        Не указан
                      </button>
                      {filteredCounterpartyCompanies.map((c) => (
                        <button
                          type="button"
                          key={c.id}
                          className={`w-full text-left px-3 py-2 hover:bg-slate-50 ${formState.company_id === c.id ? 'bg-blue-50 text-blue-700' : ''}`}
                          onClick={() => selectCounterparty(c)}
                        >
                          {c.name}
                        </button>
                      ))}
                      {counterpartyInput.trim() && !companies.some(c => c.name.toLowerCase() === counterpartyInput.toLowerCase()) && (
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-green-50 text-green-700 border-t border-slate-100 flex items-center gap-2"
                          onClick={handleCreateCounterparty}
                        >
                          <Plus size={16} />
                          Создать «{counterpartyInput.trim()}»
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Link to Movement */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Link size={14} className="inline mr-1" />
                  Связать с движением (опционально)
                </label>
                <select
                  className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  value={formState.movement_id || ''}
                  onChange={(e) => {
                    const movementId = e.target.value || null;
                    setFormState({ ...formState, movement_id: movementId });
                    setFormDirty(true);
                    if (movementId) {
                      const movement = movements.find(m => m.id === movementId);
                      if (movement && !formState.description) {
                        setFormState(prev => ({
                          ...prev,
                          movement_id: movementId,
                          description: `${movement.operation === 'income' ? 'Приход' : 'Расход'}: ${movement.position?.material?.name || '—'} ${movement.weight}т`,
                          amount: movement.total_value || 0,
                        }));
                      }
                    }
                  }}
                >
                  <option value="">— Без привязки —</option>
                  {movements.map(m => (
                    <option key={m.id} value={m.id}>
                      {new Date(m.movement_date).toLocaleDateString('ru-RU')} · {m.operation === 'income' ? 'Приход' : 'Расход'} · {m.position?.material?.name || '—'} · {m.weight}т · {(m.total_value || 0).toLocaleString('ru-RU')} ₽
                    </option>
                  ))}
                </select>
              </div>

              {/* Note */}
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
    </div>
  );
};

export default Finance;
