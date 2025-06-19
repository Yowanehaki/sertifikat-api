const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

class SharpUtils {
  async generateCertificateImage(data) {
    try {
      const templatePath = path.join(__dirname, '../../assets/certificate-template.png');
      console.log('Checking template at:', templatePath);

      if (!fs.existsSync(templatePath)) {
        throw new Error('Certificate template not found. Please add template at: ' + templatePath);
      }

      // Create output directory if it doesn't exist
      const outputDir = path.join(__dirname, '../../generated-certificates');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const timestamp = Date.now();
      const filename = `certificate_${timestamp}_${data.id}.jpg`;
      const outputPath = path.join(outputDir, filename);

      const formattedDate = new Date(data.dateIssued).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Simplify the SVG generation first to test
      const textSvg = `
        <svg width="3508" height="2480">
          <style>
            text { font-family: Arial, sans-serif; }
          </style>
          <text x="1754" y="1000" font-size="100" text-anchor="middle" fill="black">
            ${this.escapeXml(data.participantName)}
          </text>
          <text x="1754" y="1200" font-size="70" text-anchor="middle" fill="black">
            ${this.escapeXml(data.activity)}
          </text>
          <text x="1754" y="1400" font-size="50" text-anchor="middle" fill="black">
            ${formattedDate}
          </text>
        </svg>
      `;

      // Generate the image with error handling
      try {
        await sharp(templatePath)
          .resize(3508, 2480) // A4 size at 300 DPI
          .composite([{
            input: Buffer.from(textSvg),
            top: 0,
            left: 0
          }])
          .jpeg({ quality: 100 })
          .toFile(outputPath);

        console.log('Certificate generated successfully at:', outputPath);

        return {
          success: true,
          filename,
          outputPath
        };
      } catch (sharpError) {
        console.error('Sharp processing error:', sharpError);
        throw sharpError;
      }
    } catch (error) {
      console.error('Certificate generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

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