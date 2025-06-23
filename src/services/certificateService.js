const { PrismaClient } = require('@prisma/client');
const sharpUtils = require('../utils/puppeteer');

const prisma = new PrismaClient();

class CertificateService {
  async createCertificate(data) {
    try {
      console.log('Creating certificate with data:', data);

      // Generate image first
      const imageResult = await sharpUtils.generateCertificateImage(data);
      if (!imageResult.success) {
        return {
          success: false,
          error: imageResult.error || 'Failed to generate certificate image'
        };
      }

      // Create certificate record
      const certificate = await prisma.certificate.create({
        data: {
          serialNumber: data.id, // Changed from certificateId to serialNumber
          participantName: data.participantName,
          activity: data.activity,
          dateIssued: new Date(data.dateIssued),
          examinerName: data.examinerName,
          examinerPosition: data.examinerPosition,
          companyCode: data.companyCode,
          // Simpan signaturePath hanya jika ada file tanda tangan
          signaturePath: data.signaturePath ? data.signaturePath : null
        }
      }).catch(error => {
        if (error.code === 'P2002') {
          throw new Error(`Certificate with ID ${data.id} already exists`);
        }
        throw error;
      });

      return {
        success: true,
        data: {
          id: certificate.serialNumber,
          filename: imageResult.filename,
          previewUrl: `/certificates/${imageResult.filename}`,
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