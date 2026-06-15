import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import api from '../lib/api';
import { CONFIGURABLE_ENTITIES, type ConfigurableEntity, type ColumnConfig, type FieldType } from '../types';
import Modal from '../components/Modal';
import { useColumnConfig } from '../hooks/useColumnConfig';

const ENTITY_LABELS: Record<ConfigurableEntity, string> = {
  rawMaterial: 'Raw Materials',
  product: 'Products',
  supplier: 'Suppliers',
  customer: 'Customers',
};

const FIELD_TYPES: FieldType[] = ['text', 'number', 'currency', 'date', 'boolean', 'dropdown', 'multiselect', 'textarea'];

const emptyForm = {
  fieldLabel: '',
  fieldName: '',
  fieldType: 'text' as FieldType,
  isRequired: false,
  isVisible: true,
  options: '',
};

const autoKey = (label: string) => label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

const getMsg = (e: unknown) =>
  e && typeof e === 'object' && 'response' in e
    ? (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Error'
    : 'Error';

export default function FieldConfig() {
  const qc = useQueryClient();
  const [entity, setEntity] = useState<ConfigurableEntity>('rawMaterial');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const { data: configs = [] } = useColumnConfig(entity);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['column-config', entity] });

  const createMutation = useMutation({
    mutationFn: (payload: { fieldLabel: string; fieldName: string; fieldType: FieldType; isRequired: boolean; isVisible: boolean; entity: ConfigurableEntity; options?: string[] }) =>
      api.post('/column-config', payload),
    onSuccess: () => { invalidate(); setModal(false); setForm(emptyForm); setError(''); },
    onError: (e: unknown) => setError(getMsg(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/column-config/${id}`),
    onSuccess: invalidate,
  });

  const toggleVisibility = (c: ColumnConfig) => {
    api.put(`/column-config/${c._id}`, { isVisible: !c.isVisible }).then(invalidate);
  };

  const handleCreate = () => {
    if (!form.fieldLabel.trim()) { setError('Field label is required'); return; }
    const fieldName = form.fieldName || autoKey(form.fieldLabel);
    if (!fieldName) { setError('Field key is required'); return; }

    const duplicate = configs.some((c) => c.fieldName === fieldName);
    if (duplicate) { setError(`A field with key "${fieldName}" already exists in this entity`); return; }

    const payload = {
      ...form,
      fieldName,
      entity,
      options: (form.fieldType === 'dropdown' || form.fieldType === 'multiselect')
        ? form.options.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined,
    };
    createMutation.mutate(payload);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Field Configuration</h1>
          <p className="text-sm text-gray-500 mt-1">Add custom fields to any entity — they appear in forms and tables automatically</p>
        </div>
        <button onClick={() => { setModal(true); setError(''); setForm(emptyForm); }} className="btn-primary">
          <Plus size={16} className="mr-1.5" />Add Field
        </button>
      </div>

      {/* Entity tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {CONFIGURABLE_ENTITIES.map((e) => (
          <button
            key={e}
            onClick={() => setEntity(e)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              entity === e
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {ENTITY_LABELS[e]}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-600">
            Custom fields for <strong>{ENTITY_LABELS[entity]}</strong> — these appear below the core fields in every form
          </p>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="table-th">Field Label</th>
              <th className="table-th">Field Key</th>
              <th className="table-th">Type</th>
              <th className="table-th">Required</th>
              <th className="table-th">Visible</th>
              <th className="table-th">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {configs.length === 0 && (
              <tr>
                <td colSpan={6} className="table-td text-center text-gray-400 py-8">
                  No custom fields added yet for {ENTITY_LABELS[entity]}
                </td>
              </tr>
            )}
            {configs.map((c) => (
              <tr key={c._id} className="hover:bg-gray-50">
                <td className="table-td font-medium">{c.fieldLabel}</td>
                <td className="table-td font-mono text-xs text-gray-500">{c.fieldName}</td>
                <td className="table-td"><span className="badge-blue">{c.fieldType}</span></td>
                <td className="table-td">
                  {c.isRequired ? <span className="text-red-600 font-medium">Yes</span> : <span className="text-gray-400">No</span>}
                </td>
                <td className="table-td">
                  <button
                    onClick={() => toggleVisibility(c)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${c.isVisible ? 'bg-blue-600' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${c.isVisible ? 'translate-x-4' : 'translate-x-1'}`} />
                  </button>
                </td>
                <td className="table-td">
                  <button
                    onClick={() => { if (confirm('Delete this field? Existing data stored under this key will become inaccessible.')) deleteMutation.mutate(c._id); }}
                    className="btn btn-sm btn-danger"
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title={`Add Field — ${ENTITY_LABELS[entity]}`}>
        <div className="space-y-3">
          <div>
            <label className="label">Field Label</label>
            <input
              className="input"
              value={form.fieldLabel}
              onChange={(e) => {
                const label = e.target.value;
                setForm((f) => ({ ...f, fieldLabel: label, fieldName: f.fieldName || autoKey(label) }));
              }}
              placeholder="e.g. GST Number"
            />
          </div>
          <div>
            <label className="label">Field Key <span className="text-gray-400 font-normal">(auto-generated, must be unique)</span></label>
            <input
              className="input font-mono text-sm"
              value={form.fieldName}
              onChange={(e) => setForm((f) => ({ ...f, fieldName: autoKey(e.target.value) }))}
              placeholder="e.g. gst_number"
            />
          </div>
          <div>
            <label className="label">Field Type</label>
            <select className="input" value={form.fieldType}
              onChange={(e) => setForm((f) => ({ ...f, fieldType: e.target.value as FieldType, options: '' }))}>
              {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {(form.fieldType === 'dropdown' || form.fieldType === 'multiselect') && (
            <div>
              <label className="label">Options <span className="text-gray-400 font-normal">(comma-separated)</span></label>
              <input className="input" value={form.options}
                onChange={(e) => setForm((f) => ({ ...f, options: e.target.value }))}
                placeholder="Option A, Option B, Option C" />
            </div>
          )}
          <div className="flex gap-4 pt-1">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.isRequired}
                onChange={(e) => setForm((f) => ({ ...f, isRequired: e.target.checked }))} />
              Required
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.isVisible}
                onChange={(e) => setForm((f) => ({ ...f, isVisible: e.target.checked }))} />
              Visible
            </label>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>
        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleCreate} disabled={createMutation.isPending} className="btn-primary">
            {createMutation.isPending ? 'Adding…' : 'Add Field'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
