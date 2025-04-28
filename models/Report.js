// models/Report.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const replySchema = new Schema({
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderRole: {
    type: String,
    enum: ['mahasiswa', 'petugas', 'admin'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const statusHistorySchema = new Schema({
  status: {
    type: String,
    enum: ['menunggu', 'diproses', 'selesai', 'dibatalkan'],
    required: true
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const attachmentSchema = new Schema({
  url: String,
  filename: String,
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

const reportSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    enum: ['fasilitas', 'dosen', 'pelayanan', 'lainnya'],
    required: true
  },
  status: {
    type: String,
    enum: ['menunggu', 'diproses', 'selesai', 'dibatalkan'],
    default: 'menunggu'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  attachment: {
    type: String, // simpan nama file atau URL file
  },
  replies: [replySchema],
  statusHistory: [statusHistorySchema],
  attachments: [attachmentSchema],
  validatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  validatedAt: Date,
  handledBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
});

module.exports = mongoose.model('Report', reportSchema);
