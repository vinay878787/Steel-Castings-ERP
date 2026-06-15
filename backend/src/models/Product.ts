import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
  productCode: string;
  productName: string;
  description: string;
  unit: string;
  standardCost: number;
  sellingPrice: number;
  isActive: boolean;
  customFields?: Record<string, unknown>;
}

const ProductSchema = new Schema<IProduct>(
  {
    productCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    productName: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    unit: { type: String, required: true, trim: true },
    standardCost: { type: Number, default: 0, min: 0 },
    sellingPrice: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
    customFields: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

ProductSchema.index({ productName: 'text' });

export default mongoose.model<IProduct>('Product', ProductSchema);
