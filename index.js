import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import connectDB from './config/db.js';
import userRoutes from './routes/userRoutes.js';
import reportRoutes from './routes/reportRoutes.js';


const app = express();

connectDB();

// Use CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Middleware untuk parsing JSON
app.use(express.json());

// Simple route
app.get('/', (req, res) => {
  res.send('Hello from Express!');
});

// API routes
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);

// Set upload folder
const __dirname = path.resolve(); // buat dapetin root folder
app.use('/uploads', express.static(path.join(__dirname, '/uploads')));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
