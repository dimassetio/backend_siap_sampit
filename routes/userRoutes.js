import express from 'express'
const router = express.Router()
import {
  registerUser,
  loginUser,
  getAllUsers,
  getUserById,
  getUserProfile,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/UserController.js'
import { protect, admin } from '../middleware/authMiddleware.js'

router.post('/register', registerUser)
router.post('/login', loginUser)
router.get('/profile', protect, getUserProfile)

// Admin only routes
router
  .route('/')
  .get(protect, admin, getAllUsers)
  .post(protect, admin, createUser)
router
  .route('/:id')
  .get(protect, admin, getUserById)
  .put(protect, admin, updateUser)
  .delete(protect, admin, deleteUser)


export default router
