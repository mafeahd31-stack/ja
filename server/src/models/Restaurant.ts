import mongoose, { Schema, Document } from 'mongoose';

export interface IExtra {
  name: string;
  nameAr: string;
  price: number;
}

export interface IMenuItem {
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  price: number;
  imageUrl?: string;
  category: string;
  extras: IExtra[];
  isAvailable: boolean;
  preparationTime?: number;
}

export interface IMenuCategory {
  name: string;
  nameAr: string;
  items: IMenuItem[];
}

export interface IDeliveryZone {
  name: string;
  nameAr: string;
  radiusKm: number;
  deliveryFee: number;
  isFree: boolean;
}

export type RegistrationStatus = 'pending' | 'approved' | 'rejected';

export interface IRestaurant extends Document {
  ownerId: mongoose.Types.ObjectId;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  cuisine: string[];
  phone: string;
  imageUrl: string;
  coverUrl?: string;
  rating: number;
  ratingCount: number;
  deliveryFee: number;
  minOrder: number;
  estimatedTime: string;
  latitude: number;
  longitude: number;
  isOpen: boolean;
  isBanned: boolean;
  isFeatured: boolean;
  workingHours: { day: string; open: string; close: string }[];
  categories: IMenuCategory[];
  paymentMethods: string[];
  notificationToken?: string;
  affiliatedCaptains: mongoose.Types.ObjectId[];
  deliveryZones: IDeliveryZone[];
  freeDeliveryRadius: number;
  banReason?: string;
  bannedAt?: Date;
  registrationStatus: RegistrationStatus;
  ownerName?: string;
  ownerPhone?: string;
  password?: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const menuItemSchema = new Schema<IMenuItem>({
  name: { type: String, required: true },
  nameAr: { type: String, required: true },
  description: { type: String, default: '' },
  descriptionAr: { type: String, default: '' },
  price: { type: Number, required: true },
  imageUrl: { type: String },
  category: { type: String, required: true },
  extras: [
    {
      name: { type: String, required: true },
      nameAr: { type: String, required: true },
      price: { type: Number, default: 0 },
    },
  ],
  isAvailable: { type: Boolean, default: true },
  preparationTime: { type: Number },
});

const menuCategorySchema = new Schema<IMenuCategory>({
  name: { type: String, required: true },
  nameAr: { type: String, required: true },
  items: [menuItemSchema],
});

const deliveryZoneSchema = new Schema<IDeliveryZone>({
  name: { type: String, required: true },
  nameAr: { type: String, required: true },
  radiusKm: { type: Number, required: true },
  deliveryFee: { type: Number, default: 0 },
  isFree: { type: Boolean, default: false },
});

const restaurantSchema = new Schema<IRestaurant>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    nameAr: { type: String, required: true },
    description: { type: String, default: '' },
    descriptionAr: { type: String, default: '' },
    cuisine: [{ type: String }],
    phone: { type: String, required: true },
    imageUrl: { type: String, required: true },
    coverUrl: { type: String },
    rating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    minOrder: { type: Number, default: 0 },
    estimatedTime: { type: String, default: '30-45' },
    latitude: { type: Number, default: 0 },
    longitude: { type: Number, default: 0 },
    isOpen: { type: Boolean, default: true },
    isBanned: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    affiliatedCaptains: [{ type: Schema.Types.ObjectId, ref: 'Captain' }],
    deliveryZones: [deliveryZoneSchema],
    freeDeliveryRadius: { type: Number, default: 3 },
    banReason: { type: String },
    bannedAt: { type: Date },
    registrationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved',
    },
    ownerName: { type: String },
    ownerPhone: { type: String },
    password: { type: String },
    rejectionReason: { type: String },
    workingHours: [
      {
        day: { type: String, required: true },
        open: { type: String, required: true },
        close: { type: String, required: true },
      },
    ],
    categories: [menuCategorySchema],
    paymentMethods: [{ type: String }],
    notificationToken: { type: String },
  },
  { timestamps: true }
);

restaurantSchema.index({ latitude: 1, longitude: 1 });
restaurantSchema.index({ cuisine: 1 });
restaurantSchema.index({ isOpen: 1, isFeatured: 1 });

export const Restaurant = mongoose.model<IRestaurant>('Restaurant', restaurantSchema);
