const Joi = require('joi');

const certificateSchema = Joi.object({
  id: Joi.string().required().messages({
    'string.empty': 'ID Sertifikat harus diisi',
    'any.required': 'ID Sertifikat wajib diisi'
  }),
  participantName: Joi.string().required().messages({
    'string.empty': 'Nama Peserta harus diisi',
    'any.required': 'Nama Peserta wajib diisi'
  }),
  activity: Joi.string().required().messages({
    'string.empty': 'Aktivitas harus diisi',
    'any.required': 'Aktivitas wajib diisi'
  }),
  dateIssued: Joi.date().iso().required().messages({
    'date.base': 'Format tanggal tidak valid',
    'any.required': 'Tanggal wajib diisi'
  }),
  examinerName: Joi.string().required().messages({
    'string.empty': 'Nama Examiner harus diisi',
    'any.required': 'Nama Examiner wajib diisi'
  }),
  examinerPosition: Joi.string().required().messages({
    'string.empty': 'Jabatan harus diisi',
    'any.required': 'Jabatan wajib diisi'
  }),
  companyCode: Joi.string().required().messages({
    'string.empty': 'Kode Perusahaan harus diisi',
    'any.required': 'Kode Perusahaan wajib diisi'
  }),
  signaturePath: Joi.any().optional()
});

const validateCertificate = (req, res, next) => {
  const { error, value } = certificateSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(err => ({
        field: err.path[0],
        message: err.message
      }))
    });
  }

  req.validatedData = value;
  next();
};

module.exports = {
  validateCertificate
};