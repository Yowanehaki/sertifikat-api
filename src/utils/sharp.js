const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

class SharpUtils {
  constructor() {
    // Path ke font files
    this.fontPaths = {
      regular: path.join(__dirname, '../../assets/fonts/Montserrat-Regular.ttf'),
      bold: path.join(__dirname, '../../assets/fonts/Montserrat-Bold.ttf'),
      semibold: path.join(__dirname, '../../assets/fonts/Montserrat-SemiBold.ttf')
    };
  }

  // Check if fonts exist
  checkFonts() {
    const missingFonts = [];
    Object.entries(this.fontPaths).forEach(([type, fontPath]) => {
      if (!fs.existsSync(fontPath)) {
        missingFonts.push(`${type}: ${fontPath}`);
      }
    });
    
    if (missingFonts.length > 0) {
      console.warn('Missing font files:', missingFonts);
      console.warn('Using system default fonts instead');
      return false;
    }
    return true;
  }

  async generateCertificateImage(data) {
    try {
      const templatePath = path.join(__dirname, '../../assets/certificate-template.png');
      console.log('Checking template at:', templatePath);

      if (!fs.existsSync(templatePath)) {
        throw new Error('Certificate template not found. Please add template at: ' + templatePath);
      }

      // Check fonts availability
      const fontsAvailable = this.checkFonts();

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

      // Define font families based on availability
      const fontFamily = fontsAvailable ? 'Montserrat' : 'Arial, sans-serif';

      // Create font-face definitions for custom fonts
      const fontFaceCSS = fontsAvailable ? `
        @font-face {
          font-family: 'Montserrat';
          src: url('${this.fontPaths.regular}') format('truetype');
          font-weight: normal;
        }
        @font-face {
          font-family: 'Montserrat';
          src: url('${this.fontPaths.bold}') format('truetype');
          font-weight: bold;
        }
        @font-face {
          font-family: 'Montserrat';
          src: url('${this.fontPaths.semibold}') format('truetype');
          font-weight: 600;
        }
      ` : '';

      // Updated SVG with proper font loading
      const textSvg = `
  <svg width="3508" height="2480" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <style>
        ${fontFaceCSS}
        .montserrat-regular { font-family: 'Montserrat', Arial, sans-serif; font-weight: normal; }
        .montserrat-bold { font-family: 'Montserrat', Arial, sans-serif; font-weight: bold; }
        .montserrat-semibold { font-family: 'Montserrat', Arial, sans-serif; font-weight: 600; }
        .montserrat-italic { font-family: 'Montserrat', Arial, sans-serif; font-style: italic; }
        .montserrat-light { font-family: 'Montserrat', Arial, sans-serif; font-weight: 300; }
        .montserrat-light-italic { font-family: 'Montserrat', Arial, sans-serif; font-weight: 300; font-style: italic; }
      </style>
    </defs>
    <text x="1754" y="1060" font-size="150" class="montserrat-bold" text-anchor="middle" fill="black">
      ${this.escapeXml(data.participantName)}
    </text>
    <text x="1754" y="1445" font-size="80" class="montserrat-semibold" text-anchor="middle" fill="black">
      ${this.escapeXml(data.activity)}
    </text>
    <text x="1754" y="1515" font-size="50" class="montserrat-regular" text-anchor="middle" fill="black">
      ${formattedDate}
    </text>
    <text x="1754" y="2030" font-size="100" class="montserrat-semibold" text-anchor="middle" fill="black">
      ${this.escapeXml(data.examinerName)}
    </text>
    <text x="1754" y="2125" font-size="80" class="montserrat-regular" text-decoration="underline" text-anchor="middle" fill="black">
      ${this.escapeXml(data.examinerPosition)}
    </text>
    <text x="100" y="2190" font-size="45" class="montserrat-bold" text-anchor="start" fill="black">
      ${this.escapeXml(data.companyCode)}
    </text>
    <text x="100" y="2245" font-size="45" class="montserrat-regular" text-anchor="start" fill="black">
      This certificate can be validated (ID : ${this.escapeXml(data.id)})
    </text>
  </svg>`;

      // Generate the image with error handling
      try {
        const compositeArray = [{
          input: Buffer.from(textSvg),
          top: 0,
          left: 0
        }];

        // Add signature if available
        if (data.signaturePath && fs.existsSync(data.signaturePath)) {
          // Process signature image
          const signatureBuffer = await sharp(data.signaturePath)
            .resize(600, 300, { // Adjust size as needed
              fit: 'inside',
              withoutEnlargement: true
            })
            .toBuffer();

          compositeArray.push({
            input: signatureBuffer,
            top: 1610, // Adjust position as needed
            left: 1550, // Center position (3508/2 - 200)
            gravity: 'center'
          });
        }

        await sharp(templatePath)
          .resize(3508, 2480) // A4 size at 300 DPI
          .composite(compositeArray)
          .jpeg({ quality: 100 })
          .toFile(outputPath);

        console.log('Certificate generated successfully at:', outputPath);

        return {
          success: true,
          filename,
          outputPath,
          fontsUsed: fontsAvailable ? 'Montserrat' : 'System default'
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