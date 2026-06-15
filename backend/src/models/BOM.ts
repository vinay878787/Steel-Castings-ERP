import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IBOMItem {
  material: Types.ObjectId;
  quantityRequired: number;
  unit: string;
  dynamicFields: Record<string, unknown>;
}

export interface IBOM extends Document {
  product: Types.ObjectId;
  version: number;
  outputQuantity: number;
  isActive: boolean;
  items: IBOMItem[];
  createdBy: Types.ObjectId;
  notes: string;
}

const BOMItemSchema = new Schema<IBOMItem>(
  {
    material: { type: Schema.Types.ObjectId, ref: 'RawMaterial', required: true },
    quantityRequired: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true },
    dynamicFields: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const BOMSchema = new Schema<IBOM>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    version: { type: Number, default: 1 },
    outputQuantity: { type: Number, required: true, min: 1 },
    isActive: { type: Boolean, default: true },
    items: [BOMItemSchema],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model<IBOM>('BOM', BOMSchema);
