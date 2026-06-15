import mongoose, { Document, Schema, Types } from 'mongoose';

export type ProductionStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

export interface IProductionOrder extends Document {
  productionNumber: string;
  product: Types.ObjectId;
  bom: Types.ObjectId;
  bomVersion: number;
  quantityToProduce: number;
  status: ProductionStatus;
  startedAt?: Date;
  completedAt?: Date;
  createdBy: Types.ObjectId;
  notes: string;
}

const ProductionOrderSchema = new Schema<IProductionOrder>(
  {
    productionNumber: { type: String, required: true, unique: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    bom: { type: Schema.Types.ObjectId, ref: 'BOM', required: true },
    bomVersion: { type: Number, required: true },
    quantityToProduce: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ['planned', 'in_progress', 'completed', 'cancelled'],
      default: 'planned',
    },
    startedAt: { type: Date },
    completedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model<IProductionOrder>('ProductionOrder', ProductionOrderSchema);
