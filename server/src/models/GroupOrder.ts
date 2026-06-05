import mongoose, { Schema, Document } from 'mongoose';

export interface IGroupOrderMember {
  userId: mongoose.Types.ObjectId;
  name: string;
  items: {
    menuItemId: mongoose.Types.ObjectId;
    name: string;
    quantity: number;
    price: number;
  }[];
  subtotal: number;
  isPaid: boolean;
}

export interface IGroupOrder extends Document {
  hostId: mongoose.Types.ObjectId;
  code: string;
  restaurantId: mongoose.Types.ObjectId;
  members: IGroupOrderMember[];
  totalAmount: number;
  deliveryFee: number;
  deliveryAddress: {
    label: string;
    fullAddress: string;
    latitude: number;
    longitude: number;
  };
  status: 'open' | 'ordering' | 'closed' | 'cancelled';
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const groupOrderMemberSchema = new Schema<IGroupOrderMember>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  items: [
    {
      menuItemId: { type: Schema.Types.ObjectId, required: true },
      name: { type: String, required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
    },
  ],
  subtotal: { type: Number, default: 0 },
  isPaid: { type: Boolean, default: false },
});

const groupOrderSchema = new Schema<IGroupOrder>(
  {
    hostId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    code: { type: String, required: true, unique: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    members: [groupOrderMemberSchema],
    totalAmount: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    deliveryAddress: {
      label: { type: String, required: true },
      fullAddress: { type: String, required: true },
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    status: {
      type: String,
      enum: ['open', 'ordering', 'closed', 'cancelled'],
      default: 'open',
    },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

groupOrderSchema.index({ code: 1 });
groupOrderSchema.index({ hostId: 1 });
groupOrderSchema.index({ status: 1 });

export const GroupOrder = mongoose.model<IGroupOrder>('GroupOrder', groupOrderSchema);
