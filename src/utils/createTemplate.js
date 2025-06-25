const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

function createExcelTemplate() {
  // Sample data for template
  const templateData = [
    {
      'ID Sertifikat': 'CERT-20240001',
      'Nama Peserta': 'John Doe',
      'Activity': 'Pelatihan React JS',
      'Company Code': 'COMP001'
    },
    {
      'ID Sertifikat': 'CERT-20240002',
      'Nama Peserta': 'Jane Smith',
      'Activity': 'Pelatihan Node.js',
      'Company Code': 'COMP002'
    }
  ];

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(templateData);

  // Set column widths
  const columnWidths = [
    { wch: 18 }, // ID Sertifikat
    { wch: 20 }, // Nama Peserta
    { wch: 25 }, // Activity
    { wch: 15 }  // Company Code
  ];
  worksheet['!cols'] = columnWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Peserta');

  // Create assets directory if it doesn't exist
  const assetsDir = path.join(__dirname, '../../assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  // Save template file
  const templatePath = path.join(assetsDir, 'template-peserta.xlsx');
  XLSX.writeFile(workbook, templatePath);

  console.log('✅ Excel template created at:', templatePath);
  return templatePath;
}

// Create template if this file is run directly
if (require.main === module) {
  createExcelTemplate();
}

module.exports = createExcelTemplate; 