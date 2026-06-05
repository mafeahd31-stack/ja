import { Router, Request, Response } from 'express';
import { Coupon } from '../models/Coupon';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// POST /api/coupons/validate
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { code, subtotal, restaurantId } = req.body;

    if (!code) {
      res.status(400).json({ error: 'Coupon code is required' });
      return;
    }

    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true,
      expiresAt: { $gt: new Date() },
    });

    if (!coupon) {
      res.status(400).json({ error: 'كوبون غير صالح أو منتهي الصلاحية' });
      return;
    }

    if (coupon.usedCount >= coupon.maxUses) {
      res.status(400).json({ error: 'تم استخدام هذا الكوبون لأقصى عدد مرات' });
      return;
    }

    if (req.user && coupon.usedBy.includes(req.user.userId as any)) {
      res.status(400).json({ error: 'لقد استخدمت هذا الكوبون من قبل' });
      return;
    }

    if (subtotal < coupon.minOrder) {
      res.status(400).json({
        error: `الحد الأدنى للطلب: ${coupon.minOrder} ل.س`,
        minOrder: coupon.minOrder,
      });
      return;
    }

    if (coupon.restaurantId && restaurantId) {
      if (coupon.restaurantId.toString() !== restaurantId) {
        res.status(400).json({ error: 'هذا الكوبون غير صالح لهذا المطعم' });
        return;
      }
    }

    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = (subtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscount) {
        discount = Math.min(discount, coupon.maxDiscount);
      }
    } else {
      discount = coupon.discountValue;
    }

    res.json({
      valid: true,
      coupon: {
        code: coupon.code,
        description: coupon.descriptionAr,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discount,
      },
    });
  } catch (error) {
    console.error('Validate coupon error:', error);
    res.status(500).json({ error: 'Failed to validate coupon' });
  }
});

// GET /api/coupons/available
router.get('/available', async (req: Request, res: Response) => {
  try {
    const coupons = await Coupon.find({
      isActive: true,
      expiresAt: { $gt: new Date() },
    })
      .select('code description descriptionAr discountType discountValue minOrder maxDiscount expiresAt')
      .limit(20);

    res.json(coupons);
  } catch (error) {
    console.error('Get available coupons error:', error);
    res.status(500).json({ error: 'Failed to get coupons' });
  }
});

export default router;
