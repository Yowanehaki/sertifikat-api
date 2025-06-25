const certificateService = require('../services/certificateService');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');

class CertificateController {
  async generateCertificate(req, res) {
    try {
      const certificateData = req.validatedData || req.body;
      // Inject signaturePath from uploaded file if exists
      if (req.file) {
        certificateData.signaturePath = req.file.path;
      }
      console.log('Generating certificate with data:', certificateData);

      const result = await certificateService.createCertificate({
        ...certificateData,
        serialNumber: certificateData.serialNumber || certificateData.id,
      });

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
        // Try to find an existing PDF file matching the pattern
        const fs = require('fs');
        const pdfFiles = fs.readdirSync(pathBase).filter(f => f.endsWith('.pdf') && f.includes(certificateId));
        if (pdfFiles.length > 0) {
          // Use the most recent PDF file (by timestamp in filename)
          const sorted = pdfFiles.sort((a, b) => {
            const ta = parseInt(a.split('_')[1]);
            const tb = parseInt(b.split('_')[1]);
            return tb - ta;
          });
          const pdfFile = sorted[0];
          const pdfPath = path.join(pathBase, pdfFile);
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename=${pdfFile}`);
          const stream = fs.createReadStream(pdfPath);
          return stream.pipe(res);
        }
        // If not found, generate PDF to a temp file (fallback)
        const certificate = await certificateService.getCertificateById(certificateId);
        if (!certificate) {
          return res.status(404).json({
            success: false,
            message: 'Certificate not found'
          });
        }
        const data = {
          ...certificate,
          id: certificate.serialNumber,
          signaturePath: certificate.signaturePath
        };
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
      // Serve PNG or JPG
      if (format === 'png') {
        const pngFilename = filename.replace(/\.[^/.]+$/, '.png');
        const pngPath = path.join(pathBase, pngFilename);
        if (!fs.existsSync(pngPath)) {
          return res.status(404).json({
            success: false,
            message: 'Certificate PNG file not found'
          });
        }
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Disposition', `attachment; filename=${pngFilename}`);
        const fileStream = fs.createReadStream(pngPath);
        return fileStream.pipe(res);
      }
      if (format === 'jpg' || format === 'jpeg') {
        const jpgFilename = filename.replace(/\.[^/.]+$/, '.jpg');
        const jpgPath = path.join(pathBase, jpgFilename);
        let filePath = jpgPath;
        if (!fs.existsSync(jpgPath)) {
          // fallback to png if jpg not found
          const pngFilename = filename.replace(/\.[^/.]+$/, '.png');
          const pngPath = path.join(pathBase, pngFilename);
          if (!fs.existsSync(pngPath)) {
            return res.status(404).json({
              success: false,
              message: 'Certificate image file not found'
            });
          }
          filePath = pngPath;
        }
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Content-Disposition', `attachment; filename=${jpgFilename}`);
        const fileStream = fs.createReadStream(filePath);
        return fileStream.pipe(res);
      }
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

  async downloadZip(req, res) {
    try {
      const { filenames, type } = req.body; // filenames: array, type: 'pdf' atau 'png'
      if (!Array.isArray(filenames) || !type || !['pdf', 'png'].includes(type)) {
        return res.status(400).json({ success: false, message: 'filenames array dan type (pdf/png) wajib diisi' });
      }
      const pathBase = path.join(__dirname, '../../generated-certificates');
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename=Zip_${type.toUpperCase()}.zip`);
      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.pipe(res);
      for (const filename of filenames) {
        let filePath;
        let zipName;
        if (type === 'png') {
          filePath = path.join(pathBase, filename.replace(/\.\w+$/, '.png'));
          zipName = filename.replace(/\.\w+$/, '.png');
        } else if (type === 'pdf') {
          // Ambil file PDF yang sudah ada
          filePath = path.join(pathBase, filename.replace(/\.\w+$/, '.pdf'));
          zipName = filename.replace(/\.\w+$/, '.pdf');
        }
        if (fs.existsSync(filePath)) {
          archive.file(filePath, { name: zipName });
        }
      }
      archive.finalize();
      archive.on('end', () => {
        // Bersihkan temp PDF
        if (type === 'pdf') {
          fs.readdirSync(pathBase).forEach(f => {
            if (f.startsWith('temp_') && f.endsWith('.pdf')) {
              fs.unlinkSync(path.join(pathBase, f));
            }
          });
        }
      });
    } catch (error) {
      console.error('Error in downloadZip:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to download zip' });
    }
  }
}

module.exports = new CertificateController();