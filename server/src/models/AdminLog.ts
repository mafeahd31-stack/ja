import mongoose, { Schema, Document } from 'mongoose';

export type AdminActionType =
  | 'ban_restaurant'
  | 'unban_restaurant'
  | 'ban_captain'
  | 'unban_captain'
  | 'ban_user'
  | 'unban_user'
  | 'create_delivery_rule'
  | 'update_delivery_rule'
  | 'delete_delivery_rule'
  | 'update_commission'
  | 'system_settings';

export interface IAdminLog extends Document {
  adminId: mongoose.Types.ObjectId;
  action: AdminActionType;
  targetType: 'restaurant' | 'captain' | 'user' | 'delivery_rule' | 'system';
  targetId?: mongoose.Types.ObjectId;
  details: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const adminLogSchema = new Schema<IAdminLog>(
  {
    adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: {
      type: String,
      enum: [
        'ban_restaurant',
        'unban_restaurant',
        'ban_captain',
        'unban_captain',
        'ban_user',
        'unban_user',
        'create_delivery_rule',
        'update_delivery_rule',
        'delete_delivery_rule',
        'update_commission',
        'system_settings',
      ],
      required: true,
    },
    targetType: {
      type: String,
      enum: ['restaurant', 'captain', 'user', 'delivery_rule', 'system'],
      required: true,
    },
    targetId: { type: Schema.Types.ObjectId },
    details: { type: String, default: '' },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

adminLogSchema.index({ adminId: 1, createdAt: -1 });
adminLogSchema.index({ targetType: 1, targetId: 1 });

export const AdminLog = mongoose.model<IAdminLog>('AdminLog', adminLogSchema);
