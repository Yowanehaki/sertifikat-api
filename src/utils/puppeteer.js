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
      font-size: 140px;
      font-weight: 700;
      color: black;
      text-align: center;
      font-family: 'Montserrat', sans-serif;
    }
    
    .activity {
      position: absolute;
      top: 1357px;
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
      font-size: 40px;
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
      top: 1930px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 85px;
      font-weight: 600;
      color: black;
      text-align: center;
      font-family: 'Montserrat', sans-serif;
    }
    
    .examiner-position {
      position: absolute;
      top: 2046px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 80px;
      font-weight: 400;
      color: black;
      text-align: center;
      text-decoration: underline;
      font-family: 'Montserrat', sans-serif;
    }
    
    .company-code {
      position: absolute;
      top: 2126px;
      left: 95px;
      font-size: 40px;
      font-weight: 700;
      color: black;
      font-family: 'Montserrat', sans-serif;
    }
    
    .validation-text {
      position: absolute;
      top: 2186px;
      left: 95px;
      font-size: 43px;
      font-weight: 400;
      color: black;
      font-family: 'Montserrat', sans-serif;
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
    <div class="validation-text">This certificate can be validated ( ID : ${this.escapeHtml(data.id)} )</div>
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
      // Gunakan resolusi lebih kecil agar PDF lebih ringan
      const width = 1754; // setara A4 150dpi
      const height = 1240;
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      const formattedDate = new Date(data.dateIssued).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
      const templatePath = path.join(__dirname, '../../assets/certificate-template.png');
      if (!fs.existsSync(templatePath)) throw new Error('Certificate template not found');
      const templateBase64 = fs.readFileSync(templatePath, { encoding: 'base64' });
      // Pastikan signaturePath absolut dan file-nya ada
      let signatureImg = '';
      if (data.signaturePath && fs.existsSync(data.signaturePath)) {
        signatureImg = `<img class="signature" src="data:image/png;base64,${fs.readFileSync(data.signaturePath, { encoding: 'base64' })}" alt="Signature">`;
      }
      const html = `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&display=swap');*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Montserrat',sans-serif;width:${width}px;height:${height}px;position:relative;background-image:url('data:image/png;base64,${templateBase64}');background-size:cover;background-position:center;background-repeat:no-repeat;}.certificate-content{position:absolute;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;}.participant-name{position:absolute;top:470px;left:50%;transform:translateX(-50%);font-size:75px;font-weight:700;color:black;text-align:center;font-family:'Montserrat',sans-serif;}.activity{position:absolute;top:690px;left:50%;transform:translateX(-50%);font-size:40px;font-weight:600;color:black;text-align:center;font-family:'Montserrat',sans-serif;white-space:nowrap;max-width:90%;overflow:hidden;text-overflow:ellipsis;}.date{position:absolute;top:740px;left:50%;transform:translateX(-50%);font-size:25px;font-weight:400;color:black;text-align:center;font-family:'Montserrat',sans-serif;}.signature{position:absolute;top:800px;left:50%;transform:translateX(-50%);width:300px;height:150px;}.examiner-name{position:absolute;top:970px;left:50%;transform:translateX(-50%);font-size:50px;font-weight:600;color:black;text-align:center;font-family:'Montserrat',sans-serif;}.examiner-position{position:absolute;top:1023px;left:50%;transform:translateX(-50%);font-size:40px;font-weight:400;color:black;text-align:center;text-decoration:underline;font-family:'Montserrat',sans-serif;}.company-code{position:absolute;top:1055px;left:50px;font-size:23px;font-weight:700;color:black;font-family:'Montserrat',sans-serif;}.validation-text{position:absolute;top:1085px;left:50px;font-size:21px;font-weight:400;color:black;font-family:'Montserrat',sans-serif;}</style></head><body><div class="certificate-content"><div class="participant-name">${this.escapeHtml(data.participantName)}</div><div class="activity">${this.escapeHtml(data.activity)}</div><div class="date">${formattedDate}</div>${signatureImg}<div class="examiner-name">${this.escapeHtml(data.examinerName)}</div><div class="examiner-position">${this.escapeHtml(data.examinerPosition)}</div><div class="company-code">${this.escapeHtml(data.companyCode)}</div><div class="validation-text">This certificate can be validated (ID : ${this.escapeHtml(data.id)})</div></div></body></html>`;
      await page.setContent(html, { waitUntil: 'networkidle0' });
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