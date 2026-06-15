import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import api from '../lib/api';
import { InventoryLedger, RawMaterial, User } from '../types';

const TYPE_BADGE: Record<string, string> = {
  purchase: 'badge-blue',
  consumption: 'badge-red',
  adjustment: 'badge-yellow',
  production: 'badge-green',
  transfer: 'badge-gray',
  return: 'badge-green',
};

export default function InventoryLedgerPage() {
  const [type, setType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const params: Record<string, string> = {};
  if (type) params.transactionType = type;
  if (from) params.from = from;
  if (to) params.to = to;

  const { data, isLoading } = useQuery<{ records: InventoryLedger[]; total: number }>({
    queryKey: ['inventory-ledger', params],
    queryFn: () => api.get('/inventory-ledger', { params }).then((r) => r.data),
  });
  const ledger = data?.records ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Inventory Ledger</h1>
      <p className="text-sm text-gray-500">Complete audit trail of all stock movements</p>

      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="label">Transaction Type</label>
          <select className="input w-44" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All Types</option>
            {['purchase', 'consumption', 'adjustment', 'production', 'transfer', 'return'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">From Date</label>
          <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">To Date</label>
          <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button onClick={() => { setType(''); setFrom(''); setTo(''); }} className="btn-secondary">Reset</button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="table-th">Date</th>
                <th className="table-th">Material</th>
                <th className="table-th">Type</th>
                <th className="table-th">Reference</th>
                <th className="table-th">Quantity</th>
                <th className="table-th">Before</th>
                <th className="table-th">After</th>
                <th className="table-th">Unit Cost</th>
                <th className="table-th">Total Value</th>
                <th className="table-th">User</th>
                <th className="table-th">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && <tr><td colSpan={11} className="table-td text-center text-gray-400">Loading…</td></tr>}
              {!isLoading && ledger.length === 0 && <tr><td colSpan={11} className="table-td text-center text-gray-400 py-8">No transactions found</td></tr>}
              {ledger.map((l) => {
                const mat = typeof l.material === 'object' ? l.material as RawMaterial : null;
                const user = typeof l.user === 'object' ? l.user as User : null;
                return (
                  <tr key={l._id} className="hover:bg-gray-50">
                    <td className="table-td text-xs text-gray-500 whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</td>
                    <td className="table-td font-medium">{mat?.materialName ?? '-'}</td>
                    <td className="table-td"><span className={TYPE_BADGE[l.transactionType] ?? 'badge-gray'}>{l.transactionType}</span></td>
                    <td className="table-td font-mono text-xs">{l.referenceNumber}</td>
                    <td className={`table-td font-semibold ${l.quantity < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {l.quantity > 0 ? '+' : ''}{l.quantity.toFixed(2)} {mat?.unit}
                    </td>
                    <td className="table-td text-gray-500">{l.beforeQuantity.toFixed(2)}</td>
                    <td className="table-td">{l.afterQuantity.toFixed(2)}</td>
                    <td className="table-td">₹{l.unitCost.toFixed(2)}</td>
                    <td className="table-td font-medium">₹{(Math.abs(l.quantity) * l.unitCost).toFixed(2)}</td>
                    <td className="table-td text-xs text-gray-500">{user?.name ?? '-'}</td>
                    <td className="table-td text-xs text-gray-500 max-w-xs truncate">{l.notes || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
