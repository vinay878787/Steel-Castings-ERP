import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IFinishedGoods extends Document {
  product: Types.ObjectId;
  availableQuantity: number;
  reservedQuantity: number;
  inventoryValue: number;
  lastProductionOrder?: Types.ObjectId;
}

const FinishedGoodsSchema = new Schema<IFinishedGoods>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, unique: true },
    availableQuantity: { type: Number, default: 0, min: 0 },
    reservedQuantity: { type: Number, default: 0, min: 0 },
    inventoryValue: { type: Number, default: 0, min: 0 },
    lastProductionOrder: { type: Schema.Types.ObjectId, ref: 'ProductionOrder' },
  },
  { timestamps: true }
);

export default mongoose.model<IFinishedGoods>('FinishedGoods', FinishedGoodsSchema);
