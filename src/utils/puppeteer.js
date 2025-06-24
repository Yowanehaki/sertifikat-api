const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

class PuppeteerCertificateGenerator {
  async generateCertificateImage(data) {
    let browser;
    try {
      // Launch browser
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      
      // Set viewport for high quality
      await page.setViewport({
        width: 3508,
        height: 2480,
        deviceScaleFactor: 1
      });

      const formattedDate = new Date(data.dateIssued).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Read template image and convert to base64
      const templatePath = path.join(__dirname, '../../assets/certificate-template.png');
      if (!fs.existsSync(templatePath)) {
        throw new Error('Certificate template not found');
      }
      
      const templateBase64 = fs.readFileSync(templatePath, { encoding: 'base64' });

      // Create HTML with certificate
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Montserrat', sans-serif;
      width: 3508px;
      height: 2480px;
      position: relative;
      background-image: url('data:image/png;base64,${templateBase64}');
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
    }
    
    .certificate-content {
      position: absolute;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    
    .participant-name {
      position: absolute;
      top: 935px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 141px;
      font-weight: 700;
      color: black;
      text-align: center;
      font-family: 'Montserrat', sans-serif;
    }
    
    .activity {
      position: absolute;
      top: 1365px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 75px;
      font-weight: 600;
      color: black;
      text-align: center;
      font-family: 'Montserrat', sans-serif;
      white-space: nowrap;
      max-width: 90%;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .date {
      position: absolute;
      top: 1460px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 46px;
      font-weight: 400;
      color: black;
      text-align: center;
      font-family: 'Montserrat', sans-serif;
    }
    
    .signature {
      position: absolute;
      top: 1580px;
      left: 50%;
      transform: translateX(-50%);
      width: 550px;
      height: 250px;
    }
    
    .examiner-name {
      position: absolute;
      top: 1931px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 87px;
      font-weight: 600;
      color: black;
      text-align: center;
      font-family: 'Montserrat', sans-serif;
    }
    
    .examiner-position {
      position: absolute;
      top: 2044px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 79px;
      font-weight: 400;
      color: black;
      text-align: center;
      text-decoration: underline;
      font-family: 'Montserrat', sans-serif;
    }
    
    .company-code {
      position: absolute;
      top: 2133px;
      left: 95px;
      font-size: 42px;
      font-weight: 700;
      color: black;
      font-family: 'Montserrat', sans-serif;
    }
    
    .validation-text {
      position: absolute;
      top: 2191px;
      left: 95px;
      font-size: 41px;
      font-weight: 400;
      color: black;
      font-family: 'Montserrat', sans-serif;
    }

    .validation-id{
    font-weight: 410;
    }
  </style>
</head>
<body>
  <div class="certificate-content">
    <div class="participant-name">${this.escapeHtml(data.participantName)}</div>
    <div class="activity">${this.escapeHtml(data.activity)}</div>
    <div class="date">${formattedDate}</div>
    
    ${data.signaturePath && fs.existsSync(data.signaturePath) ? 
      `<img class="signature" src="data:image/png;base64,${fs.readFileSync(data.signaturePath, { encoding: 'base64' })}" alt="Signature">` : 
      ''
    }
    
    <div class="examiner-name">${this.escapeHtml(data.examinerName)}</div>
    <div class="examiner-position">${this.escapeHtml(data.examinerPosition)}</div>
    <div class="company-code">${this.escapeHtml(data.companyCode)}</div>
    <div class="validation-text">This certificate can be validated ( ID : <span class="validation-id">${this.escapeHtml(data.id)}</span> )</div>
  </div>
</body>
</html>`;

      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      // Wait for fonts to load
      await new Promise(res => setTimeout(res, 2000));

      // Create output directory
      const outputDir = path.join(__dirname, '../../generated-certificates');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const timestamp = Date.now();
      const filename = `certificate_${timestamp}_${data.id}.jpg`;
      const outputPath = path.join(outputDir, filename);

      // Take screenshot
      await page.screenshot({
        path: outputPath,
        type: 'jpeg',
        quality: 100,
        fullPage: true
      });

      console.log('Certificate generated successfully at:', outputPath);

      return {
        success: true,
        filename,
        outputPath,
        fontsUsed: 'Montserrat (Google Fonts)'
      };

    } catch (error) {
      console.error('Certificate generation error:', error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  async generateCertificatePDF(data, pdfPath) {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      // Ukuran dan style identik dengan PNG
      const width = 3508;
      const height = 2480;
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      const formattedDate = new Date(data.dateIssued).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
      const templatePath = path.join(__dirname, '../../assets/certificate-template.png');
      if (!fs.existsSync(templatePath)) throw new Error('Certificate template not found');
      const templateBase64 = fs.readFileSync(templatePath, { encoding: 'base64' });
      let signatureImg = '';
      if (data.signaturePath && fs.existsSync(data.signaturePath)) {
        signatureImg = `<img class="signature" src="data:image/png;base64,${fs.readFileSync(data.signaturePath, { encoding: 'base64' })}" alt="Signature">`;
      }
      // Semua style identik PNG
      const html = this.getCertificateHTML(data, templateBase64, formattedDate, signatureImg, {
        width: 3508,
        height: 2480,
        participantNameTop: 935,
        participantNameFontSize: 141,
        activityTop: 1365,
        activityFontSize: 75,
        dateTop: 1460,
        dateFontSize: 46,
        signatureTop: 1580,
        signatureWidth: 550,
        signatureHeight: 250,
        examinerNameTop: 1931,
        examinerNameFontSize: 87,
        examinerPositionTop: 2044,
        examinerPositionFontSize: 79,
        companyCodeTop: 2133,
        companyCodeFontSize: 42,
        validationTextTop: 2191,
        validationTextFontSize: 41,
        leftPadding: 95,
        validationText: `This certificate can be validated ( ID : <span class="validation-id">${this.escapeHtml(data.id)}</span> )`,
      });
      await page.setContent(html, { waitUntil: 'networkidle0' });
      await page.evaluateHandle('document.fonts.ready');
      await new Promise(res => setTimeout(res, 1000));
      await page.pdf({
        path: pdfPath,
        printBackground: true,
        width: `${width}px`,
        height: `${height}px`
      });
      return { success: true, pdfPath };
    } catch (error) {
      console.error('PDF generation error:', error);
      return { success: false, error: error.message };
    } finally {
      if (browser) await browser.close();
    }
  }

  getCertificateHTML(data, templateBase64, formattedDate, signatureImg, options = {}) {
    const {
      width = 3508,
      height = 2480,
      participantNameTop = 935,
      participantNameFontSize = 141,
      activityTop = 1365,
      activityFontSize = 75,
      dateTop = 1460,
      dateFontSize = 46,
      signatureTop = 1580,
      signatureWidth = 550,
      signatureHeight = 250,
      examinerNameTop = 1931,
      examinerNameFontSize = 87,
      examinerPositionTop = 2044,
      examinerPositionFontSize = 79,
      companyCodeTop = 2133,
      companyCodeFontSize = 42,
      validationTextTop = 2191,
      validationTextFontSize = 41,
      leftPadding = 95,
      validationText = `This certificate can be validated ( ID : ${this.escapeHtml(data.id)} )`,
    } = options;
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Montserrat', sans-serif;
      width: ${width}px;
      height: ${height}px;
      position: relative;
      background-image: url('data:image/png;base64,${templateBase64}');
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
    }
    .certificate-content {
      position: absolute;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .participant-name {
      position: absolute;
      top: ${participantNameTop}px;
      left: 50%;
      transform: translateX(-50%);
      font-size: ${participantNameFontSize}px;
      font-weight: 700;
      color: black;
      text-align: center;
      font-family: 'Montserrat', sans-serif;
    }
    .activity {
      position: absolute;
      top: ${activityTop}px;
      left: 50%;
      transform: translateX(-50%);
      font-size: ${activityFontSize}px;
      font-weight: 600;
      color: black;
      text-align: center;
      font-family: 'Montserrat', sans-serif;
      white-space: nowrap;
      max-width: 90%;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .date {
      position: absolute;
      top: ${dateTop}px;
      left: 50%;
      transform: translateX(-50%);
      font-size: ${dateFontSize}px;
      font-weight: 400;
      color: black;
      text-align: center;
      font-family: 'Montserrat', sans-serif;
    }
    .signature {
      position: absolute;
      top: ${signatureTop}px;
      left: 50%;
      transform: translateX(-50%);
      width: ${signatureWidth}px;
      height: ${signatureHeight}px;
    }
    .examiner-name {
      position: absolute;
      top: ${examinerNameTop}px;
      left: 50%;
      transform: translateX(-50%);
      font-size: ${examinerNameFontSize}px;
      font-weight: 600;
      color: black;
      text-align: center;
      font-family: 'Montserrat', sans-serif;
    }
    .examiner-position {
      position: absolute;
      top: ${examinerPositionTop}px;
      left: 50%;
      transform: translateX(-50%);
      font-size: ${examinerPositionFontSize}px;
      font-weight: 400;
      color: black;
      text-align: center;
      text-decoration: underline;
      font-family: 'Montserrat', sans-serif;
    }
    .company-code {
      position: absolute;
      top: ${companyCodeTop}px;
      left: ${leftPadding}px;
      font-size: ${companyCodeFontSize}px;
      font-weight: 700;
      color: black;
      font-family: 'Montserrat', sans-serif;
    }
    .validation-text {
      position: absolute;
      top: ${validationTextTop}px;
      left: ${leftPadding}px;
      font-size: ${validationTextFontSize}px;
      font-weight: 400;
      color: black;
      font-family: 'Montserrat', sans-serif;
    }
    .validation-id {
      font-weight: 410;
    }
  </style>
</head>
<body>
  <div class="certificate-content">
    <div class="participant-name">${this.escapeHtml(data.participantName)}</div>
    <div class="activity">${this.escapeHtml(data.activity)}</div>
    <div class="date">${formattedDate}</div>
    ${signatureImg}
    <div class="examiner-name">${this.escapeHtml(data.examinerName)}</div>
    <div class="examiner-position">${this.escapeHtml(data.examinerPosition)}</div>
    <div class="company-code">${this.escapeHtml(data.companyCode)}</div>
    <div class="validation-text">This certificate can be validated ( ID : <span class="validation-id">${this.escapeHtml(data.id)}</span> )</div>
  </div>
</body>
</html>`;
  }

  escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
  
module.exports = new PuppeteerCertificateGenerator();