import mongoose, { Schema, Document } from 'mongoose';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'picked_up'
  | 'on_the_way'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod = 'cash' | 'sham_cash' | 'stripe';

export interface IOrderItem {
  menuItemId: mongoose.Types.ObjectId;
  name: string;
  nameAr: string;
  quantity: number;
  price: number;
  selectedExtras: { name: string; price: number }[];
  specialInstructions?: string;
}

export interface IOrder extends Document {
  userId: mongoose.Types.ObjectId;
  restaurantId: mongoose.Types.ObjectId;
  captainId?: mongoose.Types.ObjectId;
  items: IOrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  isPaid: boolean;
  deliveryAddress: {
    label: string;
    fullAddress: string;
    latitude: number;
    longitude: number;
  };
  groupOrderId?: mongoose.Types.ObjectId;
  couponCode?: string;
  captainRating?: number;
  estimatedDeliveryTime?: Date;
  deliveredAt?: Date;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>({
  menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  name: { type: String, required: true },
  nameAr: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true },
  selectedExtras: [
    {
      name: { type: String },
      price: { type: Number },
    },
  ],
  specialInstructions: { type: String },
});

const orderSchema = new Schema<IOrder>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    captainId: { type: Schema.Types.ObjectId, ref: 'Captain' },
    items: [orderItemSchema],
    subtotal: { type: Number, required: true },
    deliveryFee: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: [
        'pending',
        'confirmed',
        'preparing',
        'ready',
        'picked_up',
        'on_the_way',
        'delivered',
        'cancelled',
      ],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'sham_cash', 'stripe'],
      default: 'cash',
    },
    isPaid: { type: Boolean, default: false },
    deliveryAddress: {
      label: { type: String, required: true },
      fullAddress: { type: String, required: true },
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    groupOrderId: { type: Schema.Types.ObjectId, ref: 'GroupOrder' },
    couponCode: { type: String },
    captainRating: { type: Number, min: 1, max: 5 },
    estimatedDeliveryTime: { type: Date },
    deliveredAt: { type: Date },
    cancellationReason: { type: String },
  },
  { timestamps: true }
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ restaurantId: 1, status: 1 });
orderSchema.index({ captainId: 1, createdAt: -1 });
orderSchema.index({ status: 1 });

export const Order = mongoose.model<IOrder>('Order', orderSchema);
