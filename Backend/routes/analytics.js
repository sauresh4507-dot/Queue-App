import express from 'express';
import AnalyticsModel from '../models/Analytics.js';

const router = express.Router();

// GET /api/analytics/:serviceId
router.get('/:serviceId', async (req, res, next) => {
  try {
    const analytics = await AnalyticsModel.getServiceAnalytics(req.params.serviceId);
    res.json({ data: analytics });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics
router.get('/', async (req, res, next) => {
  try {
    const allAnalytics = await AnalyticsModel.getAllAnalytics();
    res.json({ data: allAnalytics });
  } catch (err) {
    next(err);
  }
});

// POST /api/analytics/log-event
router.post('/log-event', async (req, res, next) => {
  try {
    const { serviceId, eventType, queueLength, avgWaitTime } = req.body;
    const id = await AnalyticsModel.logEvent(serviceId, eventType, queueLength, avgWaitTime);
    res.json({ data: { id } });
  } catch (err) {
    next(err);
  }
});

export default router;