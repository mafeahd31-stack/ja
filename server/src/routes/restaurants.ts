import { Router, Request, Response } from 'express';
import { Restaurant } from '../models/Restaurant';
import { Review } from '../models/Review';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /api/restaurants - List nearby restaurants
router.get('/', async (req: Request, res: Response) => {
  try {
    const { lat, lng, cuisine, search, featured } = req.query;

    const filter: Record<string, unknown> = {};

    if (featured === 'true') {
      filter.isFeatured = true;
    }

    if (cuisine) {
      filter.cuisine = { $in: [cuisine] };
    }

    if (search) {
      const searchRegex = new RegExp(search as string, 'i');
      filter.$or = [{ name: searchRegex }, { nameAr: searchRegex }];
    }

    // Nearby query if coordinates provided
    if (lat && lng) {
      const restaurants = await Restaurant.aggregate([
        { $match: filter },
        {
          $addFields: {
            distance: {
              $sqrt: {
                $add: [
                  { $pow: [{ $subtract: ['$latitude', parseFloat(lat as string)] }, 2] },
                  { $pow: [{ $subtract: ['$longitude', parseFloat(lng as string)] }, 2] },
                ],
              },
            },
          },
        },
        { $sort: { distance: 1 } },
        { $limit: 50 },
      ]);

      res.json(restaurants);
      return;
    }

    const restaurants = await Restaurant.find(filter)
      .sort({ isFeatured: -1, rating: -1 })
      .limit(50);

    res.json(restaurants);
  } catch (error) {
    console.error('Get restaurants error:', error);
    res.status(500).json({ error: 'Failed to fetch restaurants' });
  }
});

// GET /api/restaurants/:id - Single restaurant with menu
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant not found' });
      return;
    }

    res.json(restaurant);
  } catch (error) {
    console.error('Get restaurant error:', error);
    res.status(500).json({ error: 'Failed to fetch restaurant' });
  }
});

// GET /api/restaurants/:id/reviews
router.get('/:id/reviews', async (req: Request, res: Response) => {
  try {
    const reviews = await Review.find({ restaurantId: req.params.id, isApproved: true })
      .populate('userId', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json(reviews);
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// PUT /api/restaurants/:id/toggle - Toggle open/close (owner only)
router.put('/:id/toggle', authenticate, async (req: Request, res: Response) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant not found' });
      return;
    }

    if (restaurant.isBanned) {
      res.status(403).json({ error: 'المطعم محظور. غير مسموح بتغيير الحالة' });
      return;
    }

    restaurant.isOpen = !restaurant.isOpen;
    await restaurant.save();

    res.json({ isOpen: restaurant.isOpen });
  } catch (error) {
    console.error('Toggle restaurant error:', error);
    res.status(500).json({ error: 'Failed to toggle status' });
  }
});

// PUT /api/restaurants/:id/delivery-zones - Update delivery zones
router.put('/:id/delivery-zones', authenticate, async (req: Request, res: Response) => {
  try {
    const { freeDeliveryRadius, deliveryZones } = req.body;

    const updateData: Record<string, unknown> = {};

    if (freeDeliveryRadius !== undefined) {
      updateData.freeDeliveryRadius = freeDeliveryRadius;
    }

    if (deliveryZones !== undefined) {
      updateData.deliveryZones = deliveryZones;
    }

    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    ).select('freeDeliveryRadius deliveryZones');

    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant not found' });
      return;
    }

    res.json(restaurant);
  } catch (error) {
    console.error('Update delivery zones error:', error);
    res.status(500).json({ error: 'Failed to update delivery zones' });
  }
});

// GET /api/restaurants/:id/delivery-info - Get delivery info (zones + rules)
router.get('/:id/delivery-info', async (req: Request, res: Response) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id)
      .select('latitude longitude freeDeliveryRadius deliveryZones deliveryFee minOrder');

    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant not found' });
      return;
    }

    const DeliveryRule = require('../models/DeliveryRule').DeliveryRule;
    const rules = await DeliveryRule.find({ isActive: true })
      .sort({ priority: -1, minDistanceKm: 1 });

    res.json({
      restaurant: {
        latitude: restaurant.latitude,
        longitude: restaurant.longitude,
        freeDeliveryRadius: restaurant.freeDeliveryRadius,
        deliveryZones: restaurant.deliveryZones,
        baseDeliveryFee: restaurant.deliveryFee,
        minOrder: restaurant.minOrder,
      },
      rules,
    });
  } catch (error) {
    console.error('Get delivery info error:', error);
    res.status(500).json({ error: 'Failed to get delivery info' });
  }
});

export default router;
