import mongoose, { Schema, Document } from 'mongoose';

export type MessageType = 'text' | 'image' | 'voice' | 'video' | 'system';
export type MessageSender = 'user' | 'captain';

export interface IMessage {
  senderType: MessageSender;
  senderId: mongoose.Types.ObjectId;
  type: MessageType;
  content: string;
  fileUrl?: string;
  filePublicId?: string;
  fileName?: string;
  fileSize?: number;
  duration?: number;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

export interface IChat extends Document {
  orderId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  captainId: mongoose.Types.ObjectId;
  restaurantId?: mongoose.Types.ObjectId;
  messages: IMessage[];
  lastMessage?: {
    content: string;
    type: MessageType;
    senderType: MessageSender;
    createdAt: Date;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    senderType: {
      type: String,
      enum: ['user', 'captain'],
      required: true,
    },
    senderId: { type: Schema.Types.ObjectId, required: true },
    type: {
      type: String,
      enum: ['text', 'image', 'voice', 'video', 'system'],
      default: 'text',
    },
    content: { type: String, default: '' },
    fileUrl: { type: String },
    filePublicId: { type: String },
    fileName: { type: String },
    fileSize: { type: Number },
    duration: { type: Number },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
  },
  { timestamps: true }
);

const chatSchema = new Schema<IChat>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    captainId: { type: Schema.Types.ObjectId, ref: 'Captain', required: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant' },
    messages: [messageSchema],
    lastMessage: {
      content: { type: String },
      type: { type: String },
      senderType: { type: String },
      createdAt: { type: Date },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// TTL index: auto-delete chats older than 2 days (172800 seconds)
// The TTL indexes on the messages createdAt will cause MongoDB to delete
// the entire parent document when the oldest message reaches 2 days.
// We also add expireAfterSeconds on the chat document itself based on updatedAt.
chatSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 172800 });

chatSchema.index({ userId: 1, updatedAt: -1 });
chatSchema.index({ captainId: 1, updatedAt: -1 });
chatSchema.index({ orderId: 1 });

export const Chat = mongoose.model<IChat>('Chat', chatSchema);
