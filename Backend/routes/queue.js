import express from 'express';
import { validate } from '../middleware/validation.js';
import QueueModel from '../models/Queue.js';

const router = express.Router();

// POST /api/queue/join
router.post('/join', validate('joinQueue'), async (req, res, next) => {
  try {
    const { serviceId, userId } = req.validated;
    const result = await QueueModel.joinQueue(serviceId, userId);
    
    // Broadcast via WebSocket
    const io = req.app.get('io');
    if (io) {
      const queueStatus = await QueueModel.getQueueStatus(serviceId);
      io.to(`service:${serviceId}`).emit('queue-updated', {
        serviceId,
        queue: queueStatus,
        action: 'user-joined'
      });
    }

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    console.error('Join queue error:', err);
    res.status(500).json({ error: 'Failed to join queue' });
  }
});

// GET /api/queue/status/:serviceId
router.get('/status/:serviceId', async (req, res, next) => {
  try {
    const status = await QueueModel.getQueueStatus(req.params.serviceId);
    res.json({ data: status });
  } catch (err) {
    console.error('Get status error:', err);
    res.status(500).json({ error: 'Failed to get queue status' });
  }
});

// GET /api/queue/:entryId
router.get('/:entryId', async (req, res, next) => {
  try {
    const entry = await QueueModel.getQueuePosition(req.params.entryId);
    if (!entry) {
      return res.status(404).json({ error: 'Queue entry not found' });
    }
    res.json({ data: entry });
  } catch (err) {
    console.error('Get position error:', err);
    res.status(500).json({ error: 'Failed to get queue position' });
  }
});

// DELETE /api/queue/:entryId
router.delete('/:entryId', async (req, res, next) => {
  try {
    const entry = await QueueModel.getQueuePosition(req.params.entryId);
    if (entry) {
      await QueueModel.leaveQueue(req.params.entryId);
      
      const io = req.app.get('io');
      if (io) {
        const queueStatus = await QueueModel.getQueueStatus(entry.service_id);
        io.to(`service:${entry.service_id}`).emit('queue-updated', {
          serviceId: entry.service_id,
          queue: queueStatus,
          action: 'user-left'
        });
      }
    }
    res.json({ success: true, message: 'Left queue' });
  } catch (err) {
    console.error('Leave queue error:', err);
    res.status(500).json({ error: 'Failed to leave queue' });
  }
});

// GET /api/queue - Get all queues
router.get('/', async (req, res, next) => {
  try {
    const queues = await QueueModel.getAllQueues();
    res.json({ data: queues });
  } catch (err) {
    console.error('Get all queues error:', err);
    res.status(500).json({ error: 'Failed to get queues', details: err.message });
  }
});

export default router;