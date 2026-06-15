import mongoose, { Document, Schema, Types } from 'mongoose';

export type SOStatus = 'pending' | 'in_production' | 'completed' | 'cancelled';

export interface ISOItem {
  product: Types.ObjectId;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ISalesOrder extends Document {
  soNumber: string;
  customer: Types.ObjectId;
  items: ISOItem[];
  status: SOStatus;
  totalAmount: number;
  dueDate?: Date;
  createdBy: Types.ObjectId;
  notes: string;
}

const SOItemSchema = new Schema<ISOItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const SalesOrderSchema = new Schema<ISalesOrder>(
  {
    soNumber: { type: String, required: true, unique: true },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    items: [SOItemSchema],
    status: { type: String, enum: ['pending', 'in_production', 'completed', 'cancelled'], default: 'pending' },
    totalAmount: { type: Number, default: 0 },
    dueDate: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model<ISalesOrder>('SalesOrder', SalesOrderSchema);
