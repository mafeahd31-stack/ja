import mongoose, { Schema, Document } from 'mongoose';

export type CommissionType = 'percentage' | 'fixed';

export interface IDeliveryRule extends Document {
  name: string;
  nameAr: string;
  minDistanceKm: number;
  maxDistanceKm: number;
  commissionType: CommissionType;
  commissionValue: number;
  restaurantCommission: number;
  captainCommission: number;
  isActive: boolean;
  priority: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const deliveryRuleSchema = new Schema<IDeliveryRule>(
  {
    name: { type: String, required: true },
    nameAr: { type: String, required: true },
    minDistanceKm: { type: Number, required: true },
    maxDistanceKm: { type: Number, required: true },
    commissionType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage',
    },
    commissionValue: { type: Number, required: true },
    restaurantCommission: { type: Number, default: 0 },
    captainCommission: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    priority: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

deliveryRuleSchema.index({ isActive: 1, priority: -1 });

export const DeliveryRule = mongoose.model<IDeliveryRule>('DeliveryRule', deliveryRuleSchema);
