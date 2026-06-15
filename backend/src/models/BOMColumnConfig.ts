import mongoose, { Document, Schema } from 'mongoose';

export type FieldType =
  | 'text'
  | 'number'
  | 'currency'
  | 'date'
  | 'boolean'
  | 'dropdown'
  | 'multiselect'
  | 'textarea'
  | 'attachment';

export interface IBOMColumnConfig extends Document {
  fieldName: string;
  fieldLabel: string;
  fieldType: FieldType;
  isRequired: boolean;
  isUnique: boolean;
  isSearchable: boolean;
  isFilterable: boolean;
  isVisible: boolean;
  isEditable: boolean;
  options: string[];
  order: number;
}

const BOMColumnConfigSchema = new Schema<IBOMColumnConfig>(
  {
    fieldName: { type: String, required: true, unique: true, lowercase: true, trim: true },
    fieldLabel: { type: String, required: true, trim: true },
    fieldType: {
      type: String,
      required: true,
      enum: ['text', 'number', 'currency', 'date', 'boolean', 'dropdown', 'multiselect', 'textarea', 'attachment'],
    },
    isRequired: { type: Boolean, default: false },
    isUnique: { type: Boolean, default: false },
    isSearchable: { type: Boolean, default: false },
    isFilterable: { type: Boolean, default: false },
    isVisible: { type: Boolean, default: true },
    isEditable: { type: Boolean, default: true },
    options: [{ type: String }],
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<IBOMColumnConfig>('BOMColumnConfig', BOMColumnConfigSchema);
