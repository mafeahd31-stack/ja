import mongoose, { Schema, Document } from 'mongoose';

export interface ICoupon extends Document {
  code: string;
  description: string;
  descriptionAr: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrder: number;
  maxDiscount?: number;
  maxUses: number;
  usedCount: number;
  usedBy: mongoose.Types.ObjectId[];
  restaurantId?: mongoose.Types.ObjectId;
  isActive: boolean;
  expiresAt: Date;
  createdAt: Date;
}

const couponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, unique: true, uppercase: true },
    description: { type: String, default: '' },
    descriptionAr: { type: String, default: '' },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: true,
    },
    discountValue: { type: Number, required: true },
    minOrder: { type: Number, default: 0 },
    maxDiscount: { type: Number },
    maxUses: { type: Number, default: 100 },
    usedCount: { type: Number, default: 0 },
    usedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant' },
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

couponSchema.index({ code: 1 });
couponSchema.index({ isActive: 1, expiresAt: 1 });

export const Coupon = mongoose.model<ICoupon>('Coupon', couponSchema);
