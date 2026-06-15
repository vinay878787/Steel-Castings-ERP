import mongoose, { Document, Schema } from 'mongoose';

export interface ICustomer extends Document {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  isActive: boolean;
  customFields?: Record<string, unknown>;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true },
    customFields: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model<ICustomer>('Customer', CustomerSchema);
