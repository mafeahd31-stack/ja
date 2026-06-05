import mongoose, { Schema, Document } from 'mongoose';

export interface ISupportNumber extends Document {
  phone: string;
  name: string;
  nameAr: string;
  workStart: string;
  workEnd: string;
  daysOfWeek: number[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const supportNumberSchema = new Schema<ISupportNumber>(
  {
    phone: { type: String, required: true },
    name: { type: String, required: true },
    nameAr: { type: String, required: true },
    workStart: { type: String, required: true },
    workEnd: { type: String, required: true },
    daysOfWeek: {
      type: [Number],
      default: [0, 1, 2, 3, 4, 5, 6],
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

supportNumberSchema.index({ isActive: 1 });

export const SupportNumber = mongoose.model<ISupportNumber>(
  'SupportNumber',
  supportNumberSchema
);
