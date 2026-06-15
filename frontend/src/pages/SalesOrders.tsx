import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../lib/api';
import { SalesOrder, Customer, Product } from '../types';
import Modal from '../components/Modal';

const STATUS_BADGE: Record<string, string> = {
  pending: 'badge-yellow',
  confirmed: 'badge-blue',
  in_production: 'badge-blue',
  completed: 'badge-green',
  cancelled: 'badge-red',
};

const STATUSES = ['pending', 'confirmed', 'in_production', 'completed', 'cancelled'];

interface SOItemForm { product: string; quantity: number; unitPrice: number; totalPrice: number; }

export default function SalesOrders() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ customer: '', dueDate: '', notes: '', items: [] as SOItemForm[] });
  const [error, setError] = useState('');

  const { data: orders = [], isLoading } = useQuery<SalesOrder[]>({
    queryKey: ['sales-orders', statusFilter],
    queryFn: () => api.get('/sales-orders', { params: statusFilter ? { status: statusFilter } : {} }).then((r) => r.data),
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers').then((r) => r.data),
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => api.get('/products').then((r) => r.data),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['sales-orders'] });
  const getMsg = (e: unknown) =>
    (e && typeof e === 'object' && 'response' in e) ? (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Error' : 'Error';

  const createMutation = useMutation({
    mutationFn: (d: typeof form) => api.post('/sales-orders', d),
    onSuccess: () => { invalidate(); setModal(false); setForm({ customer: '', dueDate: '', notes: '', items: [] }); },
    onError: (e: unknown) => setError(getMsg(e)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/sales-orders/${id}/status`, { status }),
    onSuccess: invalidate,
  });

  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { product: '', quantity: 0, unitPrice: 0, totalPrice: 0 }] }));
  const removeItem = (i: number) => setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateItem = (i: number, key: keyof SOItemForm, val: string | number) => {
    setForm((f) => {
      const items = f.items.map((item, idx) => {
        if (idx !== i) return item;
        const updated = { ...item, [key]: val };
        if (key === 'quantity' || key === 'unitPrice') updated.totalPrice = updated.quantity * updated.unitPrice;
        if (key === 'product') {
          const p = products.find((pr) => pr._id === val);
          if (p) updated.unitPrice = p.sellingPrice;
          updated.totalPrice = updated.quantity * updated.unitPrice;
        }
        return updated;
      });
      return { ...f, items };
    });
  };

  const total = form.items.reduce((s, i) => s + i.totalPrice, 0);
  const getCustomer = (o: SalesOrder) => typeof o.customer === 'object' ? o.customer as Customer : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Sales Orders</h1>
        <button onClick={() => { setForm({ customer: '', dueDate: '', notes: '', items: [] }); setError(''); setModal(true); }} className="btn-primary">
          <Plus size={16} className="mr-1.5" />New Order
        </button>
      </div>

      <div className="card p-4">
        <div className="flex gap-2 flex-wrap">
          {(['', ...STATUSES] as string[]).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}>
              {s ? s.replace('_', ' ') : 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {isLoading && <div className="card p-8 text-center text-gray-400">Loading…</div>}
        {!isLoading && orders.length === 0 && <div className="card p-8 text-center text-gray-400">No sales orders</div>}
        {orders.map((o) => {
          const customer = getCustomer(o);
          const isExp = expanded === o._id;
          const orderNumber = (o as SalesOrder & { soNumber?: string }).soNumber || o.orderNumber;
          return (
            <div key={o._id} className="card overflow-hidden">
              <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                onClick={() => setExpanded(isExp ? null : o._id)}>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-semibold">{orderNumber}</p>
                    <p className="text-xs text-gray-500">{customer?.name ?? '-'} · Due: {o.dueDate ? new Date(o.dueDate).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <span className={STATUS_BADGE[o.status] ?? 'badge-gray'}>{o.status.replace('_', ' ')}</span>
                  <span className="font-semibold text-gray-700">₹{o.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <select className="input w-40 text-xs" value={o.status}
                    onChange={(e) => statusMutation.mutate({ id: o._id, status: e.target.value })}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                  {isExp ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>
              {isExp && (
                <div className="border-t border-gray-200 overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="table-th">Product</th>
                        <th className="table-th">Quantity</th>
                        <th className="table-th">Unit Price</th>
                        <th className="table-th">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {o.items.map((item, i) => {
                        const prod = typeof item.product === 'object' ? item.product as Product : null;
                        return (
                          <tr key={i}>
                            <td className="table-td">{prod?.productName ?? '-'}</td>
                            <td className="table-td">{item.quantity} {prod?.unit}</td>
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

      <Modal isOpen={modal} onClose={() => setModal(false)} title="New Sales Order" size="xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Customer</label>
              <select className="input" value={form.customer} onChange={(e) => setForm((f) => ({ ...f, customer: e.target.value }))}>
                <option value="">Select Customer</option>
                {customers.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Due Date</label>
              <input className="input" type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
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
                  <label className="label">Product</label>
                  <select className="input" value={item.product} onChange={(e) => updateItem(i, 'product', e.target.value)}>
                    <option value="">Select</option>
                    {products.map((p) => <option key={p._id} value={p._id}>{p.productName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Qty</label>
                  <input className="input" type="number" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)} />
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
            {createMutation.isPending ? 'Creating…' : 'Create Order'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
