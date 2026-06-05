import { Router, Request, Response } from 'express';
import { GroupOrder } from '../models/GroupOrder';
import { User } from '../models/User';
import { authenticate } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.use(authenticate);

// POST /api/group-orders - Create a group order
router.post('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) return;

    const { restaurantId, deliveryAddress, expiresInMinutes = 30 } = req.body;

    const code = uuidv4().slice(0, 6).toUpperCase();

    const groupOrder = await GroupOrder.create({
      hostId: req.user.userId,
      code,
      restaurantId,
      members: [],
      totalAmount: 0,
      deliveryFee: 0,
      deliveryAddress,
      expiresAt: new Date(Date.now() + expiresInMinutes * 60 * 1000),
      status: 'open',
    });

    res.status(201).json(groupOrder);
  } catch (error) {
    console.error('Create group order error:', error);
    res.status(500).json({ error: 'Failed to create group order' });
  }
});

// POST /api/group-orders/join - Join group order by code
router.post('/join', async (req: Request, res: Response) => {
  try {
    if (!req.user) return;

    const { code, items, subtotal } = req.body;

    const groupOrder = await GroupOrder.findOne({ code: code.toUpperCase() });

    if (!groupOrder) {
      res.status(404).json({ error: 'Group order not found' });
      return;
    }

    if (groupOrder.status !== 'open') {
      res.status(400).json({ error: 'Group order is no longer accepting members' });
      return;
    }

    if (new Date() > groupOrder.expiresAt) {
      res.status(400).json({ error: 'Group order has expired' });
      return;
    }

    const user = await User.findById(req.user.userId);

    groupOrder.members.push({
      userId: req.user.userId as any,
      name: user?.name || 'Unknown',
      items,
      subtotal,
      isPaid: false,
    });

    groupOrder.totalAmount += subtotal;
    await groupOrder.save();

    res.json(groupOrder);
  } catch (error) {
    console.error('Join group order error:', error);
    res.status(500).json({ error: 'Failed to join group order' });
  }
});

// GET /api/group-orders/:code - Get group order by code
router.get('/:code', async (req: Request, res: Response) => {
  try {
    const code = Array.isArray(req.params.code) ? req.params.code[0] : req.params.code;
    const groupOrder = await GroupOrder.findOne({ code: code.toUpperCase() })
      .populate('hostId', 'name avatar')
      .populate('members.userId', 'name avatar');

    if (!groupOrder) {
      res.status(404).json({ error: 'Group order not found' });
      return;
    }

    res.json(groupOrder);
  } catch (error) {
    console.error('Get group order error:', error);
    res.status(500).json({ error: 'Failed to get group order' });
  }
});

// POST /api/group-orders/:id/close - Close group order
router.post('/:id/close', async (req: Request, res: Response) => {
  try {
    if (!req.user) return;

    const groupOrder = await GroupOrder.findById(req.params.id);

    if (!groupOrder) {
      res.status(404).json({ error: 'Group order not found' });
      return;
    }

    if (groupOrder.hostId.toString() !== req.user.userId) {
      res.status(403).json({ error: 'Only the host can close this order' });
      return;
    }

    groupOrder.status = 'ordering';
    await groupOrder.save();

    res.json(groupOrder);
  } catch (error) {
    console.error('Close group order error:', error);
    res.status(500).json({ error: 'Failed to close group order' });
  }
});

export default router;
