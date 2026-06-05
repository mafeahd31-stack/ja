import { Router, Request, Response } from 'express';
import { Review } from '../models/Review';
import { Restaurant } from '../models/Restaurant';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// POST /api/reviews - Create a review
router.post('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) return;

    const { restaurantId, orderId, rating, comment, commentAr, images } = req.body;

    if (!restaurantId || !orderId || !rating) {
      res.status(400).json({ error: 'Restaurant, order, and rating are required' });
      return;
    }

    if (rating < 1 || rating > 5) {
      res.status(400).json({ error: 'Rating must be between 1 and 5' });
      return;
    }

    // Check if already reviewed
    const existing = await Review.findOne({ orderId });
    if (existing) {
      res.status(400).json({ error: 'Order already reviewed' });
      return;
    }

    const review = await Review.create({
      userId: req.user.userId,
      restaurantId,
      orderId,
      rating,
      comment: comment || '',
      commentAr: commentAr || '',
      images: images || [],
      isApproved: false, // Requires moderation
    });

    // Update restaurant rating
    const allReviews = await Review.find({ restaurantId, isApproved: true });
    const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0) + rating;
    const totalCount = allReviews.length + 1;

    await Restaurant.findByIdAndUpdate(restaurantId, {
      rating: Math.round((totalRating / totalCount) * 10) / 10,
      ratingCount: totalCount,
    });

    res.status(201).json(review);
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// GET /api/reviews/restaurant/:restaurantId
router.get('/restaurant/:restaurantId', async (req: Request, res: Response) => {
  try {
    const reviews = await Review.find({
      restaurantId: req.params.restaurantId,
      isApproved: true,
    })
      .populate('userId', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json(reviews);
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Failed to get reviews' });
  }
});

export default router;
