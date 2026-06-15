import mongoose, { Document, Schema, Types } from 'mongoose';

export type POStatus = 'pending' | 'partial' | 'received' | 'cancelled';

export interface IPOItem {
  material: Types.ObjectId;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  receivedQuantity: number;
}

export interface IPurchaseOrder extends Document {
  poNumber: string;
  supplier: Types.ObjectId;
  items: IPOItem[];
  status: POStatus;
  totalAmount: number;
  orderDate: Date;
  expectedDate?: Date;
  receivedDate?: Date;
  createdBy: Types.ObjectId;
  notes: string;
}

const POItemSchema = new Schema<IPOItem>(
  {
    material: { type: Schema.Types.ObjectId, ref: 'RawMaterial', required: true },
    quantity: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
    receivedQuantity: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const PurchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    poNumber: { type: String, required: true, unique: true },
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    items: [POItemSchema],
    status: { type: String, enum: ['pending', 'partial', 'received', 'cancelled'], default: 'pending' },
    totalAmount: { type: Number, default: 0 },
    orderDate: { type: Date, default: Date.now },
    expectedDate: { type: Date },
    receivedDate: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model<IPurchaseOrder>('PurchaseOrder', PurchaseOrderSchema);
