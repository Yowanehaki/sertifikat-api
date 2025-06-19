const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

class SharpUtils {
  async generateCertificateImage(data) {
    try {
      const templatePath = path.join(__dirname, '../../assets/certificate.png');
      
      // Check if template exists
      if (!fs.existsSync(templatePath)) {
        return {
          success: false,
          error: 'Certificate template not found. Please place certificate-template.png in assets folder.'
        };
      }
      
      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedName = data.participantName.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `certificate_${timestamp}_${sanitizedName}.jpg`;
      const outputPath = path.join(__dirname, '../../generated-certificates', filename);
      
      // Format date
      const formattedDate = new Date(data.dateIssued).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // Create SVG text overlay with Montserrat font
      const textSvg = `
        <svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">
          <style>
            .participant-name {
              font-family: 'Montserrat', 'Arial', sans-serif;
              font-size: 48px;
              font-weight: bold;
              fill: #2c3e50;
              text-anchor: middle;
            }
            .activity-name {
              font-family: 'Montserrat', 'Arial', sans-serif;
              font-size: 32px;
              font-weight: 600;
              fill: #34495e;
              text-anchor: middle;
            }
            .date-text {
              font-family: 'Montserrat', 'Arial', sans-serif;
              font-size: 24px;
              font-weight: 500;
              fill: #7f8c8d;
              text-anchor: middle;
            }
            .examiner-text {
              font-family: 'Montserrat', 'Arial', sans-serif;
              font-size: 20px;
              font-weight: 500;
              fill: #2c3e50;
              text-anchor: middle;
            }
            .company-code {
              font-family: 'Montserrat', 'Arial', sans-serif;
              font-size: 18px;
              font-weight: 400;
              fill: #95a5a6;
              text-anchor: end;
            }
          </style>
          
          <!-- Participant Name - Main focus -->
          <text x="600" y="420" class="participant-name">
            ${this.escapeXml(data.participantName)}
          </text>
          
          <!-- Activity/Course Name -->
          <text x="600" y="570" class="activity-name">
            ${this.escapeXml(data.activity)}
          </text>
          
          <!-- Date -->
          <text x="600" y="650" class="date-text">
            ${formattedDate}
          </text>
          
          <!-- Examiner Name -->
          <text x="600" y="720" class="examiner-text">
            ${this.escapeXml(data.examinerName)}
          </text>
          
          <!-- Examiner Position -->
          <text x="600" y="745" class="examiner-text" style="font-size: 16px; fill: #7f8c8d;">
            ${this.escapeXml(data.examinerPosition)}
          </text>
          
          <!-- Company Code - Bottom right -->
          <text x="1150" y="780" class="company-code">
            ${this.escapeXml(data.companyCode)}
          </text>
        </svg>
      `;
      
      // Generate certificate using Sharp
      await sharp(templatePath)
        .composite([
          {
            input: Buffer.from(textSvg),
            top: 0,
            left: 0
          }
        ])
        .jpeg({
          quality: 95,
          mozjpeg: true // Better compression
        })
        .toFile(outputPath);
      
      return {
        success: true,
        filename: filename,
        outputPath: outputPath
      };
      
    } catch (error) {
      console.error('Error generating certificate image:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Helper function to escape XML characters
  escapeXml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

module.exports = new SharpUtils();