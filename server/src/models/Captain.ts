import mongoose, { Schema, Document } from 'mongoose';

export interface ILocation {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

export type RegistrationStatus = 'pending' | 'approved' | 'rejected';

export interface ICaptain extends Document {
  phone: string;
  name: string;
  email?: string;
  avatar?: string;
  password: string;
  rating: number;
  ratingCount: number;
  isOnline: boolean;
  isActive: boolean;
  isBanned: boolean;
  vehicleType: 'motorcycle' | 'car' | 'bicycle';
  vehiclePlate?: string;
  currentLocation: ILocation;
  homeLocation: ILocation;
  affiliatedRestaurantId?: mongoose.Types.ObjectId;
  commissionRate: number;
  completedOrders: number;
  totalEarnings: number;
  todayEarnings: number;
  todayDeliveries: number;
  deviceToken?: string;
  idDocument?: string;
  drivingLicense?: string;
  vehicleImageUrl?: string;
  isVerified: boolean;
  banReason?: string;
  bannedAt?: Date;
  registrationStatus: RegistrationStatus;
  age?: number;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const captainSchema = new Schema<ICaptain>(
  {
    phone: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String },
    avatar: { type: String },
    password: { type: String, required: true },
    rating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    isOnline: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isBanned: { type: Boolean, default: false },
    vehicleType: {
      type: String,
      enum: ['motorcycle', 'car', 'bicycle'],
      default: 'motorcycle',
    },
    vehiclePlate: { type: String },
    homeLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
    affiliatedRestaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant' },
    commissionRate: { type: Number, default: 0 },
    currentLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
    completedOrders: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    todayEarnings: { type: Number, default: 0 },
    todayDeliveries: { type: Number, default: 0 },
    deviceToken: { type: String },
    idDocument: { type: String },
    drivingLicense: { type: String },
    vehicleImageUrl: { type: String },
    isVerified: { type: Boolean, default: false },
    registrationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved',
    },
    age: { type: Number },
    rejectionReason: { type: String },
    banReason: { type: String },
    bannedAt: { type: Date },
  },
  { timestamps: true }
);

captainSchema.index({ currentLocation: '2dsphere' });

export const Captain = mongoose.model<ICaptain>('Captain', captainSchema);
