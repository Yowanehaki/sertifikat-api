const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificateController');
const { validateCertificate } = require('../middleware/validation');

// Generate new certificate
router.post('/', validateCertificate, certificateController.generateCertificate);

// Get all certificates
router.get('/', certificateController.getAllCertificates);

// Get single certificate
router.get('/:id', certificateController.getCertificateById);

// Download certificate
router.get('/download/:filename', certificateController.downloadCertificate);

// Delete certificate
router.delete('/:id', certificateController.deleteCertificate);

module.exports = router;