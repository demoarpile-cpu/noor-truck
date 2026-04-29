/**
 * Main Server File
 * Sets up Express server, middleware, routes, and starts the server
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const driverRoutes = require('./routes/driverRoutes');
const companyRoutes = require('./routes/companyRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');   // NEW
const paymentRoutes = require('./routes/paymentRoutes');   // NEW
const inspectionRoutes = require('./routes/inspectionRoutes'); // NEW
const { ensureDatabaseSchema } = require('./utils/dbMigration'); // AUTO-MIGRATION

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Cache-Control', 'Pragma'],
  credentials: false
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin/billing/invoices', invoiceRoutes);
app.use('/api/admin/billing/payments', paymentRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/company', companyRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Start server — auto-migration runs before server starts
const startServer = async () => {
  try {
    await ensureDatabaseSchema(); // ← DB me missing columns add karega
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
};

startServer();

module.exports = app;
