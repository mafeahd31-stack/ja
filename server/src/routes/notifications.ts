import { Router, Request, Response } from 'express';
import { Notification } from '../models/Notification';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// GET /api/notifications
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) return;

    const { page = '1', limit = '20' } = req.query;

    const notifications = await Notification.find({
      userId: req.user.userId,
      userType: req.user.userType,
    })
      .sort({ createdAt: -1 })
      .skip((parseInt(page as string) - 1) * parseInt(limit as string))
      .limit(parseInt(limit as string));

    const unreadCount = await Notification.countDocuments({
      userId: req.user.userId,
      userType: req.user.userType,
      isRead: false,
    });

    const total = await Notification.countDocuments({
      userId: req.user.userId,
      userType: req.user.userType,
    });

    res.json({
      notifications,
      unreadCount,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', async (req: Request, res: Response) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    res.json(notification);
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// PUT /api/notifications/read-all
router.put('/read-all', async (req: Request, res: Response) => {
  try {
    if (!req.user) return;

    await Notification.updateMany(
      {
        userId: req.user.userId,
        userType: req.user.userType,
        isRead: false,
      },
      { isRead: true }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// DELETE /api/notifications/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);

    if (!notification) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

export default router;
