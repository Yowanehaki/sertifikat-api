const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class ExcelService {
  /**
   * Parse Excel file and extract participant data
   * @param {string} filePath - Path to uploaded Excel file
   * @returns {Array} Array of participant objects
   */
  static parseExcelFile(filePath) {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON with header row
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length < 2) {
        throw new Error('File Excel harus memiliki minimal header dan satu baris data');
      }
      
      const headers = jsonData[0];
      const dataRows = jsonData.slice(1);
      
      // Expected headers mapping
      const expectedHeaders = {
        'Nama Peserta': 'participantName',
        'Nama': 'participantName',
        'Activity': 'activity',
        'Kegiatan': 'activity',
        'Nama Kegiatan': 'activity',
        'Examiner Name': 'examinerName',
        'Nama Examiner': 'examinerName',
        'Examiner Position': 'examinerPosition',
        'Jabatan Examiner': 'examinerPosition',
        'Company Code': 'companyCode',
        'Kode Perusahaan': 'companyCode',
        'Date Issued': 'dateIssued',
        'Tanggal Terbit': 'dateIssued',
        'Tanggal': 'dateIssued'
      };
      
      // Map headers to standardized field names
      const headerMapping = {};
      headers.forEach((header, index) => {
        const normalizedHeader = header ? header.toString().trim() : '';
        if (expectedHeaders[normalizedHeader]) {
          headerMapping[expectedHeaders[normalizedHeader]] = index;
        }
      });
      
      // Validate required fields
      const requiredFields = ['participantName', 'activity'];
      const missingFields = requiredFields.filter(field => headerMapping[field] === undefined);
      
      if (missingFields.length > 0) {
        throw new Error(`Field yang diperlukan tidak ditemukan: ${missingFields.join(', ')}`);
      }
      
      // Process data rows
      const participants = dataRows
        .filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''))
        .map((row, index) => {
          const participant = {};
          
          Object.keys(headerMapping).forEach(field => {
            const columnIndex = headerMapping[field];
            let value = row[columnIndex];
            
            // Handle date fields
            if (field === 'dateIssued') {
              if (value instanceof Date) {
                value = value.toISOString();
              } else if (typeof value === 'string') {
                // Try to parse date string
                const parsedDate = new Date(value);
                if (!isNaN(parsedDate.getTime())) {
                  value = parsedDate.toISOString();
                } else {
                  value = new Date().toISOString(); // Default to current date
                }
              } else {
                value = new Date().toISOString();
              }
            }
            
            participant[field] = value || '';
          });
          
          // Set default values for missing optional fields
          if (!participant.examinerName) participant.examinerName = 'Default Examiner';
          if (!participant.examinerPosition) participant.examinerPosition = 'Default Position';
          if (!participant.companyCode) participant.companyCode = 'DEFAULT';
          if (!participant.dateIssued) participant.dateIssued = new Date().toISOString();
          
          return participant;
        });
      
      return participants;
    } catch (error) {
      throw new Error(`Error parsing Excel file: ${error.message}`);
    }
  }
  
  /**
   * Save participants data to database
   * @param {Array} participants - Array of participant objects
   * @returns {Array} Array of saved certificate IDs
   */
  static async saveParticipantsToDatabase(participants) {
    try {
      const savedCertificates = [];
      
      for (const participant of participants) {
        const certificate = await prisma.certificate.create({
          data: {
            participantName: participant.participantName,
            activity: participant.activity,
            dateIssued: new Date(participant.dateIssued),
            examinerName: participant.examinerName,
            examinerPosition: participant.examinerPosition,
            companyCode: participant.companyCode,
            serialNumber: this.generateSerialNumber()
          }
        });
        
        savedCertificates.push(certificate);
      }
      
      return savedCertificates;
    } catch (error) {
      throw new Error(`Error saving to database: ${error.message}`);
    }
  }
  
  /**
   * Generate unique serial number
   * @returns {string} Serial number
   */
  static generateSerialNumber() {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `CERT-${timestamp}-${random}`;
  }
  
  /**
   * Get all certificates with filtering
   * @param {Object} filters - Filter options
   * @returns {Array} Array of certificates
   */
  static async getCertificates(filters = {}) {
    try {
      const whereClause = {};
      if (filters.activity && typeof filters.activity === 'string' && filters.activity.trim() !== '') {
        whereClause.activity = {
          contains: filters.activity
        };
      }
      if (filters.participantName && typeof filters.participantName === 'string' && filters.participantName.trim() !== '') {
        whereClause.participantName = {
          contains: filters.participantName
        };
      }
      if (filters.examinerName && typeof filters.examinerName === 'string' && filters.examinerName.trim() !== '') {
        whereClause.examinerName = {
          contains: filters.examinerName
        };
      }
      const certificates = await prisma.certificate.findMany({
        where: whereClause,
        orderBy: {
          createdAt: 'desc'
        }
      });
      return certificates;
    } catch (error) {
      throw new Error(`Error fetching certificates: ${error.message}`);
    }
  }
  
  /**
   * Get unique activities for filtering
   * @returns {Array} Array of unique activities
   */
  static async getUniqueActivities() {
    try {
      const activities = await prisma.certificate.findMany({
        select: {
          activity: true
        },
        distinct: ['activity']
      });
      
      return activities.map(item => item.activity);
    } catch (error) {
      throw new Error(`Error fetching activities: ${error.message}`);
    }
  }
  
  /**
   * Update certificate
   * @param {string} id - Certificate ID
   * @param {Object} data - Update data
   * @returns {Object} Updated certificate
   */
  static async updateCertificate(id, data) {
    try {
      const certificate = await prisma.certificate.update({
        where: { id },
        data: {
          participantName: data.participantName,
          activity: data.activity,
          dateIssued: new Date(data.dateIssued),
          examinerName: data.examinerName,
          examinerPosition: data.examinerPosition,
          companyCode: data.companyCode
        }
      });
      
      return certificate;
    } catch (error) {
      throw new Error(`Error updating certificate: ${error.message}`);
    }
  }
  
  /**
   * Delete certificate
   * @param {string} id - Certificate ID
   * @returns {Object} Deleted certificate
   */
  static async deleteCertificate(id) {
    try {
      const certificate = await prisma.certificate.delete({
        where: { id }
      });
      
      return certificate;
    } catch (error) {
      throw new Error(`Error deleting certificate: ${error.message}`);
    }
  }
}

module.exports = ExcelService; 