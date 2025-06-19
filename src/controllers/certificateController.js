const certificateService = require('../services/certificateService');
const path = require('path');
const fs = require('fs');

class CertificateController {
  async generateCertificate(req, res) {
    try {
      const certificateData = req.body;
      
      const result = await certificateService.createCertificate(certificateData);
      
      if (result.success) {
        res.status(201).json({
          success: true,
          message: 'Certificate generated successfully',
          data: result.data
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to generate certificate',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error in generateCertificate:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  async getAllCertificates(req, res) {
    try {
      const certificates = await certificateService.getAllCertificates();
      
      res.json({
        success: true,
        data: certificates
      });
    } catch (error) {
      console.error('Error in getAllCertificates:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch certificates',
        error: error.message
      });
    }
  }

  async getCertificateById(req, res) {
    try {
      const { id } = req.params;
      const certificate = await certificateService.getCertificateById(id);
      
      if (certificate) {
        res.json({
          success: true,
          data: certificate
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Certificate not found'
        });
      }
    } catch (error) {
      console.error('Error in getCertificateById:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch certificate',
        error: error.message
      });
    }
  }

  async downloadCertificate(req, res) {
    try {
      const { filename } = req.params;
      const filePath = path.join(__dirname, '../../generated-certificates', filename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'Certificate file not found'
        });
      }
      
      // Set headers for download
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      // Send file
      res.sendFile(filePath);
    } catch (error) {
      console.error('Error in downloadCertificate:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to download certificate',
        error: error.message
      });
    }
  }

  async deleteCertificate(req, res) {
    try {
      const { id } = req.params;
      const result = await certificateService.deleteCertificate(id);
      
      if (result.success) {
        res.json({
          success: true,
          message: 'Certificate deleted successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Certificate not found'
        });
      }
    } catch (error) {
      console.error('Error in deleteCertificate:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete certificate',
        error: error.message
      });
    }
  }
}

module.exports = new CertificateController();