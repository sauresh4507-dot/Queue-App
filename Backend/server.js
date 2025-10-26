import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import db from './config/database.js';
import queueRoutes from './routes/queue.js';
import serviceRoutes from './routes/service.js';
import { errorHandler } from './middleware/errorHandler.js';
import analyticsRoutes from './routes/analytics.js';
import adminRoutes from './routes/admin.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);

// Store io instance for use in routes
app.set('io', io);

// Initialize database
await db.initialize();

// Seed sample data
async function initSampleData() {
  try {
    const existingServices = await db.all('SELECT * FROM services LIMIT 1');
    
    if (existingServices.length === 0) {
      await db.run(
        `INSERT INTO services (id, name, description, booths, avg_service_time) 
         VALUES (?, ?, ?, ?, ?)`,
        ['canteen', 'Campus Canteen', 'Food and beverages', 2, 300]
      );

      await db.run(
        `INSERT INTO services (id, name, description, booths, avg_service_time) 
         VALUES (?, ?, ?, ?, ?)`,
        ['counseling', 'Counseling Service', 'Student counseling', 1, 900]
      );

      console.log('✓ Sample services created');
    }
  } catch (err) {
    console.error('Sample data error:', err);
  }
}

await initSampleData();

// WebSocket Events
io.on('connection', (socket) => {
  console.log(`✓ User connected: ${socket.id}`);

  // User joins a service room
  socket.on('join-service', (serviceId) => {
    socket.join(`service:${serviceId}`);
    console.log(`✓ User ${socket.id} joined service:${serviceId}`);
  });

  // User leaves a service room
  socket.on('leave-service', (serviceId) => {
    socket.leave(`service:${serviceId}`);
    console.log(`✓ User ${socket.id} left service:${serviceId}`);
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`✗ User disconnected: ${socket.id}`);
  });
});

// Export io for routes
export function getIO() {
  return io;
}

// API Routes
app.use('/api/queue', queueRoutes);
app.use('/api/services', serviceRoutes);

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Backend API with WebSocket is running'
  });
});

// Error handling middleware
app.use(errorHandler);

httpServer.listen(PORT, () => {
  console.log(`\n🚀 Backend Server with WebSocket running at http://localhost:${PORT}`);
  console.log(`📊 API: http://localhost:${PORT}/api`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  console.log(`⚠️  Frontend runs separately on port 5173\n`);
});