import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import api from '../lib/api';
import { Product } from '../types';
import Modal from '../components/Modal';
import { useAuthStore } from '../store/authStore';
import DynamicFields, { displayCustomField } from '../components/DynamicFields';
import { useColumnConfig } from '../hooks/useColumnConfig';

const empty = {
  productCode: '', productName: '', description: '', unit: 'PCS', standardCost: 0, sellingPrice: 0,
  customFields: {} as Record<string, unknown>,
};

export default function Products() {
  const qc = useQueryClient();
  const { hasRole } = useAuthStore();
  const canEdit = hasRole('admin', 'manager');

  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');

  const { data: columnConfigs = [] } = useColumnConfig('product');

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['products', search],
    queryFn: () => api.get('/products', { params: search ? { search } : {} }).then((r) => r.data),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['products'] });

  const saveMutation = useMutation({
    mutationFn: (d: typeof empty) => selected ? api.put(`/products/${selected._id}`, d) : api.post('/products', d),
    onSuccess: () => { invalidate(); closeModal(); },
    onError: (e: unknown) => setError(getMsg(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: invalidate,
  });

  const getMsg = (e: unknown) =>
    (e && typeof e === 'object' && 'response' in e) ? (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Error' : 'Error';

  const openCreate = () => { setSelected(null); setForm(empty); setError(''); setModal(true); };
  const openEdit = (p: Product) => {
    setSelected(p);
    setForm({
      productCode: p.productCode, productName: p.productName, description: p.description,
      unit: p.unit, standardCost: p.standardCost, sellingPrice: p.sellingPrice,
      customFields: p.customFields ?? {},
    });
    setError('');
    setModal(true);
  };
  const closeModal = () => { setModal(false); setSelected(null); };
  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const visibleCols = columnConfigs.filter((c) => c.isVisible);
  const baseColCount = canEdit ? 7 : 6;
  const totalCols = baseColCount + visibleCols.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        {canEdit && <button onClick={openCreate} className="btn-primary"><Plus size={16} className="mr-1.5" />Add Product</button>}
      </div>

      <div className="card p-4">
        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="table-th">Code</th>
                <th className="table-th">Name</th>
                <th className="table-th">Description</th>
                <th className="table-th">Unit</th>
                <th className="table-th">Std Cost</th>
                <th className="table-th">Selling Price</th>
                {visibleCols.map((c) => <th key={c._id} className="table-th">{c.fieldLabel}</th>)}
                {canEdit && <th className="table-th">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && <tr><td colSpan={totalCols} className="table-td text-center text-gray-400">Loading…</td></tr>}
              {!isLoading && products.length === 0 && <tr><td colSpan={totalCols} className="table-td text-center text-gray-400 py-8">No products found</td></tr>}
              {products.map((p) => (
                <tr key={p._id} className="hover:bg-gray-50">
                  <td className="table-td font-mono text-xs font-medium">{p.productCode}</td>
                  <td className="table-td font-medium">{p.productName}</td>
                  <td className="table-td text-gray-500 max-w-xs truncate">{p.description || '-'}</td>
                  <td className="table-td">{p.unit}</td>
                  <td className="table-td">₹{p.standardCost.toFixed(2)}</td>
                  <td className="table-td">₹{p.sellingPrice.toFixed(2)}</td>
                  {visibleCols.map((c) => (
                    <td key={c._id} className="table-td text-gray-600">
                      {displayCustomField(p.customFields?.[c.fieldName], c.fieldType)}
                    </td>
                  ))}
                  {canEdit && (
                    <td className="table-td">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(p)} className="btn btn-sm btn-secondary">Edit</button>
                        <button onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(p._id); }} className="btn btn-sm btn-danger">Del</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={modal} onClose={closeModal} title={selected ? 'Edit Product' : 'Add Product'} size="lg">
        <div className="grid grid-cols-2 gap-4">
          {[
            { k: 'productCode', label: 'Product Code' },
            { k: 'productName', label: 'Product Name' },
            { k: 'description', label: 'Description' },
            { k: 'unit', label: 'Unit' },
          ].map(({ k, label }) => (
            <div key={k} className={k === 'description' ? 'col-span-2' : ''}>
              <label className="label">{label}</label>
              <input className="input" value={(form as Record<string, unknown>)[k] as string}
                onChange={(e) => set(k, e.target.value)} />
            </div>
          ))}
          <div>
            <label className="label">Standard Cost (₹)</label>
            <input className="input" type="number" step="0.01" value={form.standardCost}
              onChange={(e) => set('standardCost', parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className="label">Selling Price (₹)</label>
            <input className="input" type="number" step="0.01" value={form.sellingPrice}
              onChange={(e) => set('sellingPrice', parseFloat(e.target.value) || 0)} />
          </div>
          <DynamicFields
            configs={columnConfigs}
            values={form.customFields}
            onChange={(key, val) => setForm((f) => ({ ...f, customFields: { ...f.customFields, [key]: val } }))}
          />
        </div>
        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={closeModal} className="btn-secondary">Cancel</button>
          <button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} className="btn-primary">
            {saveMutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
