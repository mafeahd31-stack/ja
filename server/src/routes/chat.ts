import { Router, Request, Response } from 'express';
import { Chat } from '../models/Chat';
import { Order } from '../models/Order';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// POST /api/chat/:orderId/init - Initialize or get chat for an order
router.post('/:orderId/init', async (req: Request, res: Response) => {
  try {
    if (!req.user) return;

    const order = await Order.findById(req.params.orderId);

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    // Validate user is part of this conversation
    const isUser = order.userId.toString() === req.user.userId;
    const isCaptain = order.captainId?.toString() === req.user.userId;

    if (!isUser && !isCaptain) {
      res.status(403).json({ error: 'Not authorized for this chat' });
      return;
    }

    let chat = await Chat.findOne({ orderId: req.params.orderId });

    if (!chat) {
      chat = await Chat.create({
        orderId: req.params.orderId,
        userId: order.userId,
        captainId: order.captainId,
        restaurantId: order.restaurantId,
        messages: [],
        isActive: true,
      });
    }

    res.json(chat);
  } catch (error) {
    console.error('Init chat error:', error);
    res.status(500).json({ error: 'Failed to initialize chat' });
  }
});

// POST /api/chat/:orderId/message - Send a message
router.post('/:orderId/message', async (req: Request, res: Response) => {
  try {
    if (!req.user) return;

    const { content, type, fileUrl, filePublicId, fileName, fileSize, duration } = req.body;

    const chat = await Chat.findOne({ orderId: req.params.orderId });

    if (!chat) {
      res.status(404).json({ error: 'Chat not found. Initialize chat first.' });
      return;
    }

    const order = await Order.findById(req.params.orderId);
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const isUser = order.userId.toString() === req.user.userId;
    const isCaptain = order.captainId?.toString() === req.user.userId;

    if (!isUser && !isCaptain) {
      res.status(403).json({ error: 'Not authorized to send message' });
      return;
    }

    const message = {
      senderType: isUser ? 'user' as const : 'captain' as const,
      senderId: req.user.userId as any,
      type: type || 'text',
      content: content || '',
      fileUrl,
      filePublicId,
      fileName,
      fileSize,
      duration,
      isRead: false,
      createdAt: new Date(),
    };

    chat.messages.push(message);
    chat.lastMessage = {
      content: content || (type === 'image' ? '📷 صورة' : type === 'voice' ? '🎤 رسالة صوتية' : type === 'video' ? '🎬 فيديو' : ''),
      type: type || 'text',
      senderType: isUser ? 'user' : 'captain',
      createdAt: new Date(),
    };

    await chat.save();

    // Emit socket event if available
    const { io } = require('../index');
    if (io) {
      io.to(`chat:${req.params.orderId}`).emit('new-message', {
        orderId: req.params.orderId,
        message: chat.messages[chat.messages.length - 1],
      });
    }

    res.status(201).json(chat.messages[chat.messages.length - 1]);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// GET /api/chat/:orderId/messages - Get messages for an order
router.get('/:orderId/messages', async (req: Request, res: Response) => {
  try {
    if (!req.user) return;

    const chat = await Chat.findOne({ orderId: req.params.orderId });

    if (!chat) {
      res.json({ messages: [], total: 0 });
      return;
    }

    // Mark messages as read if other user reads them
    const order = await Order.findById(req.params.orderId);
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const isUser = order.userId.toString() === req.user.userId;
    const isCaptain = order.captainId?.toString() === req.user.userId;

    if (!isUser && !isCaptain) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    // Mark messages as read
    let unreadCount = 0;
    chat.messages.forEach((msg) => {
      if (!msg.isRead && msg.senderType !== (isUser ? 'user' : 'captain')) {
        msg.isRead = true;
        msg.readAt = new Date();
      }
      if (!msg.isRead) unreadCount++;
    });

    if (unreadCount > 0) {
      await chat.save();
    }

    res.json({
      messages: chat.messages,
      total: chat.messages.length,
      unreadCount,
      chatId: chat._id,
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// GET /api/chat/unread - Get unread chat count for user/captain
router.get('/unread', async (req: Request, res: Response) => {
  try {
    if (!req.user) return;

    const filter: Record<string, unknown> = {};

    if (req.user.userType === 'user') {
      filter.userId = req.user.userId;
    } else if (req.user.userType === 'captain') {
      filter.captainId = req.user.userId;
    }

    const chats = await Chat.find(filter).select('messages lastMessage orderId');

    let totalUnread = 0;
    const unreadPerOrder: Record<string, number> = {};

    chats.forEach((chat) => {
      const unread = chat.messages.filter((m) => !m.isRead).length;
      if (unread > 0) {
        totalUnread += unread;
        unreadPerOrder[chat.orderId.toString()] = unread;
      }
    });

    res.json({ totalUnread, unreadPerOrder });
  } catch (error) {
    console.error('Get unread error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// DELETE /api/chat/:orderId - Delete chat (manual cleanup)
router.delete('/:orderId', async (req: Request, res: Response) => {
  try {
    if (!req.user) return;

    const chat = await Chat.findOneAndDelete({ orderId: req.params.orderId });

    if (!chat) {
      res.status(404).json({ error: 'Chat not found' });
      return;
    }

    res.json({ message: 'Chat deleted successfully' });
  } catch (error) {
    console.error('Delete chat error:', error);
    res.status(500).json({ error: 'Failed to delete chat' });
  }
});

export default router;
