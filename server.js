const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create required directories with proper permissions
const dirs = ['generated-certificates', 'assets', 'uploads'];
dirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    // Set proper permissions (read/write for owner)
    fs.chmodSync(dirPath, 0o755);
  }
});

// Check for certificate template
const templatePath = path.join(__dirname, 'assets/certificate-template.png');
if (!fs.existsSync(templatePath)) {
  console.warn('⚠️ Certificate template not found at:', templatePath);
  console.warn('Please add a certificate-template.png file in the assets directory');
}

// Test database connection
async function testDbConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

// Import routes
const certificateRoutes = require('./src/routes/certificate');
const excelRoutes = require('./src/routes/excel');

// Serve static files before API routes
app.use('/certificates', express.static(path.join(__dirname, 'generated-certificates')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// API routes
app.use('/api/certificates', certificateRoutes);
app.use('/api/excel', excelRoutes);

// Debug middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Error handler for static files
app.use((err, req, res, next) => {
  console.error('Static file error:', err);
  res.status(404).json({ error: 'File not found' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message
  });
});

// Add detailed error logging middleware
app.use((err, req, res, next) => {
  console.error('Error details:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body
  });

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message
  });
});

const PORT = process.env.PORT || 3000;

// Start server after DB connection test
testDbConnection().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📁 Certificates directory: ${path.join(__dirname, 'generated-certificates')}`);
    console.log(`🎨 Assets directory: ${path.join(__dirname, 'assets')}`);
  });
});

// Handle unhandled rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});