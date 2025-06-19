const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Import routes
const certificateRoutes = require('./src/routes/certificate');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files - serve generated certificates
app.use('/certificates', express.static(path.join(__dirname, 'generated-certificates')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Routes
app.use('/api/certificates', certificateRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Certificate Generator API is running' });
});

// Create required directories
const requiredDirs = ['generated-certificates', 'assets', 'uploads'];
requiredDirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Certificate Generator Server running on port ${PORT}`);
  console.log(`📁 Make sure to place certificate template in: ./assets/certificate-template.png`);
  console.log(`🎨 Make sure Montserrat font is available on your system`);
});