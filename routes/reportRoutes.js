import express from 'express';
import multer from 'multer';
import {
  getAllReports,
  getReportById,
  getReportByUser,
  createReport,
  updateReportStatus,
  addReply,
  getWeeklyReportStats,
  deleteReport,
} from '../controllers/reportController.js';
import { protect } from '../middleware/authMiddleware.js';
import path from 'path';

// Set up multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Folder for uploaded files
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); // Generate unique file names
  }
});

const upload = multer({ storage: storage });

const router = express.Router();

// Routes
router.get('/', getAllReports);
router.get('/my-report', protect, getReportByUser);
router.get('/weekly-chart', getWeeklyReportStats);
router.get('/:id', getReportById);
router.post('/', protect, upload.single('image'), createReport); // Use upload directly here
router.patch('/:id/status', protect, updateReportStatus);
router.post('/:id/reply', protect, addReply);
router.delete('/:id', deleteReport);

export default router;
