import { Router, Request, Response } from 'express';
import { Captain } from '../models/Captain';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /api/captains/nearby - Find nearby captains
router.get('/nearby', async (req: Request, res: Response) => {
  try {
    const { lat, lng, maxDistance = 5000 } = req.query;

    if (!lat || !lng) {
      res.status(400).json({ error: 'Latitude and longitude are required' });
      return;
    }

    const captains = await Captain.find({
      isOnline: true,
      isActive: true,
      currentLocation: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng as string), parseFloat(lat as string)],
          },
          $maxDistance: parseInt(maxDistance as string),
        },
      },
    }).select('name avatar rating vehicleType currentLocation completedOrders');

    res.json(captains);
  } catch (error) {
    console.error('Get nearby captains error:', error);
    res.status(500).json({ error: 'Failed to find nearby captains' });
  }
});

// PUT /api/captains/location - Update captain location
router.put('/location', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.userType !== 'captain') {
      res.status(403).json({ error: 'Only captains can update location' });
      return;
    }

    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      res.status(400).json({ error: 'Latitude and longitude are required' });
      return;
    }

    const captain = await Captain.findByIdAndUpdate(
      req.user.userId,
      {
        $set: {
          currentLocation: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
        },
      },
      { new: true }
    );

    if (!captain) {
      res.status(404).json({ error: 'Captain not found' });
      return;
    }

    res.json({ location: captain.currentLocation });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// PUT /api/captains/toggle-online - Toggle online status
router.put('/toggle-online', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.userType !== 'captain') {
      res.status(403).json({ error: 'Only captains can toggle online status' });
      return;
    }

    const captain = await Captain.findById(req.user.userId);
    if (!captain) {
      res.status(404).json({ error: 'Captain not found' });
      return;
    }

    captain.isOnline = !captain.isOnline;
    await captain.save();

    res.json({ isOnline: captain.isOnline });
  } catch (error) {
    console.error('Toggle online error:', error);
    res.status(500).json({ error: 'Failed to toggle online status' });
  }
});

// PUT /api/captains/affiliate - Affiliate with a restaurant
router.put('/affiliate', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.userType !== 'captain') {
      res.status(403).json({ error: 'Only captains can affiliate' });
      return;
    }

    const { restaurantId, homeLat, homeLng } = req.body;

    if (!restaurantId) {
      res.status(400).json({ error: 'Restaurant ID is required' });
      return;
    }

    const captain = await Captain.findByIdAndUpdate(
      req.user.userId,
      {
        affiliatedRestaurantId: restaurantId,
        ...(homeLat && homeLng
          ? {
              homeLocation: {
                type: 'Point',
                coordinates: [homeLng, homeLat],
              },
            }
          : {}),
      },
      { new: true }
    ).populate('affiliatedRestaurantId', 'name nameAr latitude longitude freeDeliveryRadius');

    if (!captain) {
      res.status(404).json({ error: 'Captain not found' });
      return;
    }

    res.json(captain);
  } catch (error) {
    console.error('Affiliate captain error:', error);
    res.status(500).json({ error: 'Failed to affiliate with restaurant' });
  }
});

// PUT /api/captains/home-location - Set captain's home location
router.put('/home-location', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.userType !== 'captain') {
      res.status(403).json({ error: 'Only captains can set home location' });
      return;
    }

    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      res.status(400).json({ error: 'Latitude and longitude are required' });
      return;
    }

    const captain = await Captain.findByIdAndUpdate(
      req.user.userId,
      {
        homeLocation: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
      },
      { new: true }
    );

    if (!captain) {
      res.status(404).json({ error: 'Captain not found' });
      return;
    }

    res.json({ homeLocation: captain.homeLocation });
  } catch (error) {
    console.error('Set home location error:', error);
    res.status(500).json({ error: 'Failed to set home location' });
  }
});

// GET /api/captains/restaurant-captains/:restaurantId - Get captains for a restaurant
router.get('/restaurant-captains/:restaurantId', authenticate, async (req: Request, res: Response) => {
  try {
    const captains = await Captain.find({
      affiliatedRestaurantId: req.params.restaurantId,
      isBanned: false,
    }).select('name phone avatar rating vehicleType isOnline homeLocation commissionRate');

    res.json(captains);
  } catch (error) {
    console.error('Get restaurant captains error:', error);
    res.status(500).json({ error: 'Failed to get restaurant captains' });
  }
});

export default router;
