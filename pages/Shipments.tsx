import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Shipment, ShipmentInput, ShipmentItemInput, Movement, Company, Material, OperationType, PaymentMethodType } from '../types';
import { getShipmentsWithTotals, getShipmentWithItems, createShipmentWithItems, updateShipmentWithItems, deleteShipment, getCompanies, getMaterials, createCompany } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Loader2, Truck, ChevronDown, ChevronRight, Search, Filter, Edit2, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import DateFilter, { DateRange } from '../components/DateFilter';
import { useConfirm } from '../hooks/useConfirm';
import Combobox from '../components/Combobox';

type ShipmentWithTotals = Shipment & { totalWeight: number; totalValue: number; itemCount: number };

const EMPTY_ITEM: ShipmentItemInput = { material_id: '', size: '', wall_thickness: 0, quantity: 0, linear_meters: 0, weight: 0, price_per_ton: 0, note: '' };

const Shipments: React.FC = () => {
  const { isAdmin, user } = useAuth();
  const { confirm, confirmDialog } = useConfirm();
  const [shipments, setShipments] = useState<ShipmentWithTotals[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Movement[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>({ dateFrom: null, dateTo: null });
  const [activeTab, setActiveTab] = useState<OperationType>('income');
  const [supplierInput, setSupplierInput] = useState('');

  const getEmptyForm = useCallback((op: OperationType = 'income'): ShipmentInput => ({
    operation: op,
    company_id: '',
    supplier_id: '',
    buyer_id: '',
    shipment_date: new Date().toISOString().split('T')[0],
    payment_method: 'cashless',
    destination: '',
    note: '',
    items: [{ ...EMPTY_ITEM }],
  }), []);

  const [formState, setFormState] = useState<ShipmentInput>(getEmptyForm);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const [shipmentsData, companiesData, materialsData] = await Promise.all([getShipmentsWithTotals(), getCompanies(), getMaterials()]);
      setShipments(shipmentsData); setCompanies(companiesData); setMaterials(materialsData); setError(null);
    } catch (err) { setError(err instanceof Error ? err.message : 'Ошибка загрузки'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const toggleExpand = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); setExpandedItems([]); return; }
    setExpandedId(id);
    setLoadingItems(true);
    try {
      const data = await getShipmentWithItems(id);
      setExpandedItems(data.items);
    } catch { setExpandedItems([]); }
    finally { setLoadingItems(false); }
  };

  const openCreate = () => { setEditingId(null); setFormState(getEmptyForm(activeTab)); setSupplierInput(''); setIsModalOpen(true); };

  const openEdit = async (s: ShipmentWithTotals) => {
    setEditingId(s.id);
    setLoadingItems(true);
    try {
      const data = await getShipmentWithItems(s.id);
      const items: ShipmentItemInput[] = data.items.map(m => ({
        material_id: m.position?.material_id || m.position?.material?.id || '',
        size: m.position?.size || '',
        wall_thickness: m.wall_thickness || 0,
        quantity: m.quantity || 0,
        linear_meters: m.linear_meters || 0,
        weight: m.weight,
        price_per_ton: m.price_per_ton || 0,
        note: m.note || '',
      }));
      setFormState({
        operation: s.operation,
        company_id: s.company_id,
        supplier_id: s.supplier_id || '',
        buyer_id: s.buyer_id || '',
        shipment_date: s.shipment_date,
        payment_method: s.payment_method,
        destination: s.destination || '',
        note: s.note || '',
        items: items.length > 0 ? items : [{ ...EMPTY_ITEM }],
      });
      setSupplierInput(s.operation === 'income' ? s.supplier?.name || '' : s.buyer?.name || '');
      setIsModalOpen(true);
    } catch (err) { setError(err instanceof Error ? err.message : 'Ошибка загрузки'); }
    finally { setLoadingItems(false); }
  };

  const closeModal = () => { setIsModalOpen(false); setEditingId(null); setFormState(getEmptyForm(activeTab)); setSupplierInput(''); };

  const suppliers = useMemo(() => companies.filter(c => c.type === 'supplier' || c.type === 'both'), [companies]);
  const buyers = useMemo(() => companies.filter(c => c.type === 'buyer' || c.type === 'both'), [companies]);

  const addItem = () => setFormState(prev => ({ ...prev, items: [...prev.items, { ...EMPTY_ITEM }] }));
  const removeItem = (idx: number) => setFormState(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  const updateItem = (idx: number, field: keyof ShipmentItemInput, value: string | number) => {
    setFormState(prev => {
      const items = [...prev.items];
      items[idx] = { ...items[idx], [field]: value };
      return { ...prev, items };
    });
  };

  const totals = useMemo(() => {
    const tw = formState.items.reduce((s, i) => s + (i.weight || 0), 0);
    const tv = formState.items.reduce((s, i) => s + (i.weight || 0) * (i.price_per_ton || 0), 0);
    return { totalWeight: tw, totalValue: tv, avgPrice: tw > 0 ? tv / tw : 0 };
  }, [formState.items]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.company_id || formState.items.length === 0) return;
    const validItems = formState.items.filter(i => i.material_id && i.size && i.weight > 0);
    if (validItems.length === 0) { setError('Добавьте хотя бы одну позицию с материалом, размером и весом'); return; }
    try {
      setSubmitting(true); setError(null);
      if (editingId) {
        await updateShipmentWithItems(editingId, { ...formState, items: validItems });
      } else {
        await createShipmentWithItems({ ...formState, items: validItems });
      }
      closeModal();
      await reload();
    } catch (err) { setError(err instanceof Error ? err.message : 'Ошибка сохранения'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string, createdBy: string | null) => {
    if (!isAdmin && createdBy !== user?.id) { alert('Вы можете удалять только свои записи'); return; }
    if (!await confirm('Удалить запись?', 'Все движения внутри тоже будут удалены.', 'danger')) return;
    try {
      await deleteShipment(id);
      setShipments(prev => prev.filter(s => s.id !== id));
      if (expandedId === id) { setExpandedId(null); setExpandedItems([]); }
    } catch (err) { setError(err instanceof Error ? err.message : 'Ошибка удаления'); }
  };

  const handleCreateSupplier = async (name: string) => {
    try {
      const c = await createCompany({ name, type: activeTab === 'income' ? 'supplier' : 'buyer', active: true });
      setCompanies(prev => [...prev, c]);
      if (formState.operation === 'income') setFormState(prev => ({ ...prev, supplier_id: c.id }));
      else setFormState(prev => ({ ...prev, buyer_id: c.id }));
    } catch (err) { setError(err instanceof Error ? err.message : 'Ошибка создания компании'); }
  };

  const filtered = useMemo(() => shipments.filter(s => {
    if (s.operation !== activeTab) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (!(s.supplier?.name || '').toLowerCase().includes(q) && !(s.buyer?.name || '').toLowerCase().includes(q) && !(s.company?.name || '').toLowerCase().includes(q) && !(s.note || '').toLowerCase().includes(q)) return false;
    }
    if (dateRange.dateFrom && s.shipment_date < dateRange.dateFrom) return false;
    if (dateRange.dateTo && s.shipment_date > dateRange.dateTo) return false;
    return true;
  }), [shipments, activeTab, searchTerm, dateRange]);

  const fmtNum = (n: number) => Math.round(n).toLocaleString('ru-RU');

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  const isIncome = activeTab === 'income';
  const tabLabel = isIncome ? 'поставку' : 'отгрузку';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Truck className="text-blue-600" /> Поставки и отгрузки</h2>
          <p className="text-slate-500 text-sm">Групповые операции с металлом</p>
        </div>
        <button type="button" onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 sm:py-2 rounded-xl flex items-center gap-2 shadow-sm transition-all min-h-[48px] sm:min-h-0 touch-manipulation">
          <Plus size={20} /> Создать {tabLabel}
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button type="button" onClick={() => setActiveTab('income')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isIncome ? 'bg-white text-green-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <ArrowDownCircle size={16} /> Поставки
        </button>
        <button type="button" onClick={() => setActiveTab('expense')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!isIncome ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <ArrowUpCircle size={16} /> Отгрузки
        </button>
      </div>

      <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Поиск..." className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex items-center text-slate-500 text-sm gap-2 sm:px-2"><Filter size={16} /><span>{filtered.length}</span></div>
        </div>
        <DateFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-400">Нет {isIncome ? 'поставок' : 'отгрузок'}.</div>
        ) : filtered.map(s => (
          <div key={s.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => toggleExpand(s.id)}>
              {expandedId === s.id ? <ChevronDown size={18} className="text-slate-400 flex-shrink-0" /> : <ChevronRight size={18} className="text-slate-400 flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-slate-700">{new Date(s.shipment_date).toLocaleDateString('ru-RU')}</span>
                  <span className="text-sm text-slate-600 font-medium">{isIncome ? s.supplier?.name : s.buyer?.name || '—'}</span>
                  {s.destination && <span className="text-xs text-slate-400">→ {s.destination}</span>}
                </div>
                {s.note && <p className="text-xs text-slate-500 mt-0.5 truncate">{s.note}</p>}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 text-sm">
                <span className="font-medium text-slate-700">{s.totalWeight > 0 ? `${s.totalWeight.toFixed(3)} т` : '—'}</span>
                <span className="font-bold text-slate-800 hidden sm:inline">{s.totalValue > 0 ? `${fmtNum(s.totalValue)} ₽` : ''}</span>
                {s.totalWeight > 0 && s.totalValue > 0 && <span className="text-blue-600 font-medium hidden sm:inline">{fmtNum(s.totalValue / s.totalWeight)} ₽/т</span>}
                <span className={`badge ${s.payment_method === 'cash' ? 'badge-orange' : 'badge-blue'}`}>{s.payment_method === 'cash' ? 'Нал' : 'БН'}</span>
                {(isAdmin || s.created_by === user?.id) && (
                  <>
                    <button type="button" onClick={(e) => { e.stopPropagation(); openEdit(s); }} className="text-slate-400 hover:text-blue-600 p-1 transition-colors" title="Редактировать"><Edit2 size={16} /></button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); handleDelete(s.id, s.created_by); }} className="text-slate-400 hover:text-red-600 p-1 transition-colors" title="Удалить"><Trash2 size={16} /></button>
                  </>
                )}
              </div>
            </div>
            {expandedId === s.id && (
              <div className="border-t border-slate-200 bg-slate-50 p-4">
                {loadingItems ? (
                  <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-blue-500" /></div>
                ) : expandedItems.length === 0 ? (
                  <p className="text-center text-slate-400 text-sm">Нет позиций</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-slate-600 font-semibold">
                        <tr>
                          <th className="px-2 py-1 text-left">Материал</th>
                          <th className="px-2 py-1 text-left">Размер</th>
                          <th className="px-2 py-1 text-right">Стенка</th>
                          <th className="px-2 py-1 text-right">Шт</th>
                          <th className="px-2 py-1 text-right">Метры</th>
                          <th className="px-2 py-1 text-right">Вес (т)</th>
                          <th className="px-2 py-1 text-right">Цена/т</th>
                          <th className="px-2 py-1 text-right font-bold">Сумма</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {expandedItems.map(m => (
                          <tr key={m.id}>
                            <td className="px-2 py-1">{m.position?.material?.name || '—'}</td>
                            <td className="px-2 py-1">{m.position?.size || '—'}</td>
                            <td className="px-2 py-1 text-right">{m.wall_thickness || '—'}</td>
                            <td className="px-2 py-1 text-right">{m.quantity || '—'}</td>
                            <td className="px-2 py-1 text-right">{m.linear_meters || '—'}</td>
                            <td className="px-2 py-1 text-right font-medium">{m.weight}</td>
                            <td className="px-2 py-1 text-right">{m.price_per_ton ? m.price_per_ton.toLocaleString('ru-RU') : '—'}</td>
                            <td className="px-2 py-1 text-right font-bold">{(m.total_value || 0).toLocaleString('ru-RU')}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="font-bold border-t border-slate-300">
                        <tr>
                          <td colSpan={5} className="px-2 py-2 text-right">ИТОГО:</td>
                          <td className="px-2 py-2 text-right">{expandedItems.reduce((s, m) => s + m.weight, 0).toFixed(3)}</td>
                          <td className="px-2 py-2 text-right text-slate-500">{(() => { const w = expandedItems.reduce((s, m) => s + m.weight, 0); const v = expandedItems.reduce((s, m) => s + (m.total_value || 0), 0); return w > 0 ? fmtNum(v / w) : '—'; })()}</td>
                          <td className="px-2 py-2 text-right">{expandedItems.reduce((s, m) => s + (m.total_value || 0), 0).toLocaleString('ru-RU')}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 safe-area-inset" onClick={e => e.target === e.currentTarget && closeModal()} role="dialog" aria-modal="true">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] sm:max-h-[85vh] overflow-hidden animate-fade-in flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 flex-shrink-0">
              <h3 className="font-bold text-lg text-slate-800">{editingId ? 'Редактировать' : 'Создать'} {formState.operation === 'income' ? 'поставку' : 'отгрузку'}</h3>
              <button type="button" onClick={closeModal} className="p-2 -m-2 text-slate-400 hover:text-slate-600 text-2xl leading-none touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Дата</label>
                  <input type="date" required className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" value={formState.shipment_date} onChange={e => setFormState(prev => ({ ...prev, shipment_date: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Операция</label>
                  <select className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" value={formState.operation} onChange={e => setFormState(prev => ({ ...prev, operation: e.target.value as OperationType }))}>
                    <option value="income">Приход</option>
                    <option value="expense">Расход</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Компания (владелец)</label>
                  <select required className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" value={formState.company_id} onChange={e => setFormState(prev => ({ ...prev, company_id: e.target.value }))}>
                    <option value="">Выберите...</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <Combobox
                    label={formState.operation === 'income' ? 'Поставщик' : 'Покупатель'}
                    inputValue={supplierInput}
                    items={formState.operation === 'income' ? suppliers : buyers}
                    selectedId={formState.operation === 'income' ? formState.supplier_id || null : formState.buyer_id || null}
                    onSelect={(item) => {
                      if (formState.operation === 'income') setFormState(prev => ({ ...prev, supplier_id: item?.id || '' }));
                      else setFormState(prev => ({ ...prev, buyer_id: item?.id || '' }));
                      setSupplierInput(item?.name || '');
                    }}
                    onInputChange={v => setSupplierInput(v)}
                    onCreate={handleCreateSupplier}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Оплата</label>
                  <select className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" value={formState.payment_method} onChange={e => setFormState(prev => ({ ...prev, payment_method: e.target.value as PaymentMethodType }))}>
                    <option value="cashless">Безнал</option>
                    <option value="cash">Нал</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Куда</label>
                  <input type="text" placeholder="Кулаково, транзит..." className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" value={formState.destination} onChange={e => setFormState(prev => ({ ...prev, destination: e.target.value }))} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-slate-800">Позиции</h4>
                  <button type="button" onClick={addItem} className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"><Plus size={16} /> Добавить</button>
                </div>
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600 font-semibold">
                      <tr>
                        <th className="px-2 py-2 text-left min-w-[120px]">Материал</th>
                        <th className="px-2 py-2 text-left min-w-[80px]">Размер</th>
                        <th className="px-2 py-2 text-right min-w-[70px]">Стенка</th>
                        <th className="px-2 py-2 text-right min-w-[60px]">Шт</th>
                        <th className="px-2 py-2 text-right min-w-[70px]">Метры</th>
                        <th className="px-2 py-2 text-right min-w-[80px]">Вес (т)</th>
                        <th className="px-2 py-2 text-right min-w-[90px]">Цена/т</th>
                        <th className="px-2 py-2 text-right min-w-[90px]">Сумма</th>
                        <th className="px-2 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {formState.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-1 py-1">
                            <select className="w-full p-1.5 border border-slate-200 rounded text-sm" value={item.material_id} onChange={e => updateItem(idx, 'material_id', e.target.value)}>
                              <option value="">—</option>
                              {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                          </td>
                          <td className="px-1 py-1"><input type="text" placeholder="530" className="w-full p-1.5 border border-slate-200 rounded text-sm" value={item.size} onChange={e => updateItem(idx, 'size', e.target.value)} /></td>
                          <td className="px-1 py-1"><input type="number" step="0.1" className="w-full p-1.5 border border-slate-200 rounded text-sm text-right" value={item.wall_thickness || ''} onChange={e => updateItem(idx, 'wall_thickness', parseFloat(e.target.value) || 0)} /></td>
                          <td className="px-1 py-1"><input type="number" step="1" className="w-full p-1.5 border border-slate-200 rounded text-sm text-right" value={item.quantity || ''} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)} /></td>
                          <td className="px-1 py-1"><input type="number" step="0.01" className="w-full p-1.5 border border-slate-200 rounded text-sm text-right" value={item.linear_meters || ''} onChange={e => updateItem(idx, 'linear_meters', parseFloat(e.target.value) || 0)} /></td>
                          <td className="px-1 py-1"><input type="number" step="0.001" className="w-full p-1.5 border border-slate-200 rounded text-sm text-right font-medium" value={item.weight || ''} onChange={e => updateItem(idx, 'weight', parseFloat(e.target.value) || 0)} /></td>
                          <td className="px-1 py-1"><input type="number" step="1" className="w-full p-1.5 border border-slate-200 rounded text-sm text-right" value={item.price_per_ton || ''} onChange={e => updateItem(idx, 'price_per_ton', parseFloat(e.target.value) || 0)} /></td>
                          <td className="px-1 py-1 text-right font-bold text-sm text-slate-700 whitespace-nowrap">{((item.weight || 0) * (item.price_per_ton || 0)).toLocaleString('ru-RU')}</td>
                          <td className="px-1 py-1">{formState.items.length > 1 && <button type="button" onClick={() => removeItem(idx)} className="text-slate-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                      <tr>
                        <td colSpan={5} className="px-2 py-2 text-right">ИТОГО:</td>
                        <td className="px-2 py-2 text-right">{totals.totalWeight.toFixed(3)}</td>
                        <td className="px-2 py-2 text-right text-slate-500">{totals.avgPrice > 0 ? Math.round(totals.avgPrice).toLocaleString('ru-RU') : '—'}</td>
                        <td className="px-2 py-2 text-right">{totals.totalValue.toLocaleString('ru-RU')}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Примечание</label>
                <input type="text" className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" value={formState.note} onChange={e => setFormState(prev => ({ ...prev, note: e.target.value }))} />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={closeModal} className="px-5 py-3 min-h-[48px] text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 touch-manipulation">Отмена</button>
                <button type="submit" disabled={submitting} className="px-5 py-3 min-h-[48px] text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-sm disabled:opacity-50 flex items-center gap-2 touch-manipulation">
                  {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
                  {editingId ? 'Сохранить' : `Создать ${tabLabel}`}
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

export default Shipments;
