import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Expense, ExpenseInput, ExpenseCategory, Company } from '../types';
import { getExpenses, createExpense, updateExpense, deleteExpense, getCompanies, createCompany } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Loader2, Receipt, Search, Filter, Edit2, ChevronDown } from 'lucide-react';

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

const Expenses: React.FC = () => {
  const { isAdmin, user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formDirty, setFormDirty] = useState(false);
  const [filterCategory, setFilterCategory] = useState<ExpenseCategory | ''>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [companyInput, setCompanyInput] = useState('');
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const companyInputRef = useRef<HTMLInputElement>(null);
  const companyDropdownRef = useRef<HTMLDivElement>(null);

  const getEmptyForm = useCallback((): ExpenseInput => ({
    expense_date: new Date().toISOString().split('T')[0],
    category: 'transport',
    description: '',
    amount: 0,
    payment_status: 'unpaid',
    company_id: null,
    note: '',
  }), []);

  const [formState, setFormState] = useState<ExpenseInput>(getEmptyForm);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        setLoading(true);
        const [expensesData, companiesData] = await Promise.all([
          getExpenses(),
          getCompanies(),
        ]);
        if (isMounted) {
          setExpenses(expensesData);
          setCompanies(companiesData);
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
        companyDropdownRef.current && 
        !companyDropdownRef.current.contains(e.target as Node) &&
        companyInputRef.current &&
        !companyInputRef.current.contains(e.target as Node)
      ) {
        setShowCompanyDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const requestCloseModal = useCallback(() => {
    if (formDirty && !window.confirm('Закрыть без сохранения? Несохранённые данные будут потеряны.')) return;
    setIsModalOpen(false);
    setEditingId(null);
    setFormState(getEmptyForm());
    setFormDirty(false);
  }, [formDirty, getEmptyForm]);

  const openEdit = useCallback((exp: Expense) => {
    setEditingId(exp.id);
    setFormState({
      expense_date: exp.expense_date,
      category: exp.category,
      description: exp.description,
      amount: exp.amount,
      payment_status: exp.payment_status ?? 'unpaid',
      company_id: exp.company_id ?? null,
      note: exp.note ?? '',
    });
    setCompanyInput(exp.company?.name || '');
    setFormDirty(false);
    setIsModalOpen(true);
  }, []);

  const openCreate = useCallback(() => {
    setEditingId(null);
    setFormState(getEmptyForm());
    setCompanyInput('');
    setFormDirty(false);
    setIsModalOpen(true);
  }, [getEmptyForm]);

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(companyInput.toLowerCase())
  );

  const selectCompany = (company: Company | null) => {
    if (company) {
      setFormState({ ...formState, company_id: company.id });
      setCompanyInput(company.name);
    } else {
      setFormState({ ...formState, company_id: null });
      setCompanyInput('');
    }
    setShowCompanyDropdown(false);
    setFormDirty(true);
  };

  const handleCreateNewCompany = async () => {
    if (!companyInput.trim()) return;
    try {
      const newCompany = await createCompany({ name: companyInput.trim(), type: 'both' });
      setCompanies(prev => [...prev, newCompany]);
      setFormState({ ...formState, company_id: newCompany.id });
      setShowCompanyDropdown(false);
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
      if (editingId) {
        const updated = await updateExpense(editingId, formState);
        setExpenses((prev) => prev.map((ex) => (ex.id === editingId ? updated : ex)));
        requestCloseModal();
      } else {
        const newExpense = await createExpense(formState);
        setExpenses((prev) => [newExpense, ...prev]);
        requestCloseModal();
      }
    } catch (err) {
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
    const matchSearch = !searchTerm ||
      e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.company?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.note || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchCategory && matchSearch;
  });

  const totalSum = filtered.reduce((acc, e) => acc + e.amount, 0);

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
            <Receipt className="text-blue-600" />
            Расходы
          </h2>
          <p className="text-slate-500 text-sm">Логистика, погрузка, обработка, аренда и прочее</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 sm:py-2 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all min-h-[48px] sm:min-h-0 touch-manipulation"
        >
          <Plus size={20} />
          Добавить расход
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Поиск по описанию, компании..."
            className="w-full pl-10 pr-4 py-3 sm:py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-600 shadow-sm"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as ExpenseCategory | '')}
        >
          <option value="">Все категории</option>
          {(Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map((cat) => (
            <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
          ))}
        </select>
        <div className="flex items-center text-slate-500 text-sm gap-2 sm:px-3 sm:border-l border-slate-200">
          <Filter size={16} />
          <span>Записей: {filtered.length}</span>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-400">
            Нет записей о расходах.
          </div>
        ) : (
          <>
            {filtered.map((item) => (
              <div key={item.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-slate-700">
                    {new Date(item.expense_date).toLocaleDateString('ru-RU')}
                  </span>
                  <span className={`badge shrink-0 ${CATEGORY_COLORS[item.category]}`}>
                    {CATEGORY_LABELS[item.category]}
                  </span>
                </div>
                <div className="text-sm font-medium text-slate-800">{item.description}</div>
                {item.company?.name && (
                  <div className="text-sm text-slate-500">{item.company.name}</div>
                )}
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-lg text-slate-800">
                    {item.amount.toLocaleString('ru-RU')} ₽
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
            ))}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex justify-between items-center font-bold text-slate-800">
              <span>ИТОГО:</span>
              <span className="text-red-600">{totalSum.toLocaleString('ru-RU')} ₽</span>
            </div>
          </>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Дата</th>
                <th className="px-6 py-4 whitespace-nowrap">Категория</th>
                <th className="px-6 py-4 whitespace-nowrap">Описание</th>
                <th className="px-6 py-4 whitespace-nowrap">Компания</th>
                <th className="px-6 py-4 text-right whitespace-nowrap bg-red-50/50">Сумма (₽)</th>
                <th className="px-6 py-4 whitespace-nowrap">Статус</th>
                <th className="px-6 py-4 whitespace-nowrap">Примечание</th>
                <th className="px-6 py-4 text-center">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                    Нет записей о расходах.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3">
                      {new Date(item.expense_date).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`badge ${CATEGORY_COLORS[item.category]}`}>
                        {CATEGORY_LABELS[item.category]}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-700">{item.description}</td>
                    <td className="px-6 py-3 text-slate-500">{item.company?.name || '—'}</td>
                    <td className="px-6 py-3 text-right font-bold bg-red-50/30 text-slate-800">
                      {item.amount.toLocaleString('ru-RU')}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`badge ${item.payment_status === 'paid' ? 'badge-green' : 'badge-orange'}`}>
                        {item.payment_status === 'paid' ? 'Оплачено' : 'Не оплачено'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-500 truncate max-w-xs">{item.note}</td>
                    <td className="px-6 py-3 text-center">
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
            <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
              <tr>
                <td colSpan={4} className="px-6 py-3 text-right">ИТОГО:</td>
                <td className="px-6 py-3 text-right text-red-600">
                  {totalSum.toLocaleString('ru-RU')} ₽
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
              <h3 className="font-bold text-lg text-slate-800">{editingId ? 'Редактировать расход' : 'Новый расход'}</h3>
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
                    value={formState.expense_date}
                    onChange={(e) => { setFormState({ ...formState, expense_date: e.target.value }); setFormDirty(true); }}
                  />
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

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Описание</label>
                <input
                  type="text"
                  required
                  placeholder="Доставка трубы 530, аренда склада..."
                  className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  value={formState.description}
                  onChange={(e) => { setFormState({ ...formState, description: e.target.value }); setFormDirty(true); }}
                />
              </div>

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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Статус оплаты</label>
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

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Компания (опц.)</label>
                <div className="relative">
                  <input
                    ref={companyInputRef}
                    type="text"
                    placeholder="Выберите или введите новую..."
                    className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border pr-8"
                    value={companyInput}
                    onChange={(e) => {
                      setCompanyInput(e.target.value);
                      setShowCompanyDropdown(true);
                      if (!e.target.value) {
                        setFormState({ ...formState, company_id: null });
                      }
                      setFormDirty(true);
                    }}
                    onFocus={() => setShowCompanyDropdown(true)}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
                  >
                    <ChevronDown size={18} />
                  </button>
                  {showCompanyDropdown && (
                    <div 
                      ref={companyDropdownRef}
                      className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                    >
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-500"
                        onClick={() => selectCompany(null)}
                      >
                        Не указана
                      </button>
                      {filteredCompanies.map((c) => (
                        <button
                          type="button"
                          key={c.id}
                          className={`w-full text-left px-3 py-2 hover:bg-slate-50 ${formState.company_id === c.id ? 'bg-blue-50 text-blue-700' : ''}`}
                          onClick={() => selectCompany(c)}
                        >
                          {c.name}
                        </button>
                      ))}
                      {companyInput.trim() && !companies.some(c => c.name.toLowerCase() === companyInput.toLowerCase()) && (
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-green-50 text-green-700 border-t border-slate-100 flex items-center gap-2"
                          onClick={handleCreateNewCompany}
                        >
                          <Plus size={16} />
                          Создать «{companyInput.trim()}»
                        </button>
                      )}
                    </div>
                  )}
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
    </div>
  );
};

export default Expenses;
