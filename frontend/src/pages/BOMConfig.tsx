import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import api from '../lib/api';
import { BOMColumnConfig } from '../types';
import Modal from '../components/Modal';

const FIELD_TYPES = ['text', 'number', 'currency', 'date', 'boolean', 'dropdown', 'multiselect', 'textarea', 'attachment'];

const emptyForm = { fieldLabel: '', fieldName: '', fieldType: 'text' as BOMColumnConfig['fieldType'], isRequired: false, isVisible: true, options: '' };

export default function BOMConfig() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const { data: configs = [] } = useQuery<BOMColumnConfig[]>({
    queryKey: ['bom-config'],
    queryFn: () => api.get('/bom-config').then((r) => r.data),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['bom-config'] });

  const getMsg = (e: unknown) =>
    (e && typeof e === 'object' && 'response' in e) ? (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Error' : 'Error';

  const createMutation = useMutation({
    mutationFn: (d: Omit<typeof emptyForm, 'options'> & { options?: string[] }) => api.post('/bom-config', d),
    onSuccess: () => { invalidate(); setModal(false); setForm(emptyForm); setError(''); },
    onError: (e: unknown) => setError(getMsg(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/bom-config/${id}`),
    onSuccess: invalidate,
  });

  const toggleVisibility = (config: BOMColumnConfig) => {
    api.put(`/bom-config/${config._id}`, { isVisible: !config.isVisible }).then(invalidate);
  };

  const handleCreate = () => {
    if (!form.fieldLabel.trim() || !form.fieldName.trim()) { setError('Field label and key are required'); return; }
    const payload = {
      fieldLabel: form.fieldLabel,
      fieldName: form.fieldName.replace(/\s+/g, '_').toLowerCase(),
      fieldType: form.fieldType,
      isRequired: form.isRequired,
      isVisible: form.isVisible,
      options: form.options ? form.options.split(',').map((s) => s.trim()) : undefined,
    };
    createMutation.mutate(payload);
  };

  const autoKey = (label: string) => label.replace(/\s+/g, '_').toLowerCase();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">BOM Column Configuration</h1>
          <p className="text-sm text-gray-500 mt-1">Add custom columns to the Bill of Materials without developer involvement</p>
        </div>
        <button onClick={() => { setModal(true); setError(''); }} className="btn-primary">
          <Plus size={16} className="mr-1.5" />Add Column
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-600">Default columns: <strong>Material</strong>, <strong>Quantity Required</strong>, <strong>Unit</strong> (always present)</p>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="table-th">Field Name</th>
              <th className="table-th">Field Key</th>
              <th className="table-th">Type</th>
              <th className="table-th">Required</th>
              <th className="table-th">Visible</th>
              <th className="table-th">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {configs.length === 0 && (
              <tr><td colSpan={6} className="table-td text-center text-gray-400 py-8">No custom columns added yet</td></tr>
            )}
            {configs.map((c) => (
              <tr key={c._id} className="hover:bg-gray-50">
                <td className="table-td font-medium">{c.fieldLabel}</td>
                <td className="table-td font-mono text-xs text-gray-500">{c.fieldName}</td>
                <td className="table-td"><span className="badge-blue">{c.fieldType}</span></td>
                <td className="table-td">{c.isRequired ? <span className="text-red-600 font-medium">Yes</span> : <span className="text-gray-400">No</span>}</td>
                <td className="table-td">
                  <button onClick={() => toggleVisibility(c)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${c.isVisible ? 'bg-blue-600' : 'bg-gray-300'}`}>
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${c.isVisible ? 'translate-x-4' : 'translate-x-1'}`} />
                  </button>
                </td>
                <td className="table-td">
                  <button onClick={() => { if (confirm('Delete this column?')) deleteMutation.mutate(c._id); }} className="btn btn-sm btn-danger">
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title="Add BOM Column">
        <div className="space-y-3">
          <div>
            <label className="label">Field Label</label>
            <input className="input" value={form.fieldLabel} onChange={(e) => {
              const label = e.target.value;
              setForm((f) => ({ ...f, fieldLabel: label, fieldName: f.fieldName || autoKey(label) }));
            }} placeholder="e.g. Heat Number" />
          </div>
          <div>
            <label className="label">Field Key (auto-generated)</label>
            <input className="input font-mono text-sm" value={form.fieldName}
              onChange={(e) => setForm((f) => ({ ...f, fieldName: e.target.value }))} placeholder="e.g. heat_number" />
          </div>
          <div>
            <label className="label">Field Type</label>
            <select className="input" value={form.fieldType} onChange={(e) => setForm((f) => ({ ...f, fieldType: e.target.value as BOMColumnConfig['fieldType'] }))}>
              {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {(form.fieldType === 'dropdown' || form.fieldType === 'multiselect') && (
            <div>
              <label className="label">Options (comma-separated)</label>
              <input className="input" value={form.options} onChange={(e) => setForm((f) => ({ ...f, options: e.target.value }))} placeholder="Option A, Option B, Option C" />
            </div>
          )}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.isRequired} onChange={(e) => setForm((f) => ({ ...f, isRequired: e.target.checked }))} />
              Required
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.isVisible} onChange={(e) => setForm((f) => ({ ...f, isVisible: e.target.checked }))} />
              Visible
            </label>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>
        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleCreate} disabled={createMutation.isPending} className="btn-primary">
            {createMutation.isPending ? 'Adding…' : 'Add Column'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
