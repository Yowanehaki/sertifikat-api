const express = require('express');
const router = express.Router();
const ExcelController = require('../controllers/excelController');
const upload = require('../middleware/upload');

// Upload Excel file
router.post('/upload', upload.single('excelFile'), ExcelController.uploadExcel);

// Get all certificates with filtering
router.get('/certificates', ExcelController.getCertificates);

// Get unique activities for filtering
router.get('/activities', ExcelController.getActivities);

// Generate single certificate
router.post('/generate/:id', ExcelController.generateCertificate);

// Generate multiple certificates
router.post('/generate-multiple', ExcelController.generateMultipleCertificates);

// Update certificate
router.put('/certificates/:id', ExcelController.updateCertificate);

// Delete certificate
router.delete('/certificates/:id', ExcelController.deleteCertificate);

// Download Excel template
router.get('/template', ExcelController.downloadTemplate);

module.exports = router; 