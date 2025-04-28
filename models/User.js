import mongoose from 'mongoose'

const userSchema = mongoose.Schema(
  {
    nim: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phone: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['mahasiswa', 'petugas', 'admin'],
      default: 'mahasiswa',
    },
  },
  {
    timestamps: true, // otomatis simpan createdAt dan updatedAt
  }
)

const User = mongoose.model('User', userSchema)
export default User
