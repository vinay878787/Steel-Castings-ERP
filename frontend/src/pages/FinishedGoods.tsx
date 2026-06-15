import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Search } from 'lucide-react';
import api from '../lib/api';
import { FinishedGoods, Product } from '../types';

export default function FinishedGoodsPage() {
  const [search, setSearch] = useState('');

  const { data: goods = [], isLoading } = useQuery<FinishedGoods[]>({
    queryKey: ['finished-goods'],
    queryFn: () => api.get('/finished-goods').then((r) => r.data),
  });

  const filtered = goods.filter((g) => {
    if (!search) return true;
    const p = typeof g.product === 'object' ? g.product as Product : null;
    return p?.productName.toLowerCase().includes(search.toLowerCase()) || p?.productCode.toLowerCase().includes(search.toLowerCase());
  });

  const totalValue = goods.reduce((s, g) => s + g.inventoryValue, 0);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Finished Goods Inventory</h1>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-sm text-gray-500">Total Products</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{goods.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500">Total Value</p>
          <p className="text-2xl font-bold text-green-600 mt-1">₹{totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500">In Stock</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{goods.filter((g) => g.availableQuantity > 0).length}</p>
        </div>
      </div>

      <div className="card p-4">
        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="table-th">Product</th>
              <th className="table-th">Code</th>
              <th className="table-th">Available Qty</th>
              <th className="table-th">Reserved Qty</th>
              <th className="table-th">Inventory Value</th>
              <th className="table-th">Last Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && <tr><td colSpan={6} className="table-td text-center text-gray-400">Loading…</td></tr>}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={6} className="table-td text-center text-gray-400 py-8">No finished goods found</td></tr>
            )}
            {filtered.map((g) => {
              const p = typeof g.product === 'object' ? g.product as Product : null;
              return (
                <tr key={g._id} className="hover:bg-gray-50">
                  <td className="table-td font-medium">{p?.productName ?? '-'}</td>
                  <td className="table-td font-mono text-xs">{p?.productCode ?? '-'}</td>
                  <td className="table-td">
                    <span className={`font-semibold ${g.availableQuantity > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                      {g.availableQuantity} {p?.unit}
                    </span>
                  </td>
                  <td className="table-td text-gray-500">{g.reservedQuantity}</td>
                  <td className="table-td font-semibold">₹{g.inventoryValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                  <td className="table-td text-xs text-gray-500">{new Date(g.updatedAt).toLocaleDateString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
