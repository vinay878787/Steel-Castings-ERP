import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Copy, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import api from '../lib/api';
import { BOM, Product, RawMaterial, BOMColumnConfig } from '../types';
import Modal from '../components/Modal';
import { useAuthStore } from '../store/authStore';

interface BOMItemForm {
  material: string;
  quantityRequired: number;
  unit: string;
  dynamicFields: Record<string, unknown>;
}

interface BOMForm {
  product: string;
  outputQuantity: number;
  notes: string;
  items: BOMItemForm[];
}

const emptyForm: BOMForm = { product: '', outputQuantity: 1, notes: '', items: [] };

export default function BOMPage() {
  const qc = useQueryClient();
  const { hasRole } = useAuthStore();
  const canEdit = hasRole('admin', 'manager');

  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState<BOM | null>(null);
  const [form, setForm] = useState<BOMForm>(emptyForm);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [productFilter, setProductFilter] = useState('');
  const [error, setError] = useState('');

  const { data: boms = [], isLoading } = useQuery<BOM[]>({
    queryKey: ['boms', productFilter],
    queryFn: () => api.get('/bom', { params: productFilter ? { product: productFilter } : {} }).then((r) => r.data),
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => api.get('/products').then((r) => r.data),
  });

  const { data: materials = [] } = useQuery<RawMaterial[]>({
    queryKey: ['raw-materials', {}],
    queryFn: () => api.get('/raw-materials').then((r) => r.data),
  });

  const { data: bomColumns = [] } = useQuery<BOMColumnConfig[]>({
    queryKey: ['bom-config'],
    queryFn: () => api.get('/bom-config').then((r) => r.data),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['boms'] });
  const getMsg = (e: unknown) =>
    (e && typeof e === 'object' && 'response' in e) ? (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Error' : 'Error';

  const saveMutation = useMutation({
    mutationFn: (d: BOMForm) => selected ? api.put(`/bom/${selected._id}`, d) : api.post('/bom', d),
    onSuccess: () => { invalidate(); closeModal(); },
    onError: (e: unknown) => setError(getMsg(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/bom/${id}`),
    onSuccess: invalidate,
  });

  const cloneMutation = useMutation({
    mutationFn: (id: string) => api.post(`/bom/${id}/clone`),
    onSuccess: invalidate,
  });

  const openCreate = () => {
    setSelected(null);
    setForm(emptyForm);
    setError('');
    setModal(true);
  };

  const openEdit = (b: BOM) => {
    setSelected(b);
    const product = typeof b.product === 'object' ? b.product._id : b.product;
    setForm({
      product,
      outputQuantity: b.outputQuantity,
      notes: b.notes,
      items: b.items.map((item) => ({
        material: typeof item.material === 'object' ? (item.material as RawMaterial)._id : item.material as string,
        quantityRequired: item.quantityRequired,
        unit: item.unit,
        dynamicFields: item.dynamicFields || {},
      })),
    });
    setError('');
    setModal(true);
  };

  const closeModal = () => { setModal(false); setSelected(null); };

  const addItem = () => {
    const dynFields: Record<string, unknown> = {};
    bomColumns.forEach((c) => { dynFields[c.fieldName] = ''; });
    setForm((f) => ({ ...f, items: [...f.items, { material: '', quantityRequired: 0, unit: 'KG', dynamicFields: dynFields }] }));
  };

  const removeItem = (i: number) => setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));

  const updateItem = (i: number, key: string, val: unknown) =>
    setForm((f) => ({ ...f, items: f.items.map((item, idx) => idx === i ? { ...item, [key]: val } : item) }));

  const updateDynField = (i: number, key: string, val: unknown) =>
    setForm((f) => ({
      ...f,
      items: f.items.map((item, idx) => idx === i ? { ...item, dynamicFields: { ...item.dynamicFields, [key]: val } } : item),
    }));

  const calcCost = (bom: BOM) =>
    bom.items.reduce((sum, item) => {
      const mat = typeof item.material === 'object' ? item.material as RawMaterial : null;
      return sum + item.quantityRequired * (mat?.averageCost ?? 0);
    }, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Bill of Materials</h1>
        {canEdit && <button onClick={openCreate} className="btn-primary"><Plus size={16} className="mr-1.5" />Create BOM</button>}
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-3">
          <label className="label mb-0">Filter by Product:</label>
          <select className="input w-56" value={productFilter} onChange={(e) => setProductFilter(e.target.value)}>
            <option value="">All Products</option>
            {products.map((p) => <option key={p._id} value={p._id}>{p.productName}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading && <div className="card p-8 text-center text-gray-400">Loading…</div>}
        {!isLoading && boms.length === 0 && <div className="card p-8 text-center text-gray-400">No BOMs found</div>}
        {boms.map((bom) => {
          const product = typeof bom.product === 'object' ? bom.product as Product : null;
          const isExpanded = expanded === bom._id;
          const totalCost = calcCost(bom);

          return (
            <div key={bom._id} className="card overflow-hidden">
              <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                onClick={() => setExpanded(isExpanded ? null : bom._id)}>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">{product?.productName ?? 'Unknown Product'}</p>
                    <p className="text-xs text-gray-500">v{bom.version} · Output: {bom.outputQuantity} {product?.unit}</p>
                  </div>
                  <span className="badge-blue">{bom.items.length} materials</span>
                  <span className="text-sm text-gray-600">Cost: ₹{totalCost.toFixed(2)} · ₹{bom.outputQuantity > 0 ? (totalCost / bom.outputQuantity).toFixed(2) : 0}/unit</span>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {canEdit && (
                    <>
                      <button onClick={() => openEdit(bom)} className="btn btn-sm btn-secondary">Edit</button>
                      <button onClick={() => cloneMutation.mutate(bom._id)} className="btn btn-sm btn-secondary" title="Clone BOM">
                        <Copy size={13} />
                      </button>
                      <button onClick={() => { if (confirm('Delete BOM?')) deleteMutation.mutate(bom._id); }} className="btn btn-sm btn-danger">
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-gray-200 overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="table-th">Material</th>
                        <th className="table-th">Qty Required</th>
                        <th className="table-th">Unit</th>
                        <th className="table-th">Avg Cost</th>
                        <th className="table-th">Line Total</th>
                        {bomColumns.filter((c) => c.isVisible).map((c) => (
                          <th key={c._id} className="table-th">{c.fieldLabel}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {bom.items.map((item, idx) => {
                        const mat = typeof item.material === 'object' ? item.material as RawMaterial : null;
                        return (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="table-td font-medium">{mat?.materialName ?? '-'}</td>
                            <td className="table-td">{item.quantityRequired}</td>
                            <td className="table-td">{item.unit}</td>
                            <td className="table-td">₹{(mat?.averageCost ?? 0).toFixed(2)}</td>
                            <td className="table-td font-semibold">₹{(item.quantityRequired * (mat?.averageCost ?? 0)).toFixed(2)}</td>
                            {bomColumns.filter((c) => c.isVisible).map((c) => (
                              <td key={c._id} className="table-td text-gray-500">
                                {String(item.dynamicFields?.[c.fieldName] ?? '-')}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {bom.notes && <p className="px-4 py-2 text-sm text-gray-500 bg-gray-50 border-t">Note: {bom.notes}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={modal} onClose={closeModal} title={selected ? 'Edit BOM' : 'Create BOM'} size="xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Product</label>
              <select className="input" value={form.product} onChange={(e) => setForm((f) => ({ ...f, product: e.target.value }))}>
                <option value="">Select Product</option>
                {products.map((p) => <option key={p._id} value={p._id}>{p.productName} ({p.productCode})</option>)}
              </select>
            </div>
            <div>
              <label className="label">Output Quantity</label>
              <input className="input" type="number" min="1" value={form.outputQuantity}
                onChange={(e) => setForm((f) => ({ ...f, outputQuantity: parseInt(e.target.value) || 1 }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Notes</label>
              <input className="input" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-800">Materials</h3>
              <button onClick={addItem} className="btn btn-sm btn-secondary"><Plus size={13} className="mr-1" />Add Row</button>
            </div>

            {form.items.length === 0 && <p className="text-gray-400 text-sm py-3 text-center">No items — click Add Row</p>}

            {form.items.map((item, i) => (
              <div key={i} className="grid gap-2 mb-2 items-end border border-gray-200 rounded-lg p-3">
                <div className="grid grid-cols-4 gap-2">
                  <div className="col-span-2">
                    <label className="label">Material</label>
                    <select className="input" value={item.material} onChange={(e) => {
                      const mat = materials.find((m) => m._id === e.target.value);
                      updateItem(i, 'material', e.target.value);
                      if (mat) updateItem(i, 'unit', mat.unit);
                    }}>
                      <option value="">Select Material</option>
                      {materials.map((m) => <option key={m._id} value={m._id}>{m.materialName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Qty Required</label>
                    <input className="input" type="number" step="0.01" value={item.quantityRequired}
                      onChange={(e) => updateItem(i, 'quantityRequired', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div>
                    <label className="label">Unit</label>
                    <input className="input" value={item.unit} onChange={(e) => updateItem(i, 'unit', e.target.value)} />
                  </div>
                </div>

                {bomColumns.filter((c) => c.isVisible).length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {bomColumns.filter((c) => c.isVisible).map((col) => (
                      <div key={col._id}>
                        <label className="label">{col.fieldLabel}</label>
                        <input className="input" type={col.fieldType === 'number' ? 'number' : 'text'}
                          value={String(item.dynamicFields[col.fieldName] ?? '')}
                          onChange={(e) => updateDynField(i, col.fieldName, e.target.value)} />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end">
                  <button onClick={() => removeItem(i)} className="btn btn-sm btn-danger"><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button onClick={closeModal} className="btn-secondary">Cancel</button>
            <button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} className="btn-primary">
              {saveMutation.isPending ? 'Saving…' : 'Save BOM'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
