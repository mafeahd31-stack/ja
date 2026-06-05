import mongoose, { Schema, Document } from 'mongoose';
import { IAddress } from '../types';

export type UserRole = 'user' | 'admin';

export interface IUser extends Document {
  phone: string;
  name?: string;
  email?: string;
  avatar?: string;
  password?: string;
  role: UserRole;
  addresses: IAddress[];
  shamCashBalance: number;
  loyaltyPoints: number;
  loyaltyTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  favoriteCaptains: mongoose.Types.ObjectId[];
  favoriteRestaurants: mongoose.Types.ObjectId[];
  deviceToken?: string;
  isVerified: boolean;
  isBanned: boolean;
  banReason?: string;
  bannedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    phone: { type: String, required: true, unique: true },
    name: { type: String },
    email: { type: String },
    avatar: { type: String },
    password: { type: String, select: false },
    addresses: [
      {
        label: { type: String, required: true },
        fullAddress: { type: String, required: true },
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
        isDefault: { type: Boolean, default: false },
      },
    ],
    shamCashBalance: { type: Number, default: 0 },
    loyaltyPoints: { type: Number, default: 0 },
    loyaltyTier: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum'],
      default: 'bronze',
    },
    favoriteCaptains: [{ type: Schema.Types.ObjectId, ref: 'Captain' }],
    favoriteRestaurants: [{ type: Schema.Types.ObjectId, ref: 'Restaurant' }],
    deviceToken: { type: String },
    isVerified: { type: Boolean, default: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isBanned: { type: Boolean, default: false },
    banReason: { type: String },
    bannedAt: { type: Date },
  },
      { timestamps: true }
);

export const User = mongoose.model<IUser>('User', userSchema);
