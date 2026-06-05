import { Router, Request, Response } from 'express';
import { SupportNumber } from '../models/SupportNumber';

const router = Router();

router.get('/active', async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

    const numbers = await SupportNumber.find({
      isActive: true,
      daysOfWeek: dayOfWeek,
      workStart: { $lte: currentTime },
      workEnd: { $gte: currentTime },
    }).sort({ createdAt: 1 });

    res.json(numbers);
  } catch (error) {
    console.error('Get active support numbers error:', error);
    res.status(500).json({ error: 'Failed to get support numbers' });
  }
});

export default router;
