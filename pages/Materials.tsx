import React, { useState, useEffect } from 'react';
import { Material } from '../types';
import { getMaterials, createMaterial, updateMaterial, deleteMaterial } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Edit2, Save, X, Boxes, Loader2 } from 'lucide-react';

const Materials: React.FC = () => {
  const { isAdmin } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Material>>({});
  const [showInactive, setShowInactive] = useState(false);

  const loadMaterials = async () => {
    try {
      setLoading(true);
      const data = await getMaterials(!showInactive);
      setMaterials(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки материалов');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMaterials();
  }, [showInactive]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Удалить материал? Это может повлиять на связанные записи.')) return;
    try {
      await deleteMaterial(id);
      setMaterials((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  const startEdit = (material: Material) => {
    setEditingId(material.id);
    setEditForm(material);
  };

  const saveEdit = async () => {
    if (!editingId || !editForm.name) return;
    try {
      const updated = await updateMaterial(editingId, {
        name: editForm.name,
        active: editForm.active,
      });
      setMaterials((prev) => prev.map((m) => (m.id === editingId ? updated : m)));
      setEditingId(null);
      setEditForm({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    }
  };

  const addNew = async () => {
    try {
      const newMaterial = await createMaterial({
        name: 'Новый материал',
        active: true,
      });
      setMaterials((prev) => [...prev, newMaterial]);
      startEdit(newMaterial);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания');
    }
  };

  const toggleActive = async (material: Material) => {
    try {
      const updated = await updateMaterial(material.id, { active: !material.active });
      setMaterials((prev) => prev.map((m) => (m.id === material.id ? updated : m)));
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
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Boxes className="text-blue-600" />
            Справочник материалов
          </h2>
          <p className="text-slate-500 text-sm">Типы металлопроката</p>
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
              <th className="px-6 py-4 text-center">Статус</th>
              <th className="px-6 py-4 text-center w-32">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {materials.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-slate-400">
                  Нет материалов. Добавьте первый.
                </td>
              </tr>
            ) : (
              materials.map((material) => (
                <tr key={material.id} className="hover:bg-slate-50 group">
                  {editingId === material.id ? (
                    <>
                      <td className="px-6 py-3">
                        <input
                          className="w-full border-slate-300 rounded p-2 text-sm border focus:ring-1 focus:ring-blue-500"
                          value={editForm.name || ''}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          autoFocus
                        />
                      </td>
                      <td className="px-6 py-3 text-center">
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editForm.active ?? true}
                            onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                            className="rounded border-slate-300"
                          />
                          <span className="text-sm text-slate-600">Активен</span>
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
                      <td className="px-6 py-3 font-medium text-slate-700">{material.name}</td>
                      <td className="px-6 py-3 text-center">
                        <span
                          className={`badge ${material.active ? 'badge-green' : 'badge-gray'}`}
                          onClick={() => isAdmin && toggleActive(material)}
                          style={{ cursor: isAdmin ? 'pointer' : 'default' }}
                        >
                          {material.active ? 'Активен' : 'Неактивен'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex justify-center gap-2">
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => startEdit(material)}
                                className="text-blue-500 hover:text-blue-700 p-1"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(material.id)}
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

export default Materials;
