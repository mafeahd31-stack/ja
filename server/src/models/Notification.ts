import mongoose, { Schema, Document } from 'mongoose';

export type NotificationType =
  | 'order_confirmed'
  | 'order_preparing'
  | 'order_on_the_way'
  | 'order_delivered'
  | 'captain_assigned'
  | 'promotion'
  | 'coupon'
  | 'loyalty'
  | 'review_request'
  | 'system';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  userType: 'user' | 'captain' | 'restaurant';
  type: NotificationType;
  title: string;
  titleAr: string;
  body: string;
  bodyAr: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    userType: {
      type: String,
      enum: ['user', 'captain', 'restaurant'],
      required: true,
    },
    type: {
      type: String,
      enum: [
        'order_confirmed',
        'order_preparing',
        'order_on_the_way',
        'order_delivered',
        'captain_assigned',
        'promotion',
        'coupon',
        'loyalty',
        'review_request',
        'system',
      ],
      required: true,
    },
    title: { type: String, required: true },
    titleAr: { type: String, required: true },
    body: { type: String, required: true },
    bodyAr: { type: String, required: true },
    data: { type: Schema.Types.Mixed },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, userType: 1, createdAt: -1 });
notificationSchema.index({ isRead: 1 });

export const Notification = mongoose.model<INotification>(
  'Notification',
  notificationSchema
);
