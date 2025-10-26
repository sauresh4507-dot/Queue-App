import express from 'express';
import { validate } from '../middleware/validation.js';
import ServiceModel from '../models/Service.js';

const router = express.Router();

// Create service
router.post('/', validate('createService'), async (req, res, next) => {
  try {
    const { name, description, booths, avgServiceTime } = req.validated;
    const result = await ServiceModel.createService(
      name, 
      description, 
      booths, 
      avgServiceTime
    );

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

// Get all services
router.get('/', async (req, res, next) => {
  try {
    const services = await ServiceModel.getServices();
    res.json({ data: services });
  } catch (err) {
    next(err);
  }
});

// Get single service
router.get('/:serviceId', async (req, res, next) => {
  try {
    const service = await ServiceModel.getService(req.params.serviceId);
    
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json({ data: service });
  } catch (err) {
    next(err);
  }
});

export default router;