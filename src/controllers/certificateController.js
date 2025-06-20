const certificateService = require('../services/certificateService');
const path = require('path');
const fs = require('fs');

class CertificateController {
  async generateCertificate(req, res) {
    try {
      const certificateData = req.validatedData || req.body;
      // Inject signaturePath from uploaded file if exists
      if (req.file) {
        certificateData.signaturePath = req.file.path;
      }
      console.log('Generating certificate with data:', certificateData);

      const result = await certificateService.createCertificate(certificateData);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error
        });
      }

      res.status(201).json({
        success: true,
        message: 'Certificate generated successfully',
        data: result.data
      });
    } catch (error) {
      console.error('Certificate generation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate certificate',
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
      const format = req.query.format || 'pdf';
      
      let targetFilename = filename;
      if (format === 'pdf') {
        targetFilename = filename.replace(/\.[^/.]+$/, '.pdf');
      }

      const filePath = path.join(__dirname, '../../generated-certificates', targetFilename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'Certificate file not found'
        });
      }
      
      // Set appropriate content type
      const contentType = format === 'pdf' ? 'application/pdf' : 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${targetFilename}"`);
      
      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
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