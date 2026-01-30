import React, { useState, useEffect } from 'react';
import { Company, CompanyType } from '../types';
import { getCompanies, createCompany, updateCompany, deleteCompany } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Edit2, Save, X, Building2, Loader2 } from 'lucide-react';

const COMPANY_TYPES: { value: CompanyType; label: string }[] = [
  { value: 'supplier', label: 'Поставщик' },
  { value: 'buyer', label: 'Покупатель' },
  { value: 'both', label: 'Поставщик и покупатель' },
];

const Companies: React.FC = () => {
  const { isAdmin } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Company>>({});
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadCompanies = async () => {
      try {
        setLoading(true);
        const data = await getCompanies(!showInactive);
        if (isMounted) {
          setCompanies(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Ошибка загрузки компаний');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadCompanies();
    return () => { isMounted = false; };
  }, [showInactive]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Удалить компанию? Это может повлиять на связанные записи.')) return;
    try {
      await deleteCompany(id);
      setCompanies((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  const startEdit = (company: Company) => {
    setEditingId(company.id);
    setEditForm(company);
  };

  const saveEdit = async () => {
    if (!editingId || !editForm.name) return;
    try {
      const updated = await updateCompany(editingId, {
        name: editForm.name,
        type: editForm.type,
        active: editForm.active,
      });
      setCompanies((prev) => prev.map((c) => (c.id === editingId ? updated : c)));
      setEditingId(null);
      setEditForm({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    }
  };

  const addNew = async () => {
    try {
      const uniqueSuffix = new Date().toISOString().slice(11, 19); // HH:MM:SS
      const newCompany = await createCompany({
        name: `Новая компания ${uniqueSuffix}`,
        type: 'both',
        active: true,
      });
      setCompanies((prev) => [...prev, newCompany]);
      startEdit(newCompany);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания');
    }
  };

  const toggleActive = async (company: Company) => {
    try {
      const updated = await updateCompany(company.id, { active: !company.active });
      setCompanies((prev) => prev.map((c) => (c.id === company.id ? updated : c)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка обновления');
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
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="text-blue-600" />
            Справочник компаний
          </h2>
          <p className="text-slate-500 text-sm">Контрагенты: поставщики и покупатели</p>
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
            Добавить
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Название</th>
              <th className="px-6 py-4">Тип</th>
              <th className="px-6 py-4 text-center">Статус</th>
              <th className="px-6 py-4 text-center w-32">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {companies.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                  Нет компаний. Добавьте первую.
                </td>
              </tr>
            ) : (
              companies.map((company) => (
                <tr key={company.id} className="hover:bg-slate-50 group">
                  {editingId === company.id ? (
                    <>
                      <td className="px-6 py-3">
                        <input
                          className="w-full border-slate-300 rounded p-2 text-sm border focus:ring-1 focus:ring-blue-500"
                          value={editForm.name || ''}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          autoFocus
                        />
                      </td>
                      <td className="px-6 py-3">
                        <select
                          className="w-full border-slate-300 rounded p-2 text-sm border focus:ring-1 focus:ring-blue-500"
                          value={editForm.type || 'both'}
                          onChange={(e) =>
                            setEditForm({ ...editForm, type: e.target.value as CompanyType })
                          }
                        >
                          {COMPANY_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editForm.active ?? true}
                            onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                            className="rounded border-slate-300"
                          />
                          <span className="text-sm text-slate-600">Активна</span>
                        </label>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={saveEdit}
                            className="text-green-600 hover:bg-green-50 p-2 rounded"
                          >
                            <Save size={16} />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-red-500 hover:bg-red-50 p-2 rounded"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-3 font-medium text-slate-700">{company.name}</td>
                      <td className="px-6 py-3 text-slate-500">
                        {COMPANY_TYPES.find((t) => t.value === company.type)?.label || company.type}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span
                          className={`badge ${company.active ? 'badge-green' : 'badge-gray'}`}
                          onClick={() => isAdmin && toggleActive(company)}
                          style={{ cursor: isAdmin ? 'pointer' : 'default' }}
                        >
                          {company.active ? 'Активна' : 'Неактивна'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex justify-center gap-2">
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => startEdit(company)}
                                className="text-blue-500 hover:text-blue-700 p-1"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(company.id)}
                                className="text-slate-400 hover:text-red-600 p-1"
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
  );
};

export default Companies;
