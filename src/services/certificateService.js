const { PrismaClient } = require('@prisma/client');
const sharpUtils = require('../utils/sharp');

const prisma = new PrismaClient();

class CertificateService {
  async createCertificate(data) {
    try {
      // 1. Generate certificate image using Sharp
      const imageResult = await sharpUtils.generateCertificateImage(data);
      
      if (!imageResult.success) {
        return {
          success: false,
          error: imageResult.error
        };
      }
      
      // 2. Save certificate data to database
      const certificate = await prisma.certificate.create({
        data: {
          participantName: data.participantName,
          activity: data.activity,
          dateIssued: new Date(data.dateIssued),
          examinerName: data.examinerName,
          examinerPosition: data.examinerPosition,
          companyCode: data.companyCode,
          signaturePath: imageResult.filename // Store the generated image filename
        }
      });
      
      return {
        success: true,
        data: {
          id: certificate.id,
          filename: imageResult.filename,
          downloadUrl: `/api/certificates/download/${imageResult.filename}`,
          viewUrl: `/certificates/${imageResult.filename}`,
          certificate: certificate
        }
      };
    } catch (error) {
      console.error('Error in createCertificate service:', error);
      return {
        success: false,
        error: error.message
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

  async getCertificateById(id) {
    try {
      const certificate = await prisma.certificate.findUnique({
        where: { id }
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