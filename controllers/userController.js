import asyncHandler from 'express-async-handler'
import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import generateToken from '../config/generateToken.js'

// @desc    Register new user
// @route   POST /api/users/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { nim, name, email, phone, password } = req.body

    const userExists = await User.findOne({ $or: [{ email }, { nim }] })
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with that email or NIM' })
    }

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    const user = await User.create({
      nim,
      name,
      email,
      phone,
      password: hashedPassword,
      role: 'mahasiswa',
    })

    if (user) {
      return res.status(201).json({
        message: 'User registered successfully',
        user: {
          _id: user._id,
          nim: user.nim,
          name: user.name,
          email: user.email,
          role: user.role,
          token: generateToken(user._id),
        },
      })
    } else {
      return res.status(400).json({ message: 'Invalid user data' })
    }
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// @desc    Login user
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email })

    if (user && (await bcrypt.compare(password, user.password))) {
      return res.status(200).json({
        message: 'Login successful',
        user: {
          _id: user._id,
          nim: user.nim,
          name: user.name,
          email: user.email,
          role: user.role,
          token: generateToken(user._id),
        },
      })
    } else {
      return res.status(401).json({ message: 'Invalid email or password' })
    }
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({})
    res.status(200).json(users)
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil data pengguna', error: error.message })
  }
}

// @desc    Get user by ID (Admin only)
// @route   GET /api/users/:id
// @access  Private/Admin
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password')

    if (user) {
      res.status(200).json(user)
    } else {
      res.status(404).json({ message: 'User tidak ditemukan' })
    }
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message })
  }
}

// @desc    Profil user
// @route   GET /api/users/profile
// @access  Public
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password') // exclude password

    if (user) {
      res.status(200).json(user)
    } else {
      res.status(404).json({ message: 'User tidak ditemukan' })
    }
  } catch (error) {
    res.status(500).json({
      message: 'Terjadi kesalahan saat mengambil data user',
      error: error.message,
    })
  }
}

// @desc    Create user (Admin only)
// @route   POST /api/users
// @access  Private/Admin
const createUser = asyncHandler(async (req, res) => {
  try {
    const { nim, name, email, phone, password, role } = req.body;

    if (!['mahasiswa', 'petugas', 'admin'].includes(role)) {
      res.status(400);
      throw new Error('Invalid role');
    }

    const existing = await User.findOne({ $or: [{ email }, { nim }] });
    if (existing) {
      res.status(400);
      throw new Error('User with that email or NIM already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      nim,
      name,
      email,
      phone,
      password: hashedPassword,
      role,
    });

    res.status(201).json({ message: `${role} created successfully`, user });
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message })
  }
});


// @desc    Update user (Admin only)
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
  try {
    const { name, email, phone, role } = req.body
    const user = await User.findById(req.params.id)

    if (user) {
      user.name = name || user.name
      user.email = email || user.email
      user.phone = phone || user.phone
      user.role = role || user.role

      const updatedUser = await user.save()
      res.status(200).json({
        message: 'User berhasil diperbarui',
        user: {
          _id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
        },
      })
    } else {
      res.status(404).json({ message: 'User tidak ditemukan' })
    }
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message })
  }
}

// @desc    Delete user (Admin only)
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)

    if (user) {
      await User.deleteOne({ _id: user._id })
      res.status(200).json({ message: 'User berhasil dihapus' })
    } else {
      res.status(404).json({ message: 'User tidak ditemukan' })
    }
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message })
  }
}


export { registerUser, loginUser, getAllUsers, getUserById, getUserProfile, createUser, updateUser, deleteUser }
