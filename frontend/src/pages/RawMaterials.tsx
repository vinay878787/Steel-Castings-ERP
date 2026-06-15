import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, AlertTriangle, TrendingUp, TrendingDown, BookOpen } from 'lucide-react';
import api from '../lib/api';
import { RawMaterial } from '../types';
import Modal from '../components/Modal';
import { useAuthStore } from '../store/authStore';
import DynamicFields, { displayCustomField } from '../components/DynamicFields';
import { useColumnConfig } from '../hooks/useColumnConfig';

const UNITS = ['KG', 'MT', 'LTR', 'PCS', 'TON', 'G', 'M', 'MM'];

const emptyForm = {
  materialCode: '', materialName: '', category: '', unit: 'KG',
  currentStock: 0, minimumStock: 0, averageCost: 0, storageLocation: '',
  customFields: {} as Record<string, unknown>,
};

type ModalType = 'create' | 'edit' | 'stock-in' | 'stock-out' | 'ledger' | null;

export default function RawMaterials() {
  const qc = useQueryClient();
  const { hasRole } = useAuthStore();
  const canEdit = hasRole('admin', 'manager');

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [modal, setModal] = useState<ModalType>(null);
  const [selected, setSelected] = useState<RawMaterial | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [stockQty, setStockQty] = useState('');
  const [stockCost, setStockCost] = useState('');
  const [stockNotes, setStockNotes] = useState('');
  const [error, setError] = useState('');

  const { data: columnConfigs = [] } = useColumnConfig('rawMaterial');

  const params: Record<string, string> = {};
  if (search) params.search = search;
  if (categoryFilter) params.category = categoryFilter;
  if (lowStockOnly) params.lowStock = 'true';

  const { data: materials = [], isLoading } = useQuery<RawMaterial[]>({
    queryKey: ['raw-materials', params],
    queryFn: () => api.get('/raw-materials', { params }).then((r) => r.data),
  });

  const { data: categories = [] } = useQuery<string[]>({
    queryKey: ['raw-material-categories'],
    queryFn: () => api.get('/raw-materials/categories').then((r) => r.data),
  });

  const { data: ledger = [] } = useQuery({
    queryKey: ['material-ledger', selected?._id],
    queryFn: () => api.get(`/raw-materials/${selected!._id}/ledger`).then((r) => r.data),
    enabled: modal === 'ledger' && !!selected,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['raw-materials'] });

  const saveMutation = useMutation({
    mutationFn: (data: typeof emptyForm) =>
      selected ? api.put(`/raw-materials/${selected._id}`, data) : api.post('/raw-materials', data),
    onSuccess: () => { invalidate(); closeModal(); },
    onError: (e: unknown) => setError(getMsg(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/raw-materials/${id}`),
    onSuccess: invalidate,
  });

  const stockMutation = useMutation({
    mutationFn: ({ type, qty, cost, notes }: { type: 'stock-in' | 'stock-out'; qty: number; cost?: number; notes: string }) =>
      api.post(`/raw-materials/${selected!._id}/${type}`, { quantity: qty, unitCost: cost, notes }),
    onSuccess: () => { invalidate(); closeModal(); },
    onError: (e: unknown) => setError(getMsg(e)),
  });

  const getMsg = (e: unknown) => {
    if (e && typeof e === 'object' && 'response' in e) {
      return (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Error';
    }
    return 'Error';
  };

  const openCreate = () => { setSelected(null); setForm(emptyForm); setError(''); setModal('create'); };
  const openEdit = (m: RawMaterial) => {
    setSelected(m);
    setForm({
      materialCode: m.materialCode, materialName: m.materialName, category: m.category,
      unit: m.unit, currentStock: m.currentStock, minimumStock: m.minimumStock,
      averageCost: m.averageCost, storageLocation: m.storageLocation,
      customFields: m.customFields ?? {},
    });
    setError('');
    setModal('edit');
  };
  const openStock = (m: RawMaterial, type: 'stock-in' | 'stock-out') => { setSelected(m); setStockQty(''); setStockCost(''); setStockNotes(''); setError(''); setModal(type); };
  const openLedger = (m: RawMaterial) => { setSelected(m); setModal('ledger'); };
  const closeModal = () => { setModal(null); setSelected(null); };

  const handleSave = () => saveMutation.mutate(form);
  const handleStock = () => {
    const qty = parseFloat(stockQty);
    if (!qty || qty <= 0) { setError('Enter a valid quantity'); return; }
    stockMutation.mutate({ type: modal as 'stock-in' | 'stock-out', qty, cost: stockCost ? parseFloat(stockCost) : undefined, notes: stockNotes });
  };

  const txBadge = (type: string) => {
    const map: Record<string, string> = { purchase: 'badge-blue', consumption: 'badge-red', adjustment: 'badge-yellow', production: 'badge-green', transfer: 'badge-gray', return: 'badge-green' };
    return map[type] ?? 'badge-gray';
  };

  const visibleCols = columnConfigs.filter((c) => c.isVisible);
  const baseColCount = 8;
  const totalCols = baseColCount + visibleCols.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Raw Materials</h1>
        {canEdit && <button onClick={openCreate} className="btn-primary"><Plus size={16} className="mr-1.5" />Add Material</button>}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search materials…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input w-44" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} className="rounded" />
          <AlertTriangle size={14} className="text-red-500" /> Low Stock Only
        </label>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
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
                <th className="table-th">Location</th>
                {visibleCols.map((c) => <th key={c._id} className="table-th">{c.fieldLabel}</th>)}
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr><td colSpan={totalCols} className="table-td text-center text-gray-400">Loading…</td></tr>
              )}
              {!isLoading && materials.length === 0 && (
                <tr><td colSpan={totalCols} className="table-td text-center text-gray-400 py-8">No materials found</td></tr>
              )}
              {materials.map((m) => {
                const isLow = m.currentStock <= m.minimumStock;
                return (
                  <tr key={m._id} className={`hover:bg-gray-50 ${isLow ? 'bg-red-50/50' : ''}`}>
                    <td className="table-td font-mono text-xs font-medium">{m.materialCode}</td>
                    <td className="table-td font-medium">
                      {m.materialName}
                      {isLow && <AlertTriangle size={12} className="inline ml-1 text-red-500" />}
                    </td>
                    <td className="table-td"><span className="badge-gray badge">{m.category}</span></td>
                    <td className={`table-td font-semibold ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
                      {m.currentStock.toFixed(2)} {m.unit}
                    </td>
                    <td className="table-td text-gray-500">{m.minimumStock} {m.unit}</td>
                    <td className="table-td">₹{m.averageCost.toFixed(2)}</td>
                    <td className="table-td text-gray-500">{m.storageLocation || '-'}</td>
                    {visibleCols.map((c) => (
                      <td key={c._id} className="table-td text-gray-600">
                        {displayCustomField(m.customFields?.[c.fieldName], c.fieldType)}
                      </td>
                    ))}
                    <td className="table-td">
                      <div className="flex items-center gap-1">
                        {canEdit && (
                          <>
                            <button onClick={() => openStock(m, 'stock-in')} className="btn btn-sm btn-success" title="Stock In"><TrendingUp size={13} /></button>
                            <button onClick={() => openStock(m, 'stock-out')} className="btn btn-sm btn-danger" title="Stock Out"><TrendingDown size={13} /></button>
                          </>
                        )}
                        <button onClick={() => openLedger(m)} className="btn btn-sm btn-secondary" title="Ledger"><BookOpen size={13} /></button>
                        {canEdit && (
                          <>
                            <button onClick={() => openEdit(m)} className="btn btn-sm btn-secondary">Edit</button>
                            <button onClick={() => { if (confirm('Delete this material?')) deleteMutation.mutate(m._id); }} className="btn btn-sm btn-danger">Del</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={modal === 'create' || modal === 'edit'} onClose={closeModal} title={modal === 'create' ? 'Add Material' : 'Edit Material'} size="lg">
        <div className="grid grid-cols-2 gap-4">
          {['materialCode', 'materialName', 'category', 'storageLocation'].map((f) => (
            <div key={f}>
              <label className="label capitalize">{f.replace(/([A-Z])/g, ' $1')}</label>
              <input className="input" value={(form as Record<string, unknown>)[f] as string}
                onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))} />
            </div>
          ))}
          <div>
            <label className="label">Unit</label>
            <select className="input" value={form.unit} onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}>
              {UNITS.map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
          {['currentStock', 'minimumStock', 'averageCost'].map((f) => (
            <div key={f}>
              <label className="label capitalize">{f.replace(/([A-Z])/g, ' $1')}</label>
              <input className="input" type="number" step="0.01" value={(form as Record<string, unknown>)[f] as number}
                onChange={(e) => setForm((p) => ({ ...p, [f]: parseFloat(e.target.value) || 0 }))} />
            </div>
          ))}
          <DynamicFields
            configs={columnConfigs}
            values={form.customFields}
            onChange={(key, val) => setForm((p) => ({ ...p, customFields: { ...p.customFields, [key]: val } }))}
          />
        </div>
        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={closeModal} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saveMutation.isPending} className="btn-primary">
            {saveMutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </Modal>

      {/* Stock In/Out Modal */}
      <Modal isOpen={modal === 'stock-in' || modal === 'stock-out'} onClose={closeModal}
        title={`${modal === 'stock-in' ? 'Stock In' : 'Stock Out'} — ${selected?.materialName}`}>
        <div className="space-y-3">
          <div>
            <label className="label">Quantity ({selected?.unit})</label>
            <input className="input" type="number" step="0.01" value={stockQty} onChange={(e) => setStockQty(e.target.value)} placeholder="0" />
          </div>
          {modal === 'stock-in' && (
            <div>
              <label className="label">Unit Cost (₹) — optional</label>
              <input className="input" type="number" step="0.01" value={stockCost} onChange={(e) => setStockCost(e.target.value)} placeholder="Leave blank to use avg cost" />
            </div>
          )}
          <div>
            <label className="label">Notes</label>
            <input className="input" value={stockNotes} onChange={(e) => setStockNotes(e.target.value)} placeholder="Optional notes" />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>
        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={closeModal} className="btn-secondary">Cancel</button>
          <button onClick={handleStock} disabled={stockMutation.isPending}
            className={modal === 'stock-in' ? 'btn-success' : 'btn-danger'}>
            {stockMutation.isPending ? 'Processing…' : `Confirm ${modal === 'stock-in' ? 'Stock In' : 'Stock Out'}`}
          </button>
        </div>
      </Modal>

      {/* Ledger Modal */}
      <Modal isOpen={modal === 'ledger'} onClose={closeModal} title={`Ledger — ${selected?.materialName}`} size="xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Date</th>
                <th className="table-th">Type</th>
                <th className="table-th">Ref</th>
                <th className="table-th">Qty</th>
                <th className="table-th">Before</th>
                <th className="table-th">After</th>
                <th className="table-th">Cost</th>
                <th className="table-th">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(ledger as Array<{ _id: string; createdAt: string; transactionType: string; referenceNumber: string; quantity: number; beforeQuantity: number; afterQuantity: number; unitCost: number; user: { name: string } | string }>).map((l) => (
                <tr key={l._id} className="hover:bg-gray-50">
                  <td className="table-td text-xs text-gray-500">{new Date(l.createdAt).toLocaleDateString()}</td>
                  <td className="table-td"><span className={txBadge(l.transactionType)}>{l.transactionType}</span></td>
                  <td className="table-td font-mono text-xs">{l.referenceNumber}</td>
                  <td className={`table-td font-semibold ${l.quantity < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {l.quantity > 0 ? '+' : ''}{l.quantity.toFixed(2)}
                  </td>
                  <td className="table-td">{l.beforeQuantity.toFixed(2)}</td>
                  <td className="table-td">{l.afterQuantity.toFixed(2)}</td>
                  <td className="table-td">₹{l.unitCost.toFixed(2)}</td>
                  <td className="table-td text-gray-500">{typeof l.user === 'object' ? l.user.name : '-'}</td>
                </tr>
              ))}
              {ledger.length === 0 && <tr><td colSpan={8} className="table-td text-center text-gray-400">No transactions</td></tr>}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
}
