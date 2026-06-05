import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { Restaurant } from '../models/Restaurant';
import { Captain } from '../models/Captain';
import { Order } from '../models/Order';
import { DeliveryRule } from '../models/DeliveryRule';
import { AdminLog } from '../models/AdminLog';
import { Coupon } from '../models/Coupon';
import { SupportNumber } from '../models/SupportNumber';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';

const router = Router();

// Create admin must be public (no auth) for initial setup
router.post('/create-admin', async (req: Request, res: Response) => {
  try {
    const { phone, name, password } = req.body;

    if (!phone || !name || !password) {
      res.status(400).json({ error: 'Phone, name, and password required' });
      return;
    }

    const existing = await User.findOne({ phone });
    if (existing) {
      res.status(400).json({ error: 'User with this phone already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await User.create({
      phone,
      name,
      role: 'admin',
      password: hashedPassword,
      isVerified: true,
    });

    res.status(201).json({ message: 'Admin created', id: admin._id });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ error: 'Failed to create admin' });
  }
});

router.use(authenticate);
router.use(requireAdmin);

// ─── DASHBOARD STATS ───────────────────────

router.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    const [
      totalRestaurants,
      openRestaurants,
      bannedRestaurants,
      totalCaptains,
      onlineCaptains,
      bannedCaptains,
      totalUsers,
      bannedUsers,
      totalOrders,
      pendingOrders,
      todayOrders,
      totalRevenue,
    ] = await Promise.all([
      Restaurant.countDocuments(),
      Restaurant.countDocuments({ isOpen: true }),
      Restaurant.countDocuments({ isBanned: true }),
      Captain.countDocuments(),
      Captain.countDocuments({ isOnline: true }),
      Captain.countDocuments({ isBanned: true }),
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ isBanned: true }),
      Order.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),
      Order.aggregate([
        { $match: { status: 'delivered' } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
    ]);

    const recentOrders = await Order.find()
      .populate('restaurantId', 'name nameAr')
      .populate('userId', 'name phone')
      .sort({ createdAt: -1 })
      .limit(10);

    const ordersByStatus = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    res.json({
      stats: {
        restaurants: { total: totalRestaurants, open: openRestaurants, banned: bannedRestaurants },
        captains: { total: totalCaptains, online: onlineCaptains, banned: bannedCaptains },
        users: { total: totalUsers, banned: bannedUsers },
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          today: todayOrders,
          revenue: totalRevenue[0]?.total || 0,
        },
      },
      ordersByStatus,
      recentOrders,
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

// ─── RESTAURANTS MANAGEMENT ────────────────

router.get('/restaurants', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', search, banned } = req.query;
    const filter: Record<string, unknown> = {};

    if (banned === 'true') filter.isBanned = true;
    if (banned === 'false') filter.isBanned = false;
    if (search) {
      const s = new RegExp(search as string, 'i');
      filter.$or = [{ name: s }, { nameAr: s }, { phone: s }];
    }

    const restaurants = await Restaurant.find(filter)
      .populate('affiliatedCaptains', 'name phone')
      .sort({ createdAt: -1 })
      .skip((parseInt(page as string) - 1) * parseInt(limit as string))
      .limit(parseInt(limit as string));

    const total = await Restaurant.countDocuments(filter);

    res.json({
      restaurants,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Admin get restaurants error:', error);
    res.status(500).json({ error: 'Failed to get restaurants' });
  }
});

router.put('/restaurants/:id/ban', async (req: Request, res: Response) => {
  try {
    if (!req.user) return;
    const { reason } = req.body;

    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { isBanned: true, banReason: reason || '', bannedAt: new Date(), isOpen: false },
      { new: true }
    );

    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant not found' });
      return;
    }

    await AdminLog.create({
      adminId: req.user.userId,
      action: 'ban_restaurant',
      targetType: 'restaurant',
      targetId: restaurant._id,
      details: `Banned restaurant: ${restaurant.name} (${restaurant.nameAr})`,
      metadata: { reason },
    });

    res.json({ message: 'Restaurant banned', restaurant });
  } catch (error) {
    console.error('Ban restaurant error:', error);
    res.status(500).json({ error: 'Failed to ban restaurant' });
  }
});

router.put('/restaurants/:id/unban', async (req: Request, res: Response) => {
  try {
    if (!req.user) return;

    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { isBanned: false, banReason: null, bannedAt: null },
      { new: true }
    );

    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant not found' });
      return;
    }

    await AdminLog.create({
      adminId: req.user.userId,
      action: 'unban_restaurant',
      targetType: 'restaurant',
      targetId: restaurant._id,
      details: `Unbanned restaurant: ${restaurant.name}`,
    });

    res.json({ message: 'Restaurant unbanned', restaurant });
  } catch (error) {
    console.error('Unban restaurant error:', error);
    res.status(500).json({ error: 'Failed to unban restaurant' });
  }
});

// ─── CAPTAINS MANAGEMENT ───────────────────

router.get('/captains', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', search, banned, restaurantId } = req.query;
    const filter: Record<string, unknown> = {};

    if (banned === 'true') filter.isBanned = true;
    if (banned === 'false') filter.isBanned = false;
    if (restaurantId) filter.affiliatedRestaurantId = restaurantId;
    if (search) {
      const s = new RegExp(search as string, 'i');
      filter.$or = [{ name: s }, { phone: s }];
    }

    const captains = await Captain.find(filter)
      .populate('affiliatedRestaurantId', 'name nameAr')
      .sort({ createdAt: -1 })
      .skip((parseInt(page as string) - 1) * parseInt(limit as string))
      .limit(parseInt(limit as string));

    const total = await Captain.countDocuments(filter);

    res.json({
      captains,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Admin get captains error:', error);
    res.status(500).json({ error: 'Failed to get captains' });
  }
});

router.put('/captains/:id/ban', async (req: Request, res: Response) => {
  try {
    if (!req.user) return;
    const { reason } = req.body;

    const captain = await Captain.findByIdAndUpdate(
      req.params.id,
      { isBanned: true, banReason: reason || '', bannedAt: new Date(), isOnline: false },
      { new: true }
    );

    if (!captain) {
      res.status(404).json({ error: 'Captain not found' });
      return;
    }

    await AdminLog.create({
      adminId: req.user.userId,
      action: 'ban_captain',
      targetType: 'captain',
      targetId: captain._id,
      details: `Banned captain: ${captain.name} (${captain.phone})`,
      metadata: { reason },
    });

    res.json({ message: 'Captain banned', captain });
  } catch (error) {
    console.error('Ban captain error:', error);
    res.status(500).json({ error: 'Failed to ban captain' });
  }
});

router.put('/captains/:id/unban', async (req: Request, res: Response) => {
  try {
    if (!req.user) return;

    const captain = await Captain.findByIdAndUpdate(
      req.params.id,
      { isBanned: false, banReason: null, bannedAt: null },
      { new: true }
    );

    if (!captain) {
      res.status(404).json({ error: 'Captain not found' });
      return;
    }

    await AdminLog.create({
      adminId: req.user.userId,
      action: 'unban_captain',
      targetType: 'captain',
      targetId: captain._id,
      details: `Unbanned captain: ${captain.name}`,
    });

    res.json({ message: 'Captain unbanned', captain });
  } catch (error) {
    console.error('Unban captain error:', error);
    res.status(500).json({ error: 'Failed to unban captain' });
  }
});

router.put('/captains/:id/commission', async (req: Request, res: Response) => {
  try {
    if (!req.user) return;
    const { commissionRate } = req.body;

    if (commissionRate === undefined || commissionRate < 0) {
      res.status(400).json({ error: 'Invalid commission rate' });
      return;
    }

    const captain = await Captain.findByIdAndUpdate(
      req.params.id,
      { commissionRate },
      { new: true }
    );

    if (!captain) {
      res.status(404).json({ error: 'Captain not found' });
      return;
    }

    await AdminLog.create({
      adminId: req.user.userId,
      action: 'update_commission',
      targetType: 'captain',
      targetId: captain._id,
      details: `Updated commission for ${captain.name}: ${commissionRate}%`,
      metadata: { commissionRate },
    });

    res.json({ message: 'Commission updated', captain });
  } catch (error) {
    console.error('Update commission error:', error);
    res.status(500).json({ error: 'Failed to update commission' });
  }
});

// ─── USERS MANAGEMENT ──────────────────────

router.get('/users', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', search, banned } = req.query;
    const filter: Record<string, unknown> = { role: 'user' };

    if (banned === 'true') filter.isBanned = true;
    if (banned === 'false') filter.isBanned = false;
    if (search) {
      const s = new RegExp(search as string, 'i');
      filter.$or = [{ name: s }, { phone: s }, { email: s }];
    }

    const users = await User.find(filter)
      .select('-__v')
      .sort({ createdAt: -1 })
      .skip((parseInt(page as string) - 1) * parseInt(limit as string))
      .limit(parseInt(limit as string));

    const total = await User.countDocuments(filter);

    res.json({
      users,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

router.put('/users/:id/ban', async (req: Request, res: Response) => {
  try {
    if (!req.user) return;
    const { reason } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBanned: true, banReason: reason || '', bannedAt: new Date() },
      { new: true }
    );

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    await AdminLog.create({
      adminId: req.user.userId,
      action: 'ban_user',
      targetType: 'user',
      targetId: user._id,
      details: `Banned user: ${user.name || user.phone}`,
      metadata: { reason },
    });

    res.json({ message: 'User banned', user });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ error: 'Failed to ban user' });
  }
});

router.put('/users/:id/unban', async (req: Request, res: Response) => {
  try {
    if (!req.user) return;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBanned: false, banReason: null, bannedAt: null },
      { new: true }
    );

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    await AdminLog.create({
      adminId: req.user.userId,
      action: 'unban_user',
      targetType: 'user',
      targetId: user._id,
      details: `Unbanned user: ${user.name || user.phone}`,
    });

    res.json({ message: 'User unbanned', user });
  } catch (error) {
    console.error('Unban user error:', error);
    res.status(500).json({ error: 'Failed to unban user' });
  }
});

// ─── DELIVERY RULES (Commission per distance) ──

router.get('/delivery-rules', async (_req: Request, res: Response) => {
  try {
    const rules = await DeliveryRule.find().sort({ priority: -1, minDistanceKm: 1 });
    res.json(rules);
  } catch (error) {
    console.error('Get delivery rules error:', error);
    res.status(500).json({ error: 'Failed to get delivery rules' });
  }
});

router.post('/delivery-rules', async (req: Request, res: Response) => {
  try {
    if (!req.user) return;
    const { name, nameAr, minDistanceKm, maxDistanceKm, commissionType, commissionValue, restaurantCommission, captainCommission, priority } = req.body;

    if (!name || minDistanceKm === undefined || maxDistanceKm === undefined || commissionValue === undefined) {
      res.status(400).json({ error: 'Name, distances, and commission value are required' });
      return;
    }

    const rule = await DeliveryRule.create({
      name,
      nameAr: nameAr || name,
      minDistanceKm,
      maxDistanceKm,
      commissionType: commissionType || 'percentage',
      commissionValue,
      restaurantCommission: restaurantCommission || 0,
      captainCommission: captainCommission || 0,
      priority: priority || 0,
      createdBy: req.user.userId,
    });

    await AdminLog.create({
      adminId: req.user.userId,
      action: 'create_delivery_rule',
      targetType: 'delivery_rule',
      targetId: rule._id,
      details: `Created delivery rule: ${name} (${minDistanceKm}-${maxDistanceKm} km)`,
      metadata: req.body,
    });

    res.status(201).json(rule);
  } catch (error) {
    console.error('Create delivery rule error:', error);
    res.status(500).json({ error: 'Failed to create delivery rule' });
  }
});

router.put('/delivery-rules/:id', async (req: Request, res: Response) => {
  try {
    if (!req.user) return;
    const { name, nameAr, minDistanceKm, maxDistanceKm, commissionType, commissionValue, restaurantCommission, captainCommission, isActive, priority } = req.body;

    const rule = await DeliveryRule.findByIdAndUpdate(
      req.params.id,
      { $set: { name, nameAr, minDistanceKm, maxDistanceKm, commissionType, commissionValue, restaurantCommission, captainCommission, isActive, priority } },
      { new: true }
    );

    if (!rule) {
      res.status(404).json({ error: 'Delivery rule not found' });
      return;
    }

    await AdminLog.create({
      adminId: req.user.userId,
      action: 'update_delivery_rule',
      targetType: 'delivery_rule',
      targetId: rule._id,
      details: `Updated delivery rule: ${name}`,
    });

    res.json(rule);
  } catch (error) {
    console.error('Update delivery rule error:', error);
    res.status(500).json({ error: 'Failed to update delivery rule' });
  }
});

router.delete('/delivery-rules/:id', async (req: Request, res: Response) => {
  try {
    if (!req.user) return;

    const rule = await DeliveryRule.findByIdAndDelete(req.params.id);

    if (!rule) {
      res.status(404).json({ error: 'Delivery rule not found' });
      return;
    }

    await AdminLog.create({
      adminId: req.user.userId,
      action: 'delete_delivery_rule',
      targetType: 'delivery_rule',
      targetId: rule._id,
      details: `Deleted delivery rule: ${rule.name}`,
    });

    res.json({ message: 'Delivery rule deleted' });
  } catch (error) {
    console.error('Delete delivery rule error:', error);
    res.status(500).json({ error: 'Failed to delete delivery rule' });
  }
});

// ─── ADMIN AUDIT LOG ────────────────────────

router.get('/logs', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '50' } = req.query;

    const logs = await AdminLog.find()
      .populate('adminId', 'name email')
      .sort({ createdAt: -1 })
      .skip((parseInt(page as string) - 1) * parseInt(limit as string))
      .limit(parseInt(limit as string));

    const total = await AdminLog.countDocuments();

    res.json({
      logs,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Get admin logs error:', error);
    res.status(500).json({ error: 'Failed to get admin logs' });
  }
});

// ─── ORDER MANAGEMENT ──────────────────────

router.get('/orders', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', status, restaurantId } = req.query;
    const filter: Record<string, unknown> = {};

    if (status) filter.status = status;
    if (restaurantId) filter.restaurantId = restaurantId;

    const orders = await Order.find(filter)
      .populate('restaurantId', 'name nameAr')
      .populate('userId', 'name phone')
      .populate('captainId', 'name phone')
      .sort({ createdAt: -1 })
      .skip((parseInt(page as string) - 1) * parseInt(limit as string))
      .limit(parseInt(limit as string));

    const total = await Order.countDocuments(filter);

    res.json({
      orders,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Admin get orders error:', error);
    res.status(500).json({ error: 'Failed to get orders' });
  }
});

// ─── SYSTEM SETTINGS ──────────────────────

// ─── SUPPORT NUMBERS MANAGEMENT ─────────────

router.get('/support-numbers', async (_req: Request, res: Response) => {
  try {
    const numbers = await SupportNumber.find().sort({ createdAt: 1 });
    res.json(numbers);
  } catch (error) {
    console.error('Get support numbers error:', error);
    res.status(500).json({ error: 'Failed to get support numbers' });
  }
});

router.post('/support-numbers', async (req: Request, res: Response) => {
  try {
    if (!req.user) return;
    const { phone, name, nameAr, workStart, workEnd, daysOfWeek, isActive } = req.body;

    if (!phone || !name || !nameAr || !workStart || !workEnd) {
      res.status(400).json({ error: 'Phone, name, and working hours are required' });
      return;
    }

    const number = await SupportNumber.create({
      phone,
      name,
      nameAr,
      workStart,
      workEnd,
      daysOfWeek: daysOfWeek || [0, 1, 2, 3, 4, 5, 6],
      isActive: isActive !== undefined ? isActive : true,
    });

    await AdminLog.create({
      adminId: req.user.userId,
      action: 'create_support_number',
      targetType: 'support_number',
      targetId: number._id,
      details: `Created support number: ${name} (${phone})`,
      metadata: req.body,
    });

    res.status(201).json(number);
  } catch (error) {
    console.error('Create support number error:', error);
    res.status(500).json({ error: 'Failed to create support number' });
  }
});

router.put('/support-numbers/:id', async (req: Request, res: Response) => {
  try {
    if (!req.user) return;
    const { phone, name, nameAr, workStart, workEnd, daysOfWeek, isActive } = req.body;

    const number = await SupportNumber.findByIdAndUpdate(
      req.params.id,
      { $set: { phone, name, nameAr, workStart, workEnd, daysOfWeek, isActive } },
      { new: true }
    );

    if (!number) {
      res.status(404).json({ error: 'Support number not found' });
      return;
    }

    await AdminLog.create({
      adminId: req.user.userId,
      action: 'update_support_number',
      targetType: 'support_number',
      targetId: number._id,
      details: `Updated support number: ${name} (${phone})`,
    });

    res.json(number);
  } catch (error) {
    console.error('Update support number error:', error);
    res.status(500).json({ error: 'Failed to update support number' });
  }
});

router.delete('/support-numbers/:id', async (req: Request, res: Response) => {
  try {
    if (!req.user) return;

    const number = await SupportNumber.findByIdAndDelete(req.params.id);

    if (!number) {
      res.status(404).json({ error: 'Support number not found' });
      return;
    }

    await AdminLog.create({
      adminId: req.user.userId,
      action: 'delete_support_number',
      targetType: 'support_number',
      targetId: number._id,
      details: `Deleted support number: ${number.name} (${number.phone})`,
    });

    res.json({ message: 'Support number deleted' });
  } catch (error) {
    console.error('Delete support number error:', error);
    res.status(500).json({ error: 'Failed to delete support number' });
  }
});

// ─── PENDING RESTAURANTS (Registration Requests) ──

router.get('/restaurants/pending', async (_req: Request, res: Response) => {
  try {
    const restaurants = await Restaurant.find({ registrationStatus: 'pending' })
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(restaurants);
  } catch (error) {
    console.error('Get pending restaurants error:', error);
    res.status(500).json({ error: 'Failed to get pending restaurants' });
  }
});

router.get('/restaurants/approved', async (_req: Request, res: Response) => {
  try {
    const restaurants = await Restaurant.find({ registrationStatus: 'approved' })
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(restaurants);
  } catch (error) {
    console.error('Get approved restaurants error:', error);
    res.status(500).json({ error: 'Failed to get approved restaurants' });
  }
});

router.put('/restaurants/:id/approve', async (req: Request, res: Response) => {
  try {
    if (!req.user) return;

    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { registrationStatus: 'approved', isOpen: true, isBanned: false, rejectionReason: null },
      { new: true }
    ).select('-password');

    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant not found' });
      return;
    }

    await AdminLog.create({
      adminId: req.user.userId,
      action: 'approve_restaurant',
      targetType: 'restaurant',
      targetId: restaurant._id,
      details: `Approved restaurant: ${restaurant.name} (${restaurant.nameAr})`,
    });

    res.json({ message: 'Restaurant approved', restaurant });
  } catch (error) {
    console.error('Approve restaurant error:', error);
    res.status(500).json({ error: 'Failed to approve restaurant' });
  }
});

router.put('/restaurants/:id/reject', async (req: Request, res: Response) => {
  try {
    if (!req.user) return;
    const { reason } = req.body;

    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { registrationStatus: 'rejected', rejectionReason: reason || '', isOpen: false },
      { new: true }
    ).select('-password');

    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant not found' });
      return;
    }

    await AdminLog.create({
      adminId: req.user.userId,
      action: 'reject_restaurant',
      targetType: 'restaurant',
      targetId: restaurant._id,
      details: `Rejected restaurant: ${restaurant.name} (${restaurant.nameAr})`,
      metadata: { reason },
    });

    res.json({ message: 'Restaurant rejected', restaurant });
  } catch (error) {
    console.error('Reject restaurant error:', error);
    res.status(500).json({ error: 'Failed to reject restaurant' });
  }
});

// ─── PENDING CAPTAINS (Registration Requests) ──

router.get('/captains/pending', async (_req: Request, res: Response) => {
  try {
    const captains = await Captain.find({ registrationStatus: 'pending' })
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(captains);
  } catch (error) {
    console.error('Get pending captains error:', error);
    res.status(500).json({ error: 'Failed to get pending captains' });
  }
});

router.put('/captains/:id/approve', async (req: Request, res: Response) => {
  try {
    if (!req.user) return;

    const captain = await Captain.findByIdAndUpdate(
      req.params.id,
      { registrationStatus: 'approved', isActive: true, isBanned: false, rejectionReason: null },
      { new: true }
    ).select('-password');

    if (!captain) {
      res.status(404).json({ error: 'Captain not found' });
      return;
    }

    await AdminLog.create({
      adminId: req.user.userId,
      action: 'approve_captain',
      targetType: 'captain',
      targetId: captain._id,
      details: `Approved captain: ${captain.name} (${captain.phone})`,
    });

    res.json({ message: 'Captain approved', captain });
  } catch (error) {
    console.error('Approve captain error:', error);
    res.status(500).json({ error: 'Failed to approve captain' });
  }
});

router.put('/captains/:id/reject', async (req: Request, res: Response) => {
  try {
    if (!req.user) return;
    const { reason } = req.body;

    const captain = await Captain.findByIdAndUpdate(
      req.params.id,
      { registrationStatus: 'rejected', rejectionReason: reason || '', isActive: false },
      { new: true }
    ).select('-password');

    if (!captain) {
      res.status(404).json({ error: 'Captain not found' });
      return;
    }

    await AdminLog.create({
      adminId: req.user.userId,
      action: 'reject_captain',
      targetType: 'captain',
      targetId: captain._id,
      details: `Rejected captain: ${captain.name} (${captain.phone})`,
      metadata: { reason },
    });

    res.json({ message: 'Captain rejected', captain });
  } catch (error) {
    console.error('Reject captain error:', error);
    res.status(500).json({ error: 'Failed to reject captain' });
  }
});

export default router;
