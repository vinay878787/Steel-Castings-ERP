import mongoose, { Document, Schema, Types } from 'mongoose';

export type TransactionType = 'purchase' | 'consumption' | 'production' | 'adjustment' | 'transfer' | 'return';

export interface IInventoryLedger extends Document {
  material: Types.ObjectId;
  transactionType: TransactionType;
  referenceNumber: string;
  quantity: number;
  beforeQuantity: number;
  afterQuantity: number;
  unitCost: number;
  user: Types.ObjectId;
  notes: string;
  productionOrder?: Types.ObjectId;
  purchaseOrder?: Types.ObjectId;
}

const InventoryLedgerSchema = new Schema<IInventoryLedger>(
  {
    material: { type: Schema.Types.ObjectId, ref: 'RawMaterial', required: true },
    transactionType: {
      type: String,
      enum: ['purchase', 'consumption', 'production', 'adjustment', 'transfer', 'return'],
      required: true,
    },
    referenceNumber: { type: String, required: true },
    quantity: { type: Number, required: true },
    beforeQuantity: { type: Number, required: true },
    afterQuantity: { type: Number, required: true },
    unitCost: { type: Number, default: 0 },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String, default: '' },
    productionOrder: { type: Schema.Types.ObjectId, ref: 'ProductionOrder' },
    purchaseOrder: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder' },
  },
  { timestamps: true }
);

export default mongoose.model<IInventoryLedger>('InventoryLedger', InventoryLedgerSchema);
