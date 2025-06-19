const Joi = require('joi');

const certificateSchema = Joi.object({
  participantName: Joi.string().min(2).max(100).required(),
  activity: Joi.string().min(2).max(200).required(),
  dateIssued: Joi.date().required(),
  examinerName: Joi.string().min(2).max(100).required(),
  examinerPosition: Joi.string().min(2).max(100).required(),
  companyCode: Joi.string().min(2).max(50).required()
});

const validateCertificate = (req, res, next) => {
  const { error } = certificateSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(detail => ({
        field: detail.path[0],
        message: detail.message
      }))
    });
  }
  
  next();
};

module.exports = {
  validateCertificate
};