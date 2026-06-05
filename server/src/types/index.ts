export interface IAddress {
  label: string;
  fullAddress: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
}

export interface IJwtPayload {
  userId: string;
  userType: 'user' | 'captain' | 'restaurant' | 'admin';
}

declare global {
  namespace Express {
    interface Request {
      user?: IJwtPayload;
    }
  }
}
