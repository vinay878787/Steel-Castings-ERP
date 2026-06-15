import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import api from '../lib/api';
import { Supplier } from '../types';
import Modal from '../components/Modal';
import DynamicFields, { displayCustomField } from '../components/DynamicFields';
import { useColumnConfig } from '../hooks/useColumnConfig';

const empty = {
  name: '', contactPerson: '', email: '', phone: '', address: '',
  customFields: {} as Record<string, unknown>,
};

export default function Suppliers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState<Supplier | null>(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');

  const { data: columnConfigs = [] } = useColumnConfig('supplier');

  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ['suppliers'],
    queryFn: () => api.get('/suppliers').then((r) => r.data),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['suppliers'] });
  const getMsg = (e: unknown) =>
    (e && typeof e === 'object' && 'response' in e) ? (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Error' : 'Error';

  const saveMutation = useMutation({
    mutationFn: (d: typeof empty) => selected ? api.put(`/suppliers/${selected._id}`, d) : api.post('/suppliers', d),
    onSuccess: () => { invalidate(); setModal(false); },
    onError: (e: unknown) => setError(getMsg(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/suppliers/${id}`),
    onSuccess: invalidate,
  });

  const openEdit = (s: Supplier) => {
    setSelected(s);
    setForm({ name: s.name, contactPerson: s.contactPerson, email: s.email, phone: s.phone, address: s.address, customFields: s.customFields ?? {} });
    setError('');
    setModal(true);
  };

  const filtered = suppliers.filter((s) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase())
  );

  const visibleCols = columnConfigs.filter((c) => c.isVisible);
  const totalCols = 6 + visibleCols.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
        <button onClick={() => { setSelected(null); setForm(empty); setError(''); setModal(true); }} className="btn-primary">
          <Plus size={16} className="mr-1.5" />Add Supplier
        </button>
      </div>

      <div className="card p-4">
        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search suppliers…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="table-th">Name</th>
                <th className="table-th">Contact Person</th>
                <th className="table-th">Email</th>
                <th className="table-th">Phone</th>
                <th className="table-th">Address</th>
                {visibleCols.map((c) => <th key={c._id} className="table-th">{c.fieldLabel}</th>)}
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && <tr><td colSpan={totalCols} className="table-td text-center text-gray-400">Loading…</td></tr>}
              {!isLoading && filtered.length === 0 && <tr><td colSpan={totalCols} className="table-td text-center text-gray-400 py-8">No suppliers found</td></tr>}
              {filtered.map((s) => (
                <tr key={s._id} className="hover:bg-gray-50">
                  <td className="table-td font-medium">{s.name}</td>
                  <td className="table-td">{s.contactPerson}</td>
                  <td className="table-td">{s.email}</td>
                  <td className="table-td">{s.phone}</td>
                  <td className="table-td text-gray-500 max-w-xs truncate">{s.address}</td>
                  {visibleCols.map((c) => (
                    <td key={c._id} className="table-td text-gray-600">
                      {displayCustomField(s.customFields?.[c.fieldName], c.fieldType)}
                    </td>
                  ))}
                  <td className="table-td">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(s)} className="btn btn-sm btn-secondary">Edit</button>
                      <button onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(s._id); }} className="btn btn-sm btn-danger">Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title={selected ? 'Edit Supplier' : 'Add Supplier'} size="lg">
        <div className="grid grid-cols-2 gap-4">
          {[
            { k: 'name', label: 'Company Name' },
            { k: 'contactPerson', label: 'Contact Person' },
            { k: 'email', label: 'Email' },
            { k: 'phone', label: 'Phone' },
          ].map(({ k, label }) => (
            <div key={k}>
              <label className="label">{label}</label>
              <input className="input" value={form[k as keyof typeof form] as string}
                onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
            </div>
          ))}
          <div className="col-span-2">
            <label className="label">Address</label>
            <textarea className="input" rows={2} value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
          </div>
          <DynamicFields
            configs={columnConfigs}
            values={form.customFields}
            onChange={(key, val) => setForm((f) => ({ ...f, customFields: { ...f.customFields, [key]: val } }))}
          />
        </div>
        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
          <button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} className="btn-primary">
            {saveMutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
