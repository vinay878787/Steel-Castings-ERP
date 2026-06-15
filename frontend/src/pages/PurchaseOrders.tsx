import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Truck, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../lib/api';
import { PurchaseOrder, Supplier, RawMaterial } from '../types';
import Modal from '../components/Modal';

const STATUS_BADGE: Record<string, string> = {
  pending: 'badge-yellow',
  partial: 'badge-blue',
  received: 'badge-green',
  cancelled: 'badge-red',
};

interface POItemForm { material: string; quantity: number; unitPrice: number; totalPrice: number; }

export default function PurchaseOrders() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [receiveModal, setReceiveModal] = useState<PurchaseOrder | null>(null);
  const [form, setForm] = useState({ supplier: '', expectedDelivery: '', notes: '', items: [] as POItemForm[] });
  const [error, setError] = useState('');

  const { data: orders = [], isLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ['purchase-orders', statusFilter],
    queryFn: () => api.get('/purchase-orders', { params: statusFilter ? { status: statusFilter } : {} }).then((r) => r.data),
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ['suppliers'],
    queryFn: () => api.get('/suppliers').then((r) => r.data),
  });

  const { data: materials = [] } = useQuery<RawMaterial[]>({
    queryKey: ['raw-materials', {}],
    queryFn: () => api.get('/raw-materials').then((r) => r.data),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['purchase-orders'] });
  const getMsg = (e: unknown) =>
    (e && typeof e === 'object' && 'response' in e) ? (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Error' : 'Error';

  const createMutation = useMutation({
    mutationFn: (d: typeof form) => api.post('/purchase-orders', d),
    onSuccess: () => { invalidate(); setModal(false); setForm({ supplier: '', expectedDelivery: '', notes: '', items: [] }); },
    onError: (e: unknown) => setError(getMsg(e)),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/purchase-orders/${id}/cancel`),
    onSuccess: invalidate,
  });

  const receiveMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) => api.patch(`/purchase-orders/${id}/receive`, payload),
    onSuccess: () => { invalidate(); qc.invalidateQueries({ queryKey: ['raw-materials'] }); setReceiveModal(null); },
  });

  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { material: '', quantity: 0, unitPrice: 0, totalPrice: 0 }] }));
  const removeItem = (i: number) => setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateItem = (i: number, key: keyof POItemForm, val: string | number) => {
    setForm((f) => {
      const items = f.items.map((item, idx) => {
        if (idx !== i) return item;
        const updated = { ...item, [key]: val };
        if (key === 'quantity' || key === 'unitPrice') updated.totalPrice = updated.quantity * updated.unitPrice;
        return updated;
      });
      return { ...f, items };
    });
  };

  const total = form.items.reduce((s, i) => s + i.totalPrice, 0);
  const getSupplier = (o: PurchaseOrder) => typeof o.supplier === 'object' ? o.supplier as Supplier : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
        <button onClick={() => { setForm({ supplier: '', expectedDelivery: '', notes: '', items: [] }); setError(''); setModal(true); }} className="btn-primary">
          <Plus size={16} className="mr-1.5" />New PO
        </button>
      </div>

      <div className="card p-4">
        <div className="flex gap-2 flex-wrap">
          {['', 'draft', 'ordered', 'partial', 'received', 'cancelled'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {isLoading && <div className="card p-8 text-center text-gray-400">Loading…</div>}
        {!isLoading && orders.length === 0 && <div className="card p-8 text-center text-gray-400">No purchase orders</div>}
        {orders.map((o) => {
          const supplier = getSupplier(o);
          const isExp = expanded === o._id;
          const orderNumber = o.poNumber || o.orderNumber;
          return (
            <div key={o._id} className="card overflow-hidden">
              <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                onClick={() => setExpanded(isExp ? null : o._id)}>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-semibold">{orderNumber}</p>
                    <p className="text-xs text-gray-500">{supplier?.name ?? '-'} · {new Date(o.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className={STATUS_BADGE[o.status] ?? 'badge-gray'}>{o.status}</span>
                  <span className="font-semibold text-gray-700">₹{o.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {['pending', 'partial'].includes(o.status) && (
                    <button onClick={() => setReceiveModal(o)} className="btn btn-sm btn-success"><Truck size={13} className="mr-1" />Receive</button>
                  )}
                  {['pending'].includes(o.status) && (
                    <button onClick={() => { if (confirm('Cancel this PO?')) cancelMutation.mutate(o._id); }} className="btn btn-sm btn-danger"><XCircle size={13} /></button>
                  )}
                  {isExp ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>
              {isExp && (
                <div className="border-t border-gray-200 overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="table-th">Material</th>
                        <th className="table-th">Ordered Qty</th>
                        <th className="table-th">Received</th>
                        <th className="table-th">Unit Cost</th>
                        <th className="table-th">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {o.items.map((item, i) => {
                        const mat = typeof item.material === 'object' ? item.material as RawMaterial : null;
                        return (
                          <tr key={i}>
                            <td className="table-td">{mat?.materialName ?? '-'}</td>
                            <td className="table-td">{item.quantity} {mat?.unit}</td>
                            <td className="table-td">{item.receivedQuantity ?? 0}</td>
                            <td className="table-td">₹{item.unitPrice}</td>
                            <td className="table-td font-semibold">₹{item.totalPrice}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {o.notes && <p className="px-4 py-2 text-sm text-gray-500 bg-gray-50 border-t">Note: {o.notes}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create Modal */}
      <Modal isOpen={modal} onClose={() => setModal(false)} title="New Purchase Order" size="xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Supplier</label>
              <select className="input" value={form.supplier} onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))}>
                <option value="">Select Supplier</option>
                {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Expected Delivery</label>
              <input className="input" type="date" value={form.expectedDelivery} onChange={(e) => setForm((f) => ({ ...f, expectedDelivery: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Notes</label>
              <input className="input" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Items</h3>
              <button onClick={addItem} className="btn btn-sm btn-secondary"><Plus size={13} className="mr-1" />Add Item</button>
            </div>
            {form.items.map((item, i) => (
              <div key={i} className="grid grid-cols-5 gap-2 mb-2 items-end border rounded-lg p-3">
                <div className="col-span-2">
                  <label className="label">Material</label>
                  <select className="input" value={item.material} onChange={(e) => updateItem(i, 'material', e.target.value)}>
                    <option value="">Select</option>
                    {materials.map((m) => <option key={m._id} value={m._id}>{m.materialName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Qty</label>
                  <input className="input" type="number" step="0.01" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="label">Unit Price</label>
                  <input className="input" type="number" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(i, 'unitPrice', parseFloat(e.target.value) || 0)} />
                </div>
                <div className="flex items-end gap-1">
                  <div className="flex-1">
                    <label className="label">Total</label>
                    <input className="input bg-gray-50" readOnly value={item.totalPrice.toFixed(2)} />
                  </div>
                  <button onClick={() => removeItem(i)} className="btn btn-sm btn-danger mb-0.5">×</button>
                </div>
              </div>
            ))}
            {form.items.length > 0 && <p className="text-right font-semibold text-gray-800">Total: ₹{total.toFixed(2)}</p>}
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>
        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
          <button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending} className="btn-primary">
            {createMutation.isPending ? 'Creating…' : 'Create PO'}
          </button>
        </div>
      </Modal>

      {/* Receive Modal */}
      <Modal isOpen={!!receiveModal} onClose={() => setReceiveModal(null)} title="Receive Goods" size="lg">
        {receiveModal && (
          <ReceiveForm order={receiveModal} onConfirm={(payload) => receiveMutation.mutate({ id: receiveModal._id, payload })} onClose={() => setReceiveModal(null)} isPending={receiveMutation.isPending} />
        )}
      </Modal>
    </div>
  );
}

function ReceiveForm({ order, onConfirm, onClose, isPending }: { order: PurchaseOrder; onConfirm: (p: unknown) => void; onClose: () => void; isPending: boolean }) {
  const [items, setItems] = useState(
    order.items.map((item) => {
      const mat = typeof item.material === 'object' ? item.material as RawMaterial : null;
      return { materialId: mat?._id ?? '', receivedQuantity: item.quantity - (item.receivedQuantity ?? 0), unitCost: item.unitPrice, name: mat?.materialName ?? '' };
    })
  );

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="grid grid-cols-3 gap-3 items-end">
          <div className="col-span-1">
            <label className="label">Material</label>
            <input className="input bg-gray-50" readOnly value={item.name} />
          </div>
          <div>
            <label className="label">Qty to Receive</label>
            <input className="input" type="number" step="0.01" value={item.receivedQuantity}
              onChange={(e) => setItems((arr) => arr.map((a, idx) => idx === i ? { ...a, receivedQuantity: parseFloat(e.target.value) || 0 } : a))} />
          </div>
          <div>
            <label className="label">Unit Cost</label>
            <input className="input" type="number" step="0.01" value={item.unitCost}
              onChange={(e) => setItems((arr) => arr.map((a, idx) => idx === i ? { ...a, unitCost: parseFloat(e.target.value) || 0 } : a))} />
          </div>
        </div>
      ))}
      <div className="flex gap-2 mt-4 justify-end">
        <button onClick={onClose} className="btn-secondary">Cancel</button>
        <button onClick={() => onConfirm({ receivedItems: items })} disabled={isPending} className="btn-success">
          {isPending ? 'Processing…' : 'Confirm Receipt'}
        </button>
      </div>
    </div>
  );
}
