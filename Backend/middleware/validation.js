import Joi from 'joi';

const schemas = {
  joinQueue: Joi.object({
    serviceId: Joi.string().required(),
    userId: Joi.string().required()
  }),

  createService: Joi.object({
    name: Joi.string().required(),
    description: Joi.string().optional(),
    booths: Joi.number().min(1).default(1),
    avgServiceTime: Joi.number().default(300)
  })
};

export const validate = (schema) => (req, res, next) => {
  const { error, value } = schemas[schema].validate(req.body);
  
  if (error) {
    return res.status(400).json({ 
      error: error.details[0].message 
    });
  }

  req.validated = value;
  next();
};

export default validate;