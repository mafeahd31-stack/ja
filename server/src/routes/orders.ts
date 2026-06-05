import { Router, Request, Response } from 'express';
import { Order } from '../models/Order';
import { User } from '../models/User';
import { Restaurant } from '../models/Restaurant';
import { Notification } from '../models/Notification';
import { Coupon } from '../models/Coupon';
import { authenticate } from '../middleware/auth';
import { sendPushNotification } from '../utils/pushNotifications';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// Apply auth to all routes
router.use(authenticate);

// POST /api/orders - Create a new order
router.post('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) return;

    const {
      restaurantId,
      items,
      deliveryAddress,
      paymentMethod,
      couponCode,
      specialInstructions,
    } = req.body;

    // Validate restaurant
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant not found' });
      return;
    }

    if (!restaurant.isOpen) {
      res.status(400).json({ error: 'Restaurant is closed' });
      return;
    }

    // Calculate totals
    let subtotal = 0;
    const orderItems = items.map((item: Record<string, unknown>) => {
      const itemTotal = item.price as number * (item.quantity as number);
      const extrasTotal = ((item.selectedExtras as Array<Record<string, unknown>>) || [])
        .reduce((sum: number, ext) => sum + (ext.price as number), 0);
      subtotal += itemTotal + extrasTotal;
      return item;
    });

    let discount = 0;

    // Validate coupon
    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode.toUpperCase(),
        isActive: true,
        expiresAt: { $gt: new Date() },
      });

      if (!coupon) {
        res.status(400).json({ error: 'Invalid or expired coupon' });
        return;
      }

      if (coupon.usedCount >= coupon.maxUses) {
        res.status(400).json({ error: 'Coupon usage limit reached' });
        return;
      }

      if (subtotal < coupon.minOrder) {
        res.status(400).json({
          error: `Minimum order of ${coupon.minOrder} required for this coupon`,
        });
        return;
      }

      if (coupon.discountType === 'percentage') {
        discount = (subtotal * coupon.discountValue) / 100;
        if (coupon.maxDiscount) {
          discount = Math.min(discount, coupon.maxDiscount);
        }
      } else {
        discount = coupon.discountValue;
      }

      // Increment coupon usage
      coupon.usedCount += 1;
      coupon.usedBy.push(req.user.userId as any);
      await coupon.save();
    }

    // Calculate delivery fee based on distance
    const { getDistanceKm } = require('../utils/distance');
    const distanceKm = getDistanceKm(
      restaurant.latitude,
      restaurant.longitude,
      deliveryAddress.latitude,
      deliveryAddress.longitude
    );

    let deliveryFee = restaurant.deliveryFee;

    // Check if within free delivery zone
    if (distanceKm <= restaurant.freeDeliveryRadius) {
      deliveryFee = 0;
    }

    // Check custom delivery zones
    if (restaurant.deliveryZones && restaurant.deliveryZones.length > 0) {
      const matchedZone = restaurant.deliveryZones
        .filter((z: { radiusKm: number; isFree: boolean }) => distanceKm <= z.radiusKm)
        .sort((a: { radiusKm: number }, b: { radiusKm: number }) => a.radiusKm - b.radiusKm)[0];

      if (matchedZone) {
        deliveryFee = matchedZone.isFree ? 0 : (matchedZone.deliveryFee || deliveryFee);
      }
    }

    const total = subtotal + deliveryFee - discount;

    const order = await Order.create({
      userId: req.user.userId,
      restaurantId,
      items: orderItems,
      subtotal,
      deliveryFee,
      discount,
      total,
      paymentMethod: paymentMethod || 'cash',
      deliveryAddress,
      couponCode: couponCode?.toUpperCase(),
    });

    // Calculate loyalty points (1 point per 1000 SYP)
    const pointsEarned = Math.floor(total / 1000);
    await User.findByIdAndUpdate(req.user.userId, {
      $inc: { loyaltyPoints: pointsEarned },
    });

    // Check tier upgrade
    const user = await User.findById(req.user.userId);
    if (user) {
      let newTier = user.loyaltyTier;
      if (user.loyaltyPoints >= 10000) newTier = 'platinum';
      else if (user.loyaltyPoints >= 5000) newTier = 'gold';
      else if (user.loyaltyPoints >= 2000) newTier = 'silver';

      if (newTier !== user.loyaltyTier) {
        user.loyaltyTier = newTier;
        await user.save();
      }
    }

    // Send notification to restaurant
    if (restaurant.notificationToken) {
      await sendPushNotification({
        title: 'طلب جديد',
        body: `لديك طلب جديد من ${user?.name || 'عميل'}`,
        data: { orderId: order._id.toString(), type: 'new_order' },
        token: restaurant.notificationToken,
      });
    }

    // Create notification record
    await Notification.create({
      userId: restaurant.ownerId,
      userType: 'restaurant',
      type: 'order_confirmed',
      title: 'New Order',
      titleAr: 'طلب جديد',
      body: `You have a new order #${order._id}`,
      bodyAr: `لديك طلب جديد رقم #${order._id}`,
      data: { orderId: order._id.toString() },
    });

    res.status(201).json(order);
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// GET /api/orders - List user's orders
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) return;

    const { status, page = '1', limit = '20' } = req.query;
    const filter: Record<string, unknown> = {};

    if (req.user.userType === 'user') {
      filter.userId = req.user.userId;
    } else if (req.user.userType === 'captain') {
      filter.captainId = req.user.userId;
    }

    if (status) {
      filter.status = status;
    }

    const orders = await Order.find(filter)
      .populate('restaurantId', 'name nameAr imageUrl')
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
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/orders/:id - Get single order
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('restaurantId', 'name nameAr imageUrl phone')
      .populate('captainId', 'name phone avatar rating vehicleType')
      .populate('userId', 'name phone avatar');

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    res.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// PUT /api/orders/:id/status - Update order status
router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status, captainId } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const validTransitions: Record<string, string[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['preparing', 'cancelled'],
      preparing: ['ready'],
      ready: ['picked_up'],
      picked_up: ['on_the_way'],
      on_the_way: ['delivered'],
      delivered: [],
      cancelled: [],
    };

    const allowedNext = validTransitions[order.status] || [];

    if (!allowedNext.includes(status)) {
      res.status(400).json({
        error: `Cannot transition from ${order.status} to ${status}`,
      });
      return;
    }

    order.status = status;

    if (captainId) {
      order.captainId = captainId;
    }

    if (status === 'on_the_way') {
      order.estimatedDeliveryTime = new Date(Date.now() + 30 * 60 * 1000);
    }

    if (status === 'delivered') {
      order.deliveredAt = new Date();
      order.isPaid = true;
    }

    await order.save();

    // Send push notification to user
    const user = await User.findById(order.userId);
    if (user?.deviceToken) {
      const statusMessages: Record<string, { titleAr: string; bodyAr: string }> = {
        confirmed: {
          titleAr: 'تم تأكيد الطلب',
          bodyAr: 'المطعم بدأ يحضر طلبك',
        },
        preparing: {
          titleAr: 'الطلب قيد التحضير',
          bodyAr: 'المطعم عم يحضر طلبك الآن',
        },
        on_the_way: {
          titleAr: 'الكابتن في الطريق',
          bodyAr: 'طلبك عالطريق إليك',
        },
        delivered: {
          titleAr: 'تم التوصيل',
          bodyAr: 'تم توصيل طلبك بنجاح',
        },
      };

      const msg = statusMessages[status];
      if (msg) {
        await sendPushNotification({
          title: msg.titleAr,
          body: msg.bodyAr,
          data: { orderId: order._id.toString(), type: 'order_update' },
          token: user.deviceToken,
        });
      }
    }

    res.json(order);
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// POST /api/orders/:id/rate-captain
router.post('/:id/rate-captain', async (req: Request, res: Response) => {
  try {
    const { rating } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      res.status(400).json({ error: 'Rating must be between 1 and 5' });
      return;
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { captainRating: rating },
      { new: true }
    );

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    res.json(order);
  } catch (error) {
    console.error('Rate captain error:', error);
    res.status(500).json({ error: 'Failed to rate captain' });
  }
});

export default router;
