const { PrismaClient } = require('@prisma/client');
const sharpUtils = require('../utils/puppeteer');

const prisma = new PrismaClient();

class CertificateService {
  async createCertificate(data) {
    try {
      if (!data.serialNumber) {
        throw new Error('serialNumber is required for certificate upsert');
      }

      console.log('Creating certificate with data:', data);

      // Generate image first
      const imageResult = await sharpUtils.generateCertificateImage({
        ...data,
        id: data.serialNumber,
        serialNumber: data.serialNumber
      });
      if (!imageResult.success) {
        return {
          success: false,
          error: imageResult.error || 'Failed to generate certificate image'
        };
      }

      // Generate PDF and save to disk (for fast download)
      const path = require('path');
      const pdfTimestamp = Date.now();
      const pdfFilename = `certificate_${pdfTimestamp}_${data.serialNumber}.pdf`;
      const pdfPath = path.join(__dirname, '../../generated-certificates', pdfFilename);
      const pdfResult = await sharpUtils.generateCertificatePDF({
        ...data,
        id: data.serialNumber,
        serialNumber: data.serialNumber
      }, pdfPath);
      if (!pdfResult.success) {
        return {
          success: false,
          error: pdfResult.error || 'Failed to generate certificate PDF'
        };
      }

      // Upsert: update jika sudah ada, insert jika belum
      let certificate;
      const existing = await prisma.certificate.findUnique({ where: { serialNumber: data.serialNumber } });
      if (existing) {
        certificate = await prisma.certificate.update({
          where: { serialNumber: data.serialNumber },
          data: {
            participantName: data.participantName,
            activity: data.activity,
            dateIssued: new Date(data.dateIssued),
            examinerName: data.examinerName,
            examinerPosition: data.examinerPosition,
            companyCode: data.companyCode,
            signaturePath: data.signaturePath ? data.signaturePath : existing.signaturePath
          }
        });
      } else {
        certificate = await prisma.certificate.create({
          data: {
            serialNumber: data.serialNumber,
            participantName: data.participantName,
            activity: data.activity,
            dateIssued: new Date(data.dateIssued),
            examinerName: data.examinerName,
            examinerPosition: data.examinerPosition,
            companyCode: data.companyCode,
            signaturePath: data.signaturePath ? data.signaturePath : null
          }
        });
      }

      return {
        success: true,
        data: {
          id: certificate.serialNumber,
          filename: imageResult.filename,
          pdfFilename: pdfFilename,
          previewUrl: `/certificates/${imageResult.filename}`,
          pdfUrl: `/certificates/${pdfFilename}`,
          certificate
        }
      };
    } catch (error) {
      console.error('Certificate creation error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create certificate'
      };
    }
  }

  async getAllCertificates() {
    try {
      const certificates = await prisma.certificate.findMany({
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      return certificates;
    } catch (error) {
      console.error('Error in getAllCertificates service:', error);
      throw error;
    }
  }

  async getCertificateById(serialNumber) {
    try {
      const certificate = await prisma.certificate.findUnique({
        where: { serialNumber }
      });
      
      return certificate;
    } catch (error) {
      console.error('Error in getCertificateById service:', error);
      throw error;
    }
  }

  async deleteCertificate(id) {
    try {
      // Get certificate data first
      const certificate = await prisma.certificate.findUnique({
        where: { id }
      });
      
      if (!certificate) {
        return { success: false, error: 'Certificate not found' };
      }
      
      // Delete from database
      await prisma.certificate.delete({
        where: { id }
      });
      
      // Delete file if exists
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, '../../generated-certificates', certificate.signaturePath);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error in deleteCertificate service:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new CertificateService();