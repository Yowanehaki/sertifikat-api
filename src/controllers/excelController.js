const ExcelService = require('../services/excelService');
const path = require('path');
const fs = require('fs');

class ExcelController {
  /**
   * Upload Excel file and process participants
   */
  static async uploadExcel(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'File Excel tidak ditemukan'
        });
      }

      const filePath = req.file.path;
      const fileExtension = path.extname(req.file.originalname).toLowerCase();
      
      // Validate file extension
      if (!['.xlsx', '.xls'].includes(fileExtension)) {
        // Delete uploaded file
        fs.unlinkSync(filePath);
        return res.status(400).json({
          success: false,
          message: 'File harus berformat Excel (.xlsx atau .xls)'
        });
      }

      // Parse Excel file
      const participants = ExcelService.parseExcelFile(filePath);
      
      if (participants.length === 0) {
        fs.unlinkSync(filePath);
        return res.status(400).json({
          success: false,
          message: 'Tidak ada data peserta yang valid dalam file Excel'
        });
      }

      // Save to database
      const savedCertificates = await ExcelService.saveParticipantsToDatabase(participants);

      // Clean up uploaded file
      fs.unlinkSync(filePath);

      res.json({
        success: true,
        message: `Berhasil mengupload ${savedCertificates.length} peserta`,
        data: {
          totalUploaded: savedCertificates.length,
          certificates: savedCertificates
        }
      });

    } catch (error) {
      console.error('Upload Excel error:', error);
      
      // Clean up file if exists
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.error('Error cleaning up file:', cleanupError);
        }
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Terjadi kesalahan saat memproses file Excel'
      });
    }
  }

  /**
   * Get all certificates with filtering
   */
  static async getCertificates(req, res) {
    try {
      const { activity, participantName } = req.query;
      const filters = {};
      
      if (activity) filters.activity = activity;
      if (participantName) filters.participantName = participantName;

      const certificates = await ExcelService.getCertificates(filters);

      res.json({
        success: true,
        data: certificates
      });

    } catch (error) {
      console.error('Get certificates error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Terjadi kesalahan saat mengambil data sertifikat'
      });
    }
  }

  /**
   * Get unique activities for filtering
   */
  static async getActivities(req, res) {
    try {
      const activities = await ExcelService.getUniqueActivities();

      res.json({
        success: true,
        data: activities
      });

    } catch (error) {
      console.error('Get activities error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Terjadi kesalahan saat mengambil data kegiatan'
      });
    }
  }

  /**
   * Generate single certificate
   */
  static async generateCertificate(req, res) {
    try {
      const { id } = req.params;
      // Get certificate data
      let certificateArr = await ExcelService.getCertificates({ id });
      if (!certificateArr || certificateArr.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Sertifikat tidak ditemukan'
        });
      }
      let certificate = certificateArr[0];
      // Update data jika ada input baru
      const updateData = {};
      if (req.body.dateIssued) updateData.dateIssued = req.body.dateIssued;
      if (req.body.examinerName) updateData.examinerName = req.body.examinerName;
      if (req.body.examinerPosition) updateData.examinerPosition = req.body.examinerPosition;
      if (req.file) updateData.signaturePath = req.file.path;
      if (Object.keys(updateData).length > 0) {
        certificate = await ExcelService.updateCertificate(id, updateData);
      }
      // Generate certificate (PDF/PNG)
      const certificateService = require('../services/certificateService');
      const result = await certificateService.createCertificate({
        ...certificate,
        ...updateData,
        serialNumber: certificate.serialNumber,
        signaturePath: updateData.signaturePath || certificate.signaturePath
      });
      if (!result.success) {
        return res.status(500).json({ success: false, message: result.error });
      }
      // Assume result.data.previewUrl is PNG/JPG, and PDF url is /api/certificates/download/:filename?format=pdf
      const filename = result.data.filename || result.data.certificate?.filename;
      const pdfUrl = `/api/certificates/download/${filename}?format=pdf`;
      const pngUrl = result.data.previewUrl;
      res.json({
        success: true,
        message: 'Sertifikat berhasil digenerate',
        data: { pdfUrl, pngUrl }
      });
    } catch (error) {
      console.error('Generate certificate error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Terjadi kesalahan saat generate sertifikat'
      });
    }
  }

  /**
   * Generate multiple certificates
   */
  static async generateMultipleCertificates(req, res) {
    try {
      const { ids, activity } = req.body;
      
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'ID sertifikat harus disediakan'
        });
      }

      // Get certificates by IDs or activity filter
      let certificates;
      if (activity) {
        certificates = await ExcelService.getCertificates({ activity });
      } else {
        // Get specific certificates by IDs
        certificates = await ExcelService.getCertificates();
        certificates = certificates.filter(cert => ids.includes(cert.id));
      }

      if (certificates.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Tidak ada sertifikat yang ditemukan'
        });
      }

      // Generate certificates
      const certificateService = require('../services/certificateService');
      const generatedFiles = [];
      for (const certificate of certificates) {
        try {
          const result = await certificateService.createCertificate({
            ...certificate,
            serialNumber: certificate.serialNumber,
            signaturePath: certificate.signaturePath
          });
          if (result && result.success && result.data && result.data.filename) {
            generatedFiles.push({
              id: certificate.id,
              participantName: certificate.participantName,
              fileName: result.data.filename,
              pdfUrl: `/api/certificates/download/${result.data.filename}?format=pdf`,
              pngUrl: result.data.previewUrl
            });
          }
        } catch (error) {
          console.error(`Error generating certificate for ${certificate.participantName}:`, error);
        }
      }

      res.json({
        success: true,
        message: `Berhasil generate ${generatedFiles.length} sertifikat`,
        data: {
          totalGenerated: generatedFiles.length,
          files: generatedFiles
        }
      });

    } catch (error) {
      console.error('Generate multiple certificates error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Terjadi kesalahan saat generate sertifikat massal'
      });
    }
  }

  /**
   * Generate multiple certificates with additional data (dateIssued, examinerName, examinerPosition, signature)
   */
  static async generateMultipleCertificatesWithData(req, res) {
    try {
      const { ids, dateIssued, examinerName, examinerPosition } = req.body;
      // signature: req.file
      if (!ids || !Array.isArray(JSON.parse(ids)) || JSON.parse(ids).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'ID sertifikat harus disediakan'
        });
      }
      const idArray = JSON.parse(ids);
      // Get certificates by IDs
      let certificates = await ExcelService.getCertificates();
      certificates = certificates.filter(cert => idArray.includes(cert.id));
      if (certificates.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Tidak ada sertifikat yang ditemukan'
        });
      }
      // Update data dan generate
      const certificateService = require('../services/certificateService');
      const generatedFiles = [];
      for (const certificate of certificates) {
        // Update data
        const updateData = {
          dateIssued: dateIssued || certificate.dateIssued,
          examinerName: examinerName || certificate.examinerName,
          examinerPosition: examinerPosition || certificate.examinerPosition,
        };
        if (req.file) updateData.signaturePath = req.file.path;
        const updatedCert = await ExcelService.updateCertificate(certificate.id, updateData);
        // Generate PNG
        const result = await certificateService.createCertificate({
          ...updatedCert,
          serialNumber: updatedCert.serialNumber,
          signaturePath: updateData.signaturePath || updatedCert.signaturePath
        });
        // Generate & save PDF
        if (result && result.success && result.data && result.data.filename) {
          const puppeteer = require('../utils/puppeteer');
          const pathBase = path.join(__dirname, '../../generated-certificates');
          const timestamp = Date.now();
          const pdfFilename = `certificate_${timestamp}_${updatedCert.serialNumber}.pdf`;
          const pdfPath = path.join(pathBase, pdfFilename);
          await puppeteer.generateCertificatePDF({
            ...updatedCert,
            serialNumber: updatedCert.serialNumber,
            signaturePath: updateData.signaturePath || updatedCert.signaturePath
          }, pdfPath);
          generatedFiles.push({
            id: updatedCert.id,
            participantName: updatedCert.participantName,
            fileName: result.data.filename,
            pdfFileName: pdfFilename,
            pdfUrl: `/certificates/${pdfFilename}`,
            pngUrl: result.data.previewUrl
          });
        }
      }
      res.json({
        success: true,
        message: `Berhasil generate ${generatedFiles.length} sertifikat` ,
        data: {
          totalGenerated: generatedFiles.length,
          files: generatedFiles
        }
      });
    } catch (error) {
      console.error('Generate multiple certificates with data error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Terjadi kesalahan saat generate sertifikat massal'
      });
    }
  }

  /**
   * Update certificate
   */
  static async updateCertificate(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const certificate = await ExcelService.updateCertificate(id, updateData);

      res.json({
        success: true,
        message: 'Sertifikat berhasil diperbarui',
        data: certificate
      });

    } catch (error) {
      console.error('Update certificate error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Terjadi kesalahan saat memperbarui sertifikat'
      });
    }
  }

  /**
   * Delete certificate
   */
  static async deleteCertificate(req, res) {
    try {
      const { id } = req.params;

      const certificate = await ExcelService.deleteCertificate(id);

      res.json({
        success: true,
        message: 'Sertifikat berhasil dihapus',
        data: certificate
      });

    } catch (error) {
      console.error('Delete certificate error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Terjadi kesalahan saat menghapus sertifikat'
      });
    }
  }

  /**
   * Download Excel template
   */
  static async downloadTemplate(req, res) {
    try {
      const templatePath = path.join(__dirname, '../../assets/template-peserta.xlsx');
      
      if (!fs.existsSync(templatePath)) {
        return res.status(404).json({
          success: false,
          message: 'Template Excel tidak ditemukan'
        });
      }

      res.download(templatePath, 'template-peserta.xlsx');

    } catch (error) {
      console.error('Download template error:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan saat mengunduh template'
      });
    }
  }
}

module.exports = ExcelController; 