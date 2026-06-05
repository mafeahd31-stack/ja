import mongoose, { Schema, Document } from 'mongoose';

export type TransactionType = 'charge' | 'withdraw' | 'payment' | 'refund' | 'reward';
export type TransactionStatus = 'pending' | 'completed' | 'failed';

export interface IShamCashTransaction extends Document {
  userId: mongoose.Types.ObjectId;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reference: string;
  description: string;
  orderId?: mongoose.Types.ObjectId;
  status: TransactionStatus;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const shamCashSchema = new Schema<IShamCashTransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['charge', 'withdraw', 'payment', 'refund', 'reward'],
      required: true,
    },
    amount: { type: Number, required: true },
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    reference: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'completed',
    },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

shamCashSchema.index({ userId: 1, createdAt: -1 });

export const ShamCashTransaction = mongoose.model<IShamCashTransaction>(
  'ShamCashTransaction',
  shamCashSchema
);
