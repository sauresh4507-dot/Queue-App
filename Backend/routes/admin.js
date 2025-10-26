import express from 'express';
import QueueModel from '../models/Queue.js';
import AnalyticsModel from '../models/Analytics.js';

const router = express.Router();

// Serve next customer in queue
router.post('/serve-next/:serviceId', async (req, res, next) => {
  try {
    const served = await QueueModel.serveNext(req.params.serviceId);
    
    // Log analytics event
    const queueStatus = await QueueModel.getQueueStatus(req.params.serviceId);
    await AnalyticsModel.logEvent(
      req.params.serviceId,
      'customer-served',
      queueStatus.queueLength,
      queueStatus.avgWaitTime
    );

    // Broadcast to all connected clients
    const io = req.app.get('io');
    if (io) {
      io.to(`service:${req.params.serviceId}`).emit('queue-updated', {
        serviceId: req.params.serviceId,
        queue: queueStatus,
        action: 'customer-served',
        servedUser: served
      });
    }

    res.json({ success: true, data: served });
  } catch (err) {
    next(err);
  }
});

// Clear completed queue
router.post('/clear-served/:serviceId', async (req, res, next) => {
  try {
    const cleared = await QueueModel.clearServed(req.params.serviceId);
    
    const queueStatus = await QueueModel.getQueueStatus(req.params.serviceId);
    
    // Broadcast update
    const io = req.app.get('io');
    if (io) {
      io.to(`service:${req.params.serviceId}`).emit('queue-updated', {
        serviceId: req.params.serviceId,
        queue: queueStatus,
        action: 'cleared-served'
      });
    }

    res.json({ success: true, cleared });
  } catch (err) {
    next(err);
  }
});

// Get queue details (waiting + served)
router.get('/queue-details/:serviceId', async (req, res, next) => {
  try {
    const details = await QueueModel.getQueueDetails(req.params.serviceId);
    res.json({ data: details });
  } catch (err) {
    next(err);
  }
});

// Get service statistics
router.get('/service-stats/:serviceId', async (req, res, next) => {
  try {
    const analytics = await AnalyticsModel.getServiceAnalytics(req.params.serviceId);
    res.json({ data: analytics });
  } catch (err) {
    next(err);
  }
});

export default router;