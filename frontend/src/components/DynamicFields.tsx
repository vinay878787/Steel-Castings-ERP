import type { ColumnConfig, FieldType } from '../types';

interface Props {
  configs: ColumnConfig[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}

export default function DynamicFields({ configs, values, onChange }: Props) {
  const visible = configs.filter((c) => c.isVisible);
  if (visible.length === 0) return null;

  return (
    <>
      <div className="col-span-2 border-t border-gray-200 pt-3 mt-1">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Custom Fields</p>
      </div>
      {visible.map((c) => (
        <div key={c._id} className={c.fieldType === 'textarea' ? 'col-span-2' : ''}>
          <label className="label">
            {c.fieldLabel}
            {c.isRequired && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          <FieldInput type={c.fieldType} value={values[c.fieldName]} options={c.options}
            onChange={(v) => onChange(c.fieldName, v)} />
        </div>
      ))}
    </>
  );
}

function FieldInput({
  type, value, options, onChange,
}: {
  type: FieldType;
  value: unknown;
  options?: string[];
  onChange: (v: unknown) => void;
}) {
  switch (type) {
    case 'number':
    case 'currency':
      return (
        <input className="input" type="number" step="0.01"
          value={(value as number) ?? ''}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)} />
      );
    case 'date':
      return (
        <input className="input" type="date"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)} />
      );
    case 'boolean':
      return (
        <select className="input" value={String(value ?? false)}
          onChange={(e) => onChange(e.target.value === 'true')}>
          <option value="false">No</option>
          <option value="true">Yes</option>
        </select>
      );
    case 'dropdown':
      return (
        <select className="input" value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}>
          <option value="">Select…</option>
          {options?.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    case 'multiselect': {
      const sel = Array.isArray(value) ? (value as string[]) : [];
      return (
        <select className="input" multiple size={Math.min(4, options?.length ?? 3)}
          value={sel}
          onChange={(e) => onChange(Array.from(e.target.selectedOptions, (o) => o.value))}>
          {options?.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    case 'textarea':
      return (
        <textarea className="input" rows={2}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)} />
      );
    default:
      return (
        <input className="input" type="text"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)} />
      );
  }
}

export function displayCustomField(value: unknown, type: FieldType): string {
  if (value === undefined || value === null || value === '') return '—';
  if (type === 'boolean') return value ? 'Yes' : 'No';
  if (type === 'multiselect' && Array.isArray(value)) return value.join(', ');
  if (type === 'currency') return `₹${Number(value).toFixed(2)}`;
  return String(value);
}
