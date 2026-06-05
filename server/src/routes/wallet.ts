import { Router, Request, Response } from 'express';
import { User } from '../models/User';
import { ShamCashTransaction } from '../models/ShamCash';
import { authenticate } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.use(authenticate);

// GET /api/wallet/balance
router.get('/balance', async (req: Request, res: Response) => {
  try {
    if (!req.user) return;

    const user = await User.findById(req.user.userId).select('shamCashBalance loyaltyPoints loyaltyTier');

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      balance: user.shamCashBalance,
      loyaltyPoints: user.loyaltyPoints,
      loyaltyTier: user.loyaltyTier,
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ error: 'Failed to get balance' });
  }
});

// GET /api/wallet/transactions
router.get('/transactions', async (req: Request, res: Response) => {
  try {
    if (!req.user) return;

    const { page = '1', limit = '20' } = req.query;

    const transactions = await ShamCashTransaction.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .skip((parseInt(page as string) - 1) * parseInt(limit as string))
      .limit(parseInt(limit as string));

    const total = await ShamCashTransaction.countDocuments({ userId: req.user.userId });

    res.json({
      transactions,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

// POST /api/wallet/charge
router.post('/charge', async (req: Request, res: Response) => {
  try {
    if (!req.user) return;

    const { amount, paymentMethod } = req.body;

    if (!amount || amount <= 0) {
      res.status(400).json({ error: 'Invalid amount' });
      return;
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const reference = `CHG-${uuidv4().slice(0, 8).toUpperCase()}`;
    const balanceBefore = user.shamCashBalance;
    const balanceAfter = balanceBefore + amount;

    const transaction = await ShamCashTransaction.create({
      userId: user._id,
      type: 'charge',
      amount,
      balanceBefore,
      balanceAfter,
      reference,
      description: `شحن المحفظة بمبلغ ${amount} ل.س`,
      status: 'completed',
      metadata: { paymentMethod },
    });

    user.shamCashBalance = balanceAfter;
    await user.save();

    res.status(201).json(transaction);
  } catch (error) {
    console.error('Charge wallet error:', error);
    res.status(500).json({ error: 'Failed to charge wallet' });
  }
});

// POST /api/wallet/withdraw
router.post('/withdraw', async (req: Request, res: Response) => {
  try {
    if (!req.user) return;

    const { amount } = req.body;

    if (!amount || amount <= 0) {
      res.status(400).json({ error: 'Invalid amount' });
      return;
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.shamCashBalance < amount) {
      res.status(400).json({ error: 'Insufficient balance' });
      return;
    }

    const reference = `WTH-${uuidv4().slice(0, 8).toUpperCase()}`;
    const balanceBefore = user.shamCashBalance;
    const balanceAfter = balanceBefore - amount;

    const transaction = await ShamCashTransaction.create({
      userId: user._id,
      type: 'withdraw',
      amount,
      balanceBefore,
      balanceAfter,
      reference,
      description: `سحب مبلغ ${amount} ل.س من المحفظة`,
      status: 'completed',
    });

    user.shamCashBalance = balanceAfter;
    await user.save();

    res.json(transaction);
  } catch (error) {
    console.error('Withdraw error:', error);
    res.status(500).json({ error: 'Failed to withdraw' });
  }
});

export default router;
