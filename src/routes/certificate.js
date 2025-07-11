const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificateController');
const { validateCertificate } = require('../middleware/validation');
const upload = require('../middleware/upload');

// Generate new certificate
router.post('/', upload.single('signaturePath'), validateCertificate, certificateController.generateCertificate);

// Get all certificates
router.get('/', certificateController.getAllCertificates);

// Get single certificate
router.get('/:id', certificateController.getCertificateById);

// Download certificate
router.get('/download/:filename', certificateController.downloadCertificate);

// Download zip of certificates (PNG/PDF)
router.post('/download-zip', certificateController.downloadZip);

// Delete certificate
router.delete('/:id', certificateController.deleteCertificate);

module.exports = router;