import mongoose, { Document, Schema } from 'mongoose';

export type FieldType = 'text' | 'number' | 'currency' | 'date' | 'boolean' | 'dropdown' | 'multiselect' | 'textarea';

export const CONFIGURABLE_ENTITIES = ['rawMaterial', 'product', 'supplier', 'customer'] as const;
export type ConfigurableEntity = typeof CONFIGURABLE_ENTITIES[number];

export interface IColumnConfig extends Document {
  entity: ConfigurableEntity;
  fieldName: string;
  fieldLabel: string;
  fieldType: FieldType;
  isRequired: boolean;
  isVisible: boolean;
  isEditable: boolean;
  options: string[];
  order: number;
}

const ColumnConfigSchema = new Schema<IColumnConfig>(
  {
    entity: { type: String, required: true, enum: CONFIGURABLE_ENTITIES },
    fieldName: { type: String, required: true, lowercase: true, trim: true },
    fieldLabel: { type: String, required: true, trim: true },
    fieldType: {
      type: String,
      required: true,
      enum: ['text', 'number', 'currency', 'date', 'boolean', 'dropdown', 'multiselect', 'textarea'],
    },
    isRequired: { type: Boolean, default: false },
    isVisible: { type: Boolean, default: true },
    isEditable: { type: Boolean, default: true },
    options: [{ type: String }],
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ColumnConfigSchema.index({ entity: 1, fieldName: 1 }, { unique: true });

export default mongoose.model<IColumnConfig>('ColumnConfig', ColumnConfigSchema);
