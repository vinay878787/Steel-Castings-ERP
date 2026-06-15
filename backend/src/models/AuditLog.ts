import mongoose, { Document, Schema, Types } from 'mongoose';

export type AuditAction = 'create' | 'update' | 'delete';

export interface IAuditLog extends Document {
  action: AuditAction;
  entity: string;
  entityId: Types.ObjectId;
  user: Types.ObjectId;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, enum: ['create', 'update', 'delete'], required: true },
    entity: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
