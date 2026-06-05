import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { Captain } from '../models/Captain';
import { Restaurant } from '../models/Restaurant';
import { env } from '../config/env';
import { generateOtp, storeOtp, verifyOtp } from '../utils/generateOtp';
import { sendSMS } from '../utils/sms';
import { authenticate } from '../middleware/auth';
import { IJwtPayload } from '../types';

const router = Router();

function generateToken(payload: IJwtPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
}

// POST /api/auth/send-otp
router.post('/send-otp', async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      res.status(400).json({ error: 'Phone number is required' });
      return;
    }

    const otp = generateOtp();
    storeOtp(phone, otp);

    await sendSMS(phone, `Your Jaykom verification code: ${otp}`);

    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { phone, otp, name } = req.body;

    if (!phone || !otp) {
      res.status(400).json({ error: 'Phone and OTP are required' });
      return;
    }

    const isValid = verifyOtp(phone, otp);

    if (!isValid) {
      res.status(400).json({ error: 'Invalid or expired OTP' });
      return;
    }

    let user = await User.findOne({ phone });

    if (!user) {
      user = await User.create({
        phone,
        name: name || '',
        isVerified: true,
      });
    } else {
      user.isVerified = true;
      await user.save();
    }

    const token = generateToken({ userId: user._id.toString(), userType: 'user' });

    res.json({
      token,
      user: {
        id: user._id,
        phone: user.phone,
        name: user.name,
        avatar: user.avatar,
        addresses: user.addresses,
        shamCashBalance: user.shamCashBalance,
        loyaltyPoints: user.loyaltyPoints,
        loyaltyTier: user.loyaltyTier,
      },
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// POST /api/auth/captain/login
router.post('/captain/login', async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      res.status(400).json({ error: 'Phone and password are required' });
      return;
    }

    const captain = await Captain.findOne({ phone });

    if (!captain) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    if (captain.registrationStatus === 'pending') {
      res.status(403).json({ error: 'طلب التسجيل قيد المراجعة' });
      return;
    }

    if (captain.registrationStatus === 'rejected') {
      res.status(403).json({ error: 'تم رفض طلب التسجيل' });
      return;
    }

    if (captain.isBanned) {
      res.status(403).json({ error: 'هذا الحساب محظور' });
      return;
    }

    const isMatch = await bcrypt.compare(password, captain.password);

    if (!isMatch) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = generateToken({ userId: captain._id.toString(), userType: 'captain' });

    res.json({
      token,
      captain: {
        id: captain._id,
        name: captain.name,
        phone: captain.phone,
        avatar: captain.avatar,
        isOnline: captain.isOnline,
        rating: captain.rating,
        vehicleType: captain.vehicleType,
        completedOrders: captain.completedOrders,
        totalEarnings: captain.totalEarnings,
        todayEarnings: captain.todayEarnings,
        todayDeliveries: captain.todayDeliveries,
      },
    });
  } catch (error) {
    console.error('Captain login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/restaurant/signup
router.post('/restaurant/signup', async (req: Request, res: Response) => {
  try {
    const { phone, password, name, nameAr, ownerName, ownerPhone, latitude, longitude } = req.body;

    if (!phone || !password || !name || !nameAr) {
      res.status(400).json({ error: 'Phone, password, and restaurant name are required' });
      return;
    }

    const existing = await Restaurant.findOne({ phone });
    if (existing) {
      res.status(400).json({ error: 'رقم الهاتف مستخدم مسبقاً' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const restaurant = await Restaurant.create({
      name,
      nameAr,
      phone,
      password: hashedPassword,
      ownerName: ownerName || name,
      ownerPhone: ownerPhone || phone,
      latitude: latitude || 0,
      longitude: longitude || 0,
      imageUrl: 'https://placehold.co/400x300/00843D/FFFFFF?text=جديد',
      registrationStatus: 'pending',
      isOpen: false,
    });

    res.status(201).json({
      message: 'تم تقديم طلب التسجيل بنجاح، بانتظار موافقة الإدارة',
      id: restaurant._id,
    });
  } catch (error) {
    console.error('Restaurant signup error:', error);
    res.status(500).json({ error: 'فشل التسجيل' });
  }
});

// POST /api/auth/restaurant/login
router.post('/restaurant/login', async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      res.status(400).json({ error: 'Phone and password are required' });
      return;
    }

    const restaurant = await Restaurant.findOne({ phone });

    if (!restaurant) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    if (restaurant.registrationStatus !== 'approved') {
      res.status(403).json({
        error: restaurant.registrationStatus === 'pending'
          ? 'طلب التسجيل قيد المراجعة'
          : 'تم رفض طلب التسجيل',
      });
      return;
    }

    if (restaurant.isBanned) {
      res.status(403).json({ error: 'هذا الحساب محظور' });
      return;
    }

    if (!restaurant.password) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isMatch = await bcrypt.compare(password, restaurant.password);

    if (!isMatch) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = generateToken({ userId: restaurant._id.toString(), userType: 'restaurant' });

    res.json({
      token,
      restaurant: {
        id: restaurant._id,
        name: restaurant.name,
        nameAr: restaurant.nameAr,
        phone: restaurant.phone,
        isOpen: restaurant.isOpen,
      },
    });
  } catch (error) {
    console.error('Restaurant login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/captain/signup
router.post('/captain/signup', async (req: Request, res: Response) => {
  try {
    const { phone, password, name, age, vehicleType, drivingLicense, vehicleImageUrl } = req.body;

    if (!phone || !password || !name) {
      res.status(400).json({ error: 'Phone, password, and name are required' });
      return;
    }

    const existing = await Captain.findOne({ phone });
    if (existing) {
      res.status(400).json({ error: 'رقم الهاتف مستخدم مسبقاً' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const captain = await Captain.create({
      phone,
      password: hashedPassword,
      name,
      age: age || undefined,
      vehicleType: vehicleType || 'motorcycle',
      drivingLicense: drivingLicense || '',
      vehicleImageUrl: vehicleImageUrl || '',
      registrationStatus: 'pending',
      isActive: false,
      isOnline: false,
    });

    res.status(201).json({
      message: 'تم تقديم طلب التسجيل بنجاح، بانتظار موافقة الإدارة',
      id: captain._id,
    });
  } catch (error) {
    console.error('Captain signup error:', error);
    res.status(500).json({ error: 'فشل التسجيل' });
  }
});

// POST /api/auth/admin/login
router.post('/admin/login', async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      res.status(400).json({ error: 'Phone and password are required' });
      return;
    }

    const user = await User.findOne({ phone, role: 'admin' }).select('+password');

    if (!user || !user.password) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = generateToken({ userId: user._id.toString(), userType: 'admin' });

    res.json({
      token,
      admin: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) return;

    if (req.user.userType === 'user') {
      const user = await User.findById(req.user.userId).select('-__v');

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      if (user.isBanned) {
        res.status(403).json({ error: 'هذا الحساب محظور' });
        return;
      }

      res.json({
        id: user._id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        addresses: user.addresses,
        shamCashBalance: user.shamCashBalance,
        loyaltyPoints: user.loyaltyPoints,
        loyaltyTier: user.loyaltyTier,
        isBanned: user.isBanned,
        favoriteCaptains: user.favoriteCaptains,
        favoriteRestaurants: user.favoriteRestaurants,
      });
    } else if (req.user.userType === 'captain') {
      const captain = await Captain.findById(req.user.userId).select('-password -__v');

      if (!captain) {
        res.status(404).json({ error: 'Captain not found' });
        return;
      }

      if (captain.isBanned) {
        res.status(403).json({ error: 'هذا الحساب محظور' });
        return;
      }

      res.json(captain);
    } else if (req.user.userType === 'admin') {
      const admin = await User.findById(req.user.userId).select('-__v');

      if (!admin) {
        res.status(404).json({ error: 'Admin not found' });
        return;
      }

      res.json(admin);
    } else if (req.user.userType === 'restaurant') {
      const restaurant = await Restaurant.findById(req.user.userId).select('-password -__v');

      if (!restaurant) {
        res.status(404).json({ error: 'Restaurant not found' });
        return;
      }

      res.json(restaurant);
    }
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// PUT /api/auth/profile
router.put('/profile', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) return;

    const { name, email, avatar } = req.body;

    if (req.user.userType === 'user') {
      const user = await User.findByIdAndUpdate(
        req.user.userId,
        { $set: { name, email, avatar } },
        { new: true }
      ).select('-__v');

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json(user);
    }
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
