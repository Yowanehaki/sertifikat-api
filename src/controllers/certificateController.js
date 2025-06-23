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
      const pathBase = path.join(__dirname, '../../generated-certificates');
      // Extract certificate id from filename (assume last part before extension)
      const certificateId = filename.split('_').pop().replace(/\.[^/.]+$/, '');

      if (format === 'pdf') {
        // Fetch certificate data from DB
        const certificate = await certificateService.getCertificateById(certificateId);
        if (!certificate) {
          return res.status(404).json({
            success: false,
            message: 'Certificate not found'
          });
        }
        // Prepare data for PDF generation
        const data = {
          ...certificate,
          id: certificate.serialNumber, // pastikan id = serialNumber (ID input user)
          signaturePath: certificate.signaturePath // gunakan path asli, jangan di-join
        };
        // Generate PDF to a temp file
        const puppeteer = require('../utils/puppeteer');
        const tempPdfPath = path.join(pathBase, `temp_${Date.now()}_${certificateId}.pdf`);
        const pdfResult = await puppeteer.generateCertificatePDF(data, tempPdfPath);
        if (!pdfResult.success) {
          return res.status(500).json({
            success: false,
            message: 'Failed to generate PDF',
            error: pdfResult.error
          });
        }
        // Stream PDF and cleanup temp file
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=certificate_${certificateId}.pdf`);
        const stream = fs.createReadStream(tempPdfPath);
        stream.pipe(res);
        stream.on('close', () => {
          fs.unlink(tempPdfPath, () => {});
        });
        stream.on('error', () => {
          fs.unlink(tempPdfPath, () => {});
        });
        return;
      }
      // Default: serve pre-generated JPG (for both png and jpg request)
      const jpgFilename = filename.replace(/\.[^/.]+$/, '.jpg');
      const filePath = path.join(pathBase, jpgFilename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'Certificate file not found'
        });
      }
      // Always serve as image/jpeg, even if format=png
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Content-Disposition', `attachment; filename=${jpgFilename}`);
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