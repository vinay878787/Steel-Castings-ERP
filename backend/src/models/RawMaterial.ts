import mongoose, { Document, Schema } from 'mongoose';

export interface IRawMaterial extends Document {
  materialCode: string;
  materialName: string;
  category: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  averageCost: number;
  storageLocation: string;
  isActive: boolean;
  customFields?: Record<string, unknown>;
}

const RawMaterialSchema = new Schema<IRawMaterial>(
  {
    materialCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    materialName: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    unit: { type: String, required: true, trim: true },
    currentStock: { type: Number, default: 0, min: 0 },
    minimumStock: { type: Number, default: 0, min: 0 },
    averageCost: { type: Number, default: 0, min: 0 },
    storageLocation: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true },
    customFields: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

RawMaterialSchema.index({ materialName: 'text', category: 'text' });

export default mongoose.model<IRawMaterial>('RawMaterial', RawMaterialSchema);
