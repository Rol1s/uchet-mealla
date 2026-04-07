import React, { useState, useEffect, useMemo } from 'react';
import { Movement, Shipment } from '../types';
import { getMovements, getShipments, getShipmentWithItems } from '../services/supabase';
import { Loader2, BarChart3, TrendingUp, Package, Truck, DollarSign } from 'lucide-react';

interface DiameterRow { size: string; totalWeight: number; totalValue: number; avgPrice: number; }
interface DiameterWallRow { size: string; wallThickness: number | null; totalWeight: number; totalValue: number; avgPrice: number; }
interface ShipmentRow { id: string; date: string; supplier: string; totalWeight: number; totalValue: number; avgPrice: number; }
interface MarginRow {
  material: string; size: string; wallThickness: number | null;
  buyW: number; buyV: number; avgBuy: number;
  sellW: number; sellV: number; avgSell: number;
  margin: number; marginPct: number;
}

const Analytics: React.FC = () => {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [shipmentDetails, setShipmentDetails] = useState<Map<string, Movement[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadingShipmentDetails, setLoadingShipmentDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'diameter' | 'diameter_wall' | 'shipments' | 'margin'>('diameter');

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const [movData, shipData] = await Promise.all([getMovements(), getShipments()]);
        if (isMounted) { setMovements(movData); setShipments(shipData); setError(null); }
      } catch (err) { if (isMounted) setError(err instanceof Error ? err.message : 'Ошибка загрузки'); }
      finally { if (isMounted) setLoading(false); }
    };
    load();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (activeTab !== 'shipments' || shipments.length === 0) return;
    const incomeShipments = shipments.filter(s => s.operation === 'income');
    const toLoad = incomeShipments.filter(s => !shipmentDetails.has(s.id));
    if (toLoad.length === 0) return;
    let isMounted = true;
    const load = async () => {
      setLoadingShipmentDetails(true);
      const newMap = new Map(shipmentDetails);
      for (const s of toLoad) {
        try {
          const data = await getShipmentWithItems(s.id);
          if (isMounted) newMap.set(s.id, data.items);
        } catch { /* skip */ }
      }
      if (isMounted) setShipmentDetails(newMap);
      if (isMounted) setLoadingShipmentDetails(false);
    };
    load();
    return () => { isMounted = false; };
  }, [activeTab, shipments]);

  const incomeMovements = useMemo(() => movements.filter(m => m.operation === 'income'), [movements]);
  const expenseMovements = useMemo(() => movements.filter(m => m.operation === 'expense'), [movements]);

  const byDiameter = useMemo<DiameterRow[]>(() => {
    const map = new Map<string, { w: number; v: number }>();
    for (const m of incomeMovements) {
      const size = m.position?.size || '—';
      const entry = map.get(size) || { w: 0, v: 0 };
      entry.w += m.weight; entry.v += m.total_value || 0;
      map.set(size, entry);
    }
    return Array.from(map.entries()).map(([size, { w, v }]) => ({
      size, totalWeight: w, totalValue: v, avgPrice: w > 0 ? v / w : 0,
    })).sort((a, b) => b.totalWeight - a.totalWeight);
  }, [incomeMovements]);

  const byDiameterWall = useMemo<DiameterWallRow[]>(() => {
    const map = new Map<string, { size: string; wt: number | null; w: number; v: number }>();
    for (const m of incomeMovements) {
      const size = m.position?.size || '—';
      const wt = m.wall_thickness;
      const key = `${size}|${wt ?? '—'}`;
      const entry = map.get(key) || { size, wt, w: 0, v: 0 };
      entry.w += m.weight; entry.v += m.total_value || 0;
      map.set(key, entry);
    }
    return Array.from(map.values()).map(({ size, wt, w, v }) => ({
      size, wallThickness: wt, totalWeight: w, totalValue: v, avgPrice: w > 0 ? v / w : 0,
    })).sort((a, b) => {
      const sA = parseFloat(a.size) || 0; const sB = parseFloat(b.size) || 0;
      if (sA !== sB) return sB - sA;
      return (b.wallThickness || 0) - (a.wallThickness || 0);
    });
  }, [incomeMovements]);

  const byShipment = useMemo<ShipmentRow[]>(() => {
    const incomeShips = shipments.filter(s => s.operation === 'income');
    return incomeShips.map(s => {
      const items = shipmentDetails.get(s.id) || [];
      const tw = items.reduce((a, m) => a + m.weight, 0);
      const tv = items.reduce((a, m) => a + (m.total_value || 0), 0);
      return { id: s.id, date: s.shipment_date, supplier: s.supplier?.name || s.company?.name || '—', totalWeight: tw, totalValue: tv, avgPrice: tw > 0 ? tv / tw : 0 };
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [shipments, shipmentDetails]);

  const byMargin = useMemo<MarginRow[]>(() => {
    const map = new Map<string, { material: string; size: string; wt: number | null; buyW: number; buyV: number; sellW: number; sellV: number }>();
    const allMov = [...incomeMovements, ...expenseMovements];
    for (const m of allMov) {
      const material = m.position?.material?.name || '—';
      const size = m.position?.size || '—';
      const wt = m.wall_thickness;
      const key = `${material}|${size}|${wt ?? '—'}`;
      const e = map.get(key) || { material, size, wt, buyW: 0, buyV: 0, sellW: 0, sellV: 0 };
      if (m.operation === 'income') { e.buyW += m.weight; e.buyV += m.total_value || 0; }
      else { e.sellW += m.weight; e.sellV += m.total_value || 0; }
      map.set(key, e);
    }
    return Array.from(map.values()).map(e => {
      const avgBuy = e.buyW > 0 ? e.buyV / e.buyW : 0;
      const avgSell = e.sellW > 0 ? e.sellV / e.sellW : 0;
      const cogs = e.sellW * avgBuy;
      const margin = e.sellV - cogs;
      const marginPct = cogs > 0 ? (margin / cogs) * 100 : 0;
      return { material: e.material, size: e.size, wallThickness: e.wt, buyW: e.buyW, buyV: e.buyV, avgBuy, sellW: e.sellW, sellV: e.sellV, avgSell, margin, marginPct };
    }).filter(r => r.sellW > 0 || r.buyW > 0).sort((a, b) => b.margin - a.margin);
  }, [incomeMovements, expenseMovements]);

  const marginTotals = useMemo(() => {
    const buyV = byMargin.reduce((s, r) => s + r.buyV, 0);
    const sellV = byMargin.reduce((s, r) => s + r.sellV, 0);
    const buyW = byMargin.reduce((s, r) => s + r.buyW, 0);
    const sellW = byMargin.reduce((s, r) => s + r.sellW, 0);
    const avgBuy = buyW > 0 ? buyV / buyW : 0;
    const cogs = sellW * avgBuy;
    const margin = sellV - cogs;
    return { buyV, sellV, margin, marginPct: cogs > 0 ? (margin / cogs) * 100 : 0 };
  }, [byMargin]);

  const overallStats = useMemo(() => {
    const w = incomeMovements.reduce((s, m) => s + m.weight, 0);
    const v = incomeMovements.reduce((s, m) => s + (m.total_value || 0), 0);
    return { totalWeight: w, totalValue: v, avgPrice: w > 0 ? v / w : 0 };
  }, [incomeMovements]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  const fmtNum = (n: number) => Math.round(n).toLocaleString('ru-RU');

  const tabs = [
    { key: 'diameter' as const, label: 'По диаметру', icon: Package },
    { key: 'diameter_wall' as const, label: 'Диаметр + стенка', icon: TrendingUp },
    { key: 'shipments' as const, label: 'По поставкам', icon: Truck },
    { key: 'margin' as const, label: 'Маржинальность', icon: DollarSign },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><BarChart3 className="text-blue-600" /> Аналитика</h2>
        <p className="text-slate-500 text-sm">Средняя цена, отчёты по поставкам и маржинальности</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Общий закуп</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{overallStats.totalWeight.toFixed(3)} <span className="text-sm text-slate-500 font-normal">т</span></p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Общая стоимость</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{fmtNum(overallStats.totalValue)} <span className="text-sm text-slate-500 font-normal">₽</span></p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Средняя цена/т</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{overallStats.avgPrice > 0 ? fmtNum(overallStats.avgPrice) : '—'} <span className="text-sm text-slate-500 font-normal">₽/т</span></p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.key} type="button" className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === t.key ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab(t.key)}>
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </div>

        <div className="p-4 overflow-x-auto">
          {activeTab === 'diameter' && (
            <table className="w-full text-sm">
              <thead className="text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 text-left">Диаметр</th>
                  <th className="px-3 py-2 text-right">Общий вес (т)</th>
                  <th className="px-3 py-2 text-right">Стоимость (₽)</th>
                  <th className="px-3 py-2 text-right">Ср. цена/т (₽)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {byDiameter.length === 0 ? (
                  <tr><td colSpan={4} className="text-center text-slate-400 py-8">Нет данных</td></tr>
                ) : byDiameter.map(r => (
                  <tr key={r.size} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium">{r.size}</td>
                    <td className="px-3 py-2 text-right">{r.totalWeight.toFixed(3)}</td>
                    <td className="px-3 py-2 text-right">{fmtNum(r.totalValue)}</td>
                    <td className="px-3 py-2 text-right font-bold text-blue-600">{fmtNum(r.avgPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'diameter_wall' && (
            <table className="w-full text-sm">
              <thead className="text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 text-left">Диаметр</th>
                  <th className="px-3 py-2 text-left">Стенка</th>
                  <th className="px-3 py-2 text-right">Вес (т)</th>
                  <th className="px-3 py-2 text-right">Стоимость (₽)</th>
                  <th className="px-3 py-2 text-right">Ср. цена/т (₽)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {byDiameterWall.length === 0 ? (
                  <tr><td colSpan={5} className="text-center text-slate-400 py-8">Нет данных</td></tr>
                ) : byDiameterWall.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium">{r.size}</td>
                    <td className="px-3 py-2">{r.wallThickness ?? '—'}</td>
                    <td className="px-3 py-2 text-right">{r.totalWeight.toFixed(3)}</td>
                    <td className="px-3 py-2 text-right">{fmtNum(r.totalValue)}</td>
                    <td className="px-3 py-2 text-right font-bold text-blue-600">{fmtNum(r.avgPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'shipments' && (
            loadingShipmentDetails ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-left">Дата</th>
                    <th className="px-3 py-2 text-left">Поставщик</th>
                    <th className="px-3 py-2 text-right">Вес (т)</th>
                    <th className="px-3 py-2 text-right">Сумма (₽)</th>
                    <th className="px-3 py-2 text-right">Ср. цена/т (₽)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {byShipment.length === 0 ? (
                    <tr><td colSpan={5} className="text-center text-slate-400 py-8">Нет поставок</td></tr>
                  ) : byShipment.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2">{new Date(r.date).toLocaleDateString('ru-RU')}</td>
                      <td className="px-3 py-2 font-medium">{r.supplier}</td>
                      <td className="px-3 py-2 text-right">{r.totalWeight.toFixed(3)}</td>
                      <td className="px-3 py-2 text-right">{fmtNum(r.totalValue)}</td>
                      <td className="px-3 py-2 text-right font-bold text-blue-600">{r.avgPrice > 0 ? fmtNum(r.avgPrice) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

          {activeTab === 'margin' && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500">Закуплено</p><p className="font-bold">{fmtNum(marginTotals.buyV)} ₽</p></div>
                <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500">Продано</p><p className="font-bold">{fmtNum(marginTotals.sellV)} ₽</p></div>
                <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500">Маржа</p><p className={`font-bold ${marginTotals.margin >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmtNum(marginTotals.margin)} ₽</p></div>
                <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500">Рентабельность</p><p className={`font-bold ${marginTotals.marginPct >= 0 ? 'text-green-700' : 'text-red-600'}`}>{marginTotals.marginPct !== 0 ? marginTotals.marginPct.toFixed(1) : '—'}%</p></div>
              </div>
              <table className="w-full text-sm">
                <thead className="text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-left">Материал</th>
                    <th className="px-3 py-2 text-left">Размер</th>
                    <th className="px-3 py-2 text-left">Стенка</th>
                    <th className="px-3 py-2 text-right">Закуп (т)</th>
                    <th className="px-3 py-2 text-right">Ср. закуп</th>
                    <th className="px-3 py-2 text-right">Продажа (т)</th>
                    <th className="px-3 py-2 text-right">Ср. продажа</th>
                    <th className="px-3 py-2 text-right">Маржа (₽)</th>
                    <th className="px-3 py-2 text-right">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {byMargin.length === 0 ? (
                    <tr><td colSpan={9} className="text-center text-slate-400 py-8">Нет данных</td></tr>
                  ) : byMargin.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium">{r.material}</td>
                      <td className="px-3 py-2">{r.size}</td>
                      <td className="px-3 py-2">{r.wallThickness ?? '—'}</td>
                      <td className="px-3 py-2 text-right">{r.buyW > 0 ? r.buyW.toFixed(3) : '—'}</td>
                      <td className="px-3 py-2 text-right">{r.avgBuy > 0 ? fmtNum(r.avgBuy) : '—'}</td>
                      <td className="px-3 py-2 text-right">{r.sellW > 0 ? r.sellW.toFixed(3) : '—'}</td>
                      <td className="px-3 py-2 text-right">{r.avgSell > 0 ? fmtNum(r.avgSell) : '—'}</td>
                      <td className={`px-3 py-2 text-right font-bold ${r.margin >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmtNum(r.margin)}</td>
                      <td className={`px-3 py-2 text-right ${r.marginPct >= 0 ? 'text-green-700' : 'text-red-600'}`}>{r.marginPct !== 0 ? r.marginPct.toFixed(1) : '—'}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
