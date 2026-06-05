import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import { connectDB } from './config/db';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';

// Routes
import authRoutes from './routes/auth';
import restaurantRoutes from './routes/restaurants';
import orderRoutes from './routes/orders';
import walletRoutes from './routes/wallet';
import groupOrderRoutes from './routes/groupOrders';
import couponRoutes from './routes/coupons';
import reviewRoutes from './routes/reviews';
import notificationRoutes from './routes/notifications';
import captainRoutes from './routes/captains';
import adminRoutes from './routes/admin';
import uploadRoutes from './routes/upload';
import chatRoutes from './routes/chat';
import supportRoutes from './routes/support';

const app = express();
const server = http.createServer(app);

// Socket.IO for real-time tracking
const io = new SocketServer(server, {
  cors: {
    origin: env.corsOrigin,
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(helmet());
app.use(cors({ origin: env.corsOrigin }));
app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Security
import { securityHeaders, checkBanned } from './middleware/security';
app.use(securityHeaders);
app.use('/api', checkBanned);

// Rate limiting
const limiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.maxRequests,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api/auth', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/group-orders', groupOrderRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/captains', captainRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/support', supportRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Error handler
app.use(errorHandler);

// Socket.IO - Real-time order tracking & chat
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Order tracking
  socket.on('join-order', (orderId: string) => {
    socket.join(`order:${orderId}`);
    console.log(`Socket ${socket.id} joined order:${orderId}`);
  });

  socket.on('leave-order', (orderId: string) => {
    socket.leave(`order:${orderId}`);
  });

  socket.on('captain-location-update', (data: { orderId: string; lat: number; lng: number }) => {
    io.to(`order:${data.orderId}`).emit('captain-location', {
      lat: data.lat,
      lng: data.lng,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on('order-status-update', (data: { orderId: string; status: string }) => {
    io.to(`order:${data.orderId}`).emit('order-status-changed', {
      orderId: data.orderId,
      status: data.status,
      timestamp: new Date().toISOString(),
    });
  });

  // Chat
  socket.on('join-chat', (orderId: string) => {
    socket.join(`chat:${orderId}`);
    console.log(`Socket ${socket.id} joined chat:${orderId}`);
  });

  socket.on('leave-chat', (orderId: string) => {
    socket.leave(`chat:${orderId}`);
  });

  socket.on('typing', (data: { orderId: string; userId: string; isTyping: boolean }) => {
    socket.to(`chat:${data.orderId}`).emit('user-typing', {
      userId: data.userId,
      isTyping: data.isTyping,
    });
  });

  socket.on('mark-read', async (data: { orderId: string; userId: string }) => {
    io.to(`chat:${data.orderId}`).emit('messages-read', {
      orderId: data.orderId,
      userId: data.userId,
      readAt: new Date().toISOString(),
    });
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Start server
async function start() {
  await connectDB();

  server.listen(env.port, () => {
    console.log(`
    ╔═══════════════════════════════════════╗
    ║     جايـكم - Jaykom API Server        ║
    ║     Port: ${env.port}                         ║
    ║     Mode: ${env.nodeEnv.padEnd(20)}║
    ║     Socket.IO: Ready                   ║
    ╚═══════════════════════════════════════╝
    `);
  });
}

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export { app, server, io };
