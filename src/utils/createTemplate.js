const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

function createExcelTemplate() {
  // Sample data for template
  const templateData = [
    {
      'Nama Peserta': 'John Doe',
      'Activity': 'Pelatihan React JS',
      'Examiner Name': 'Dr. Jane Smith',
      'Examiner Position': 'Senior Developer',
      'Company Code': 'COMP001',
      'Date Issued': '2024-01-15'
    },
    {
      'Nama Peserta': 'Jane Smith',
      'Activity': 'Pelatihan Node.js',
      'Examiner Name': 'Dr. John Doe',
      'Examiner Position': 'Tech Lead',
      'Company Code': 'COMP002',
      'Date Issued': '2024-01-16'
    }
  ];

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(templateData);

  // Set column widths
  const columnWidths = [
    { wch: 20 }, // Nama Peserta
    { wch: 25 }, // Activity
    { wch: 20 }, // Examiner Name
    { wch: 20 }, // Examiner Position
    { wch: 15 }, // Company Code
    { wch: 15 }  // Date Issued
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