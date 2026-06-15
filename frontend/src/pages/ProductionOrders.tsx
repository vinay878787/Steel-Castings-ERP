import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Play, Pause, CheckCircle, XCircle } from 'lucide-react';
import api from '../lib/api';
import { ProductionOrder, Product, BOM } from '../types';
import Modal from '../components/Modal';
import { useAuthStore } from '../store/authStore';

const STATUS_BADGE: Record<string, string> = {
  planned: 'badge-yellow',
  in_progress: 'badge-blue',
  completed: 'badge-green',
  cancelled: 'badge-red',
};

const emptyForm = { product: '', bom: '', quantityToProduce: 1 };

export default function ProductionOrders() {
  const qc = useQueryClient();
  const { hasRole } = useAuthStore();
  const canCreate = hasRole('admin', 'manager');
  const canOperate = hasRole('admin', 'manager', 'operator');

  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [completeResult, setCompleteResult] = useState<{ order: ProductionOrder; consumed: unknown[] } | null>(null);

  const { data: orders = [], isLoading } = useQuery<ProductionOrder[]>({
    queryKey: ['production-orders', statusFilter],
    queryFn: () => api.get('/production-orders', { params: statusFilter ? { status: statusFilter } : {} }).then((r) => r.data),
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => api.get('/products').then((r) => r.data),
  });

  const { data: bomsForProduct = [] } = useQuery<BOM[]>({
    queryKey: ['boms', form.product],
    queryFn: () => api.get('/bom', { params: { product: form.product } }).then((r) => r.data),
    enabled: !!form.product,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['production-orders'] });

  const getMsg = (e: unknown) =>
    (e && typeof e === 'object' && 'response' in e) ? (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Error' : 'Error';

  const createMutation = useMutation({
    mutationFn: (d: typeof emptyForm) => api.post('/production-orders', d),
    onSuccess: () => { invalidate(); setModal(false); setForm(emptyForm); },
    onError: (e: unknown) => setError(getMsg(e)),
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) => api.patch(`/production-orders/${id}/${action}`),
    onSuccess: (res, { action }) => {
      invalidate();
      qc.invalidateQueries({ queryKey: ['raw-materials'] });
      qc.invalidateQueries({ queryKey: ['finished-goods'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      if (action === 'complete') setCompleteResult(res.data);
    },
    onError: (e: unknown) => alert(getMsg(e)),
  });

  const getProduct = (o: ProductionOrder) => typeof o.product === 'object' ? o.product as Product : null;
  const getBOM = (o: ProductionOrder) => typeof o.bom === 'object' ? o.bom as BOM : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Production Orders</h1>
        {canCreate && (
          <button onClick={() => { setForm(emptyForm); setError(''); setModal(true); }} className="btn-primary">
            <Plus size={16} className="mr-1.5" />New Order
          </button>
        )}
      </div>

      <div className="card p-4">
        <div className="flex gap-2 flex-wrap">
          {['', 'planned', 'in_progress', 'completed', 'cancelled'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}>
              {s ? s.replace('_', ' ') : 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="table-th">Order #</th>
              <th className="table-th">Product</th>
              <th className="table-th">BOM Ver</th>
              <th className="table-th">Qty</th>
              <th className="table-th">Status</th>
              <th className="table-th">Started</th>
              <th className="table-th">Completed</th>
              <th className="table-th">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && <tr><td colSpan={8} className="table-td text-center text-gray-400">Loading…</td></tr>}
            {!isLoading && orders.length === 0 && <tr><td colSpan={8} className="table-td text-center text-gray-400 py-8">No orders found</td></tr>}
            {orders.map((o) => {
              const product = getProduct(o);
              const bom = getBOM(o);
              return (
                <tr key={o._id} className="hover:bg-gray-50">
                  <td className="table-td font-mono text-xs font-semibold">{o.productionNumber}</td>
                  <td className="table-td font-medium">{product?.productName ?? '-'}</td>
                  <td className="table-td text-center">{bom ? `v${bom.version}` : '-'}</td>
                  <td className="table-td font-semibold">{o.quantityToProduce} {product?.unit}</td>
                  <td className="table-td">
                    <span className={STATUS_BADGE[o.status] ?? 'badge-gray'}>{o.status.replace('_', ' ')}</span>
                  </td>
                  <td className="table-td text-xs text-gray-500">{o.startedAt ? new Date(o.startedAt).toLocaleDateString() : '-'}</td>
                  <td className="table-td text-xs text-gray-500">{o.completedAt ? new Date(o.completedAt).toLocaleDateString() : '-'}</td>
                  <td className="table-td">
                    {canOperate && (
                      <div className="flex gap-1">
                        {o.status === 'planned' && (
                          <button onClick={() => actionMutation.mutate({ id: o._id, action: 'start' })}
                            className="btn btn-sm btn-success" title="Start"><Play size={13} /></button>
                        )}
                        {o.status === 'in_progress' && (
                          <>
                            <button onClick={() => actionMutation.mutate({ id: o._id, action: 'pause' })}
                              className="btn btn-sm btn-secondary" title="Pause"><Pause size={13} /></button>
                            <button onClick={() => { if (confirm('Complete this order? Materials will be automatically consumed.')) actionMutation.mutate({ id: o._id, action: 'complete' }); }}
                              className="btn btn-sm btn-primary" title="Complete"><CheckCircle size={13} /></button>
                          </>
                        )}
                        {o.status === 'planned' && canCreate && (
                          <button onClick={() => { if (confirm('Complete this order?')) actionMutation.mutate({ id: o._id, action: 'complete' }); }}
                            className="btn btn-sm btn-primary" title="Complete"><CheckCircle size={13} /></button>
                        )}
                        {['planned', 'in_progress'].includes(o.status) && canCreate && (
                          <button onClick={() => { if (confirm('Cancel this order?')) actionMutation.mutate({ id: o._id, action: 'cancel' }); }}
                            className="btn btn-sm btn-danger" title="Cancel"><XCircle size={13} /></button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      <Modal isOpen={modal} onClose={() => setModal(false)} title="New Production Order">
        <div className="space-y-4">
          <div>
            <label className="label">Product</label>
            <select className="input" value={form.product} onChange={(e) => setForm((f) => ({ ...f, product: e.target.value, bom: '' }))}>
              <option value="">Select Product</option>
              {products.map((p) => <option key={p._id} value={p._id}>{p.productName} ({p.productCode})</option>)}
            </select>
          </div>
          <div>
            <label className="label">BOM Version</label>
            <select className="input" value={form.bom} onChange={(e) => setForm((f) => ({ ...f, bom: e.target.value }))} disabled={!form.product}>
              <option value="">Select BOM</option>
              {bomsForProduct.map((b) => <option key={b._id} value={b._id}>v{b.version} — Output: {b.outputQuantity}</option>)}
            </select>
            {form.product && bomsForProduct.length === 0 && <p className="text-amber-600 text-xs mt-1">No BOM found for this product. Create one first.</p>}
          </div>
          <div>
            <label className="label">Quantity to Produce</label>
            <input className="input" type="number" min="1" value={form.quantityToProduce}
              onChange={(e) => setForm((f) => ({ ...f, quantityToProduce: parseInt(e.target.value) || 1 }))} />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>
        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
          <button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.product || !form.bom} className="btn-primary">
            {createMutation.isPending ? 'Creating…' : 'Create Order'}
          </button>
        </div>
      </Modal>

      {/* Completion Result Modal */}
      <Modal isOpen={!!completeResult} onClose={() => setCompleteResult(null)} title="Production Completed!" size="lg">
        {completeResult && (
          <div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-green-700 font-medium">Order {completeResult.order.productionNumber} completed successfully!</p>
              <p className="text-green-600 text-sm mt-1">Materials automatically consumed and finished goods inventory updated.</p>
            </div>
            <h4 className="font-medium text-gray-800 mb-2">Materials Consumed:</h4>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-th">Material</th>
                  <th className="table-th">Consumed</th>
                  <th className="table-th">Unit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(completeResult.consumed as Array<{ materialName: string; quantity: number; unit: string }>).map((c, i) => (
                  <tr key={i}>
                    <td className="table-td">{c.materialName}</td>
                    <td className="table-td font-semibold text-red-600">{c.quantity}</td>
                    <td className="table-td">{c.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => setCompleteResult(null)} className="btn-primary mt-4 w-full">Close</button>
          </div>
        )}
      </Modal>
    </div>
  );
}
