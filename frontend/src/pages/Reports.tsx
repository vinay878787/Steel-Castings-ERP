import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../lib/api';
import { RawMaterial } from '../types';

type ReportTab = 'inventory' | 'production' | 'consumption' | 'stock-valuation' | 'bom-cost';

export default function Reports() {
  const [tab, setTab] = useState<ReportTab>('inventory');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const dateParams = from || to ? { from, to } : {};

  const inventoryQ = useQuery({
    queryKey: ['report-inventory'],
    queryFn: () => api.get('/reports/inventory').then((r) => r.data),
    enabled: tab === 'inventory',
  });

  const productionQ = useQuery({
    queryKey: ['report-production', dateParams],
    queryFn: () => api.get('/reports/production', { params: dateParams }).then((r) => r.data),
    enabled: tab === 'production',
  });

  const consumptionQ = useQuery({
    queryKey: ['report-consumption', dateParams],
    queryFn: () => api.get('/reports/consumption', { params: dateParams }).then((r) => r.data),
    enabled: tab === 'consumption',
  });

  const stockValQ = useQuery({
    queryKey: ['report-stock-valuation'],
    queryFn: () => api.get('/reports/stock-valuation').then((r) => r.data),
    enabled: tab === 'stock-valuation',
  });

  const bomCostQ = useQuery({
    queryKey: ['report-bom-cost'],
    queryFn: () => api.get('/reports/bom-cost').then((r) => r.data),
    enabled: tab === 'bom-cost',
  });

  const TABS: { id: ReportTab; label: string }[] = [
    { id: 'inventory', label: 'Inventory' },
    { id: 'production', label: 'Production' },
    { id: 'consumption', label: 'Consumption' },
    { id: 'stock-valuation', label: 'Stock Valuation' },
    { id: 'bom-cost', label: 'BOM Cost' },
  ];

  const hasDateFilter = tab === 'production' || tab === 'consumption';

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Reports</h1>

      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-2 flex-wrap">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`btn btn-sm ${tab === t.id ? 'btn-primary' : 'btn-secondary'}`}>
              {t.label}
            </button>
          ))}
        </div>
        {hasDateFilter && (
          <div className="flex items-center gap-2 ml-auto">
            <input className="input w-36" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <span className="text-gray-400">to</span>
            <input className="input w-36" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        )}
      </div>

      {/* Inventory Report */}
      {tab === 'inventory' && inventoryQ.data && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-5">
              <p className="text-sm text-gray-500">Total Materials</p>
              <p className="text-2xl font-bold">{inventoryQ.data.materials.length}</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-gray-500">Total Value</p>
              <p className="text-2xl font-bold text-blue-600">₹{inventoryQ.data.totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-gray-500">Low Stock Items</p>
              <p className={`text-2xl font-bold ${inventoryQ.data.lowStockCount > 0 ? 'text-red-600' : 'text-green-600'}`}>{inventoryQ.data.lowStockCount}</p>
            </div>
          </div>
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200 font-semibold">Raw Material Inventory</div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="table-th">Code</th>
                    <th className="table-th">Name</th>
                    <th className="table-th">Category</th>
                    <th className="table-th">Stock</th>
                    <th className="table-th">Min Stock</th>
                    <th className="table-th">Avg Cost</th>
                    <th className="table-th">Value</th>
                    <th className="table-th">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(inventoryQ.data.materials as RawMaterial[]).map((m) => {
                    const isLow = m.currentStock <= m.minimumStock;
                    return (
                      <tr key={m._id} className={isLow ? 'bg-red-50/50' : ''}>
                        <td className="table-td font-mono text-xs">{m.materialCode}</td>
                        <td className="table-td font-medium">{m.materialName}</td>
                        <td className="table-td">{m.category}</td>
                        <td className="table-td font-semibold">{m.currentStock} {m.unit}</td>
                        <td className="table-td text-gray-500">{m.minimumStock}</td>
                        <td className="table-td">₹{m.averageCost.toFixed(2)}</td>
                        <td className="table-td font-semibold">₹{(m.currentStock * m.averageCost).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                        <td className="table-td">
                          <span className={isLow ? 'badge-red' : 'badge-green'}>{isLow ? 'Low Stock' : 'OK'}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Production Report */}
      {tab === 'production' && productionQ.data && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {Object.entries(productionQ.data.summary as Record<string, number>).map(([k, v]) => (
              <div key={k} className="card p-5">
                <p className="text-sm text-gray-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}</p>
                <p className="text-2xl font-bold mt-1">{v}</p>
              </div>
            ))}
          </div>
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200 font-semibold">Production Orders</div>
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="table-th">Order #</th>
                  <th className="table-th">Product</th>
                  <th className="table-th">Quantity</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {productionQ.data.orders.map((o: { _id: string; productionNumber: string; product: { productName?: string }; quantityToProduce: number; status: string; createdAt: string }) => (
                  <tr key={o._id}>
                    <td className="table-td font-mono text-xs">{o.productionNumber}</td>
                    <td className="table-td">{typeof o.product === 'object' ? o.product.productName : '-'}</td>
                    <td className="table-td">{o.quantityToProduce}</td>
                    <td className="table-td"><span className="badge-blue">{o.status}</span></td>
                    <td className="table-td text-xs text-gray-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Consumption Report */}
      {tab === 'consumption' && consumptionQ.data && (
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-semibold mb-4">Material Consumption Summary</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={(consumptionQ.data.byMaterial as Array<{ materialName: string; totalConsumed: number; totalCost: number }>).slice(0, 10)}>
                <XAxis dataKey="materialName" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="totalConsumed" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200 font-semibold">By Material</div>
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="table-th">Material</th>
                  <th className="table-th">Total Consumed</th>
                  <th className="table-th">Unit</th>
                  <th className="table-th">Total Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(consumptionQ.data.byMaterial as Array<{ materialName: string; unit: string; totalConsumed: number; totalCost: number }>).map((m, i) => (
                  <tr key={i}>
                    <td className="table-td font-medium">{m.materialName}</td>
                    <td className="table-td font-semibold">{m.totalConsumed.toFixed(2)}</td>
                    <td className="table-td">{m.unit}</td>
                    <td className="table-td">₹{m.totalCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Valuation */}
      {tab === 'stock-valuation' && stockValQ.data && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-5">
              <p className="text-sm text-gray-500">Raw Material Value</p>
              <p className="text-2xl font-bold text-indigo-600">₹{stockValQ.data.rawMaterialValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-gray-500">Finished Goods Value</p>
              <p className="text-2xl font-bold text-green-600">₹{stockValQ.data.finishedGoodsValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-gray-500">Total Value</p>
              <p className="text-2xl font-bold text-blue-600">₹{stockValQ.data.totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
        </div>
      )}

      {/* BOM Cost Report */}
      {tab === 'bom-cost' && bomCostQ.data && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 font-semibold">BOM Cost Analysis</div>
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="table-th">Product</th>
                <th className="table-th">BOM Ver</th>
                <th className="table-th">Output Qty</th>
                <th className="table-th">Total BOM Cost</th>
                <th className="table-th">Cost Per Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(bomCostQ.data as Array<{ bom: { version: number; outputQuantity: number; product: { productName?: string; productCode?: string } }; totalCost: number; costPerUnit: number }>).map((row, i) => (
                <tr key={i}>
                  <td className="table-td font-medium">
                    {typeof row.bom.product === 'object' ? row.bom.product.productName : '-'}
                    <span className="text-xs text-gray-400 ml-1">{typeof row.bom.product === 'object' ? row.bom.product.productCode : ''}</span>
                  </td>
                  <td className="table-td">v{row.bom.version}</td>
                  <td className="table-td">{row.bom.outputQuantity}</td>
                  <td className="table-td font-semibold">₹{row.totalCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                  <td className="table-td font-bold text-blue-600">₹{row.costPerUnit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(inventoryQ.isLoading || productionQ.isLoading || consumptionQ.isLoading || stockValQ.isLoading || bomCostQ.isLoading) && (
        <div className="card p-8 text-center text-gray-400">Loading report…</div>
      )}
    </div>
  );
}
