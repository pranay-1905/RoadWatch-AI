import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

import potholeRoutes from './src/routes/potholeRoutes.js';
import tenderRoutes from './src/routes/tenderRoutes.js';
import vendorRoutes from './src/routes/vendorRoutes.js';
import citizenRoutes from './src/routes/citizenRoutes.js';
import { errorHandler } from './src/middlewares/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // Allow React frontend from any origin / mobile browser
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded road damage and repair photos statically
app.use('/uploads', express.static(path.resolve('./uploads')));

// API Root Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'RoadWatch AI - NMC Backend API',
    timestamp: new Date().toISOString()
  });
});

// Mount Domain Routes
app.use('/api/potholes', potholeRoutes);
app.use('/api/tenders', tenderRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/citizen', citizenRoutes);

// Global Error Handler
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 RoadWatch AI Backend Server Running on Port ${PORT}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`🛰️ Supabase Cloud: Synchronized with PostgreSQL`);
  console.log(`📷 Uploads Directory: http://localhost:${PORT}/uploads`);
  console.log(`=======================================================`);
});
