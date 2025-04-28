import Grid from 'gridfs-stream';
import multer from 'multer';
import mongoose from 'mongoose';
import Report from '../models/Report.js';
import moment from 'moment';
// 🔍 Get all reports (admin or officer)
const getAllReports = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    const statusFilter = req.query.status || '';
    const statusCondition = statusFilter ? { status: statusFilter } : {};

    // Data laporan tanpa filter userId
    const [reports, total, statusCounts] = await Promise.all([
      Report.find(statusCondition)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId validatedBy handledBy'),
      Report.countDocuments({}),
      Report.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ])
    ]);

    // Mapping status counts
    const summary = {
      menunggu: 0,
      diproses: 0,
      selesai: 0
    };

    statusCounts.forEach(item => {
      switch (item._id) {
        case "menunggu":
          summary.menunggu = item.count;
          break;
        case "diproses":
          summary.diproses = item.count;
          break;
        case "selesai":
          summary.selesai = item.count;
          break;
      }
    });

    return res.status(200).json({
      data: reports,
      totalItems: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      summary
    });

  } catch (error) {
    return res.status(500).json({ message: 'Gagal mengambil laporan', error });
  }
};


// 📄 Get one report by ID
const getReportById = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('userId validatedBy handledBy')
      .populate({
        path: 'replies.senderId', // Populate sender details for replies
        select: 'name email phone role' // Select the fields you want to return for the sender (you can adjust based on your needs)
      });;
    if (!report) return res.status(404).json({ message: 'Laporan tidak ditemukan' });
    res.status(200).json(report);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil laporan', error });
  }
};

// 📄 Get one report by ID
const getReportByUser = async (req, res) => {
  try {
    const userId = req.user._id;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;


    // Filter laporan milik user
    const filter = { userId };

    // Data laporan dengan pagination
    const [reports, total, statusCounts] = await Promise.all([
      Report.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId validatedBy handledBy'),
      Report.countDocuments(filter),
      Report.aggregate([
        { $match: { userId: userId } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // Mapping status counts
    const summary = {
      menunggu: 0,
      diproses: 0,
      selesai: 0
    };

    statusCounts.forEach(item => {
      switch (item._id) {
        case "menunggu":
          summary.menunggu = item.count;
          break;
        case "diproses":
          summary.diproses = item.count;
          break;
        case "selesai":
          summary.selesai = item.count;
          break;
      }
    });

    return res.status(200).json({
      data: reports,
      totalItems: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      summary
    });

  } catch (error) {
    return res.status(500).json({ message: 'Gagal mengambil laporan', error });
  }
};


// 📝 Create new report (by student)
const createReport = async (req, res) => {
  try {
    const { title, description, category } = req.body;
    const userId = req.user._id; // Pastikan middleware auth menambahkan req.user

    // Menyimpan laporan baru, termasuk gambar jika ada
    const attachment = req.file ? `/uploads/${req.file.filename}` : null; // Mengambil path gambar jika ada

    const newReport = new Report({
      title,
      description,
      category,
      userId,
      status: 'menunggu',
      attachment,
      statusHistory: [
        {
          status: 'menunggu',
          updatedBy: userId,
        },
      ],
    });

    await newReport.save();
    res.status(201).json(newReport);
  } catch (error) {
    res.status(500).json({ message: 'Gagal membuat laporan', error });
  }
};

// ✏️ Update status and optionally add validation info
const updateReportStatus = async (req, res) => {
  try {
    const { status, updatedBy } = req.body;
    const report = await Report.findById(req.params.id);

    if (!report) return res.status(404).json({ message: 'Laporan tidak ditemukan' });

    report.status = status;
    report.updatedAt = new Date();
    report.statusHistory.push({ status, updatedBy });

    if (status === 'validated') {
      report.validatedBy = updatedBy;
      report.validatedAt = new Date();
    }

    if (status === 'diproses') {
      report.handledBy = updatedBy;
    }

    await report.save();
    res.status(200).json(report);
  } catch (error) {
    console.error('Error update status:', error);
    res.status(500).json({ message: 'Gagal memperbarui status laporan', error });
  }
};

// 💬 Add reply to report
const addReply = async (req, res) => {
  try {
    const { senderId, senderRole, message } = req.body;
    const report = await Report.findById(req.params.id);

    if (!report) return res.status(404).json({ message: 'Laporan tidak ditemukan' });

    report.replies.push({
      senderId,
      senderRole,
      message
    });

    report.updatedAt = new Date();

    await report.save();
    res.status(200).json(report);
  } catch (error) {
    console.error('Error adding reply:', error);
    res.status(500).json({ message: `Gagal menambahkan tanggapan.`, error });
  }
};

// HANDLE REPORT
const handleReport = async (req, res) => {
  try {

    const reportId = req.params.id;

    const { status } = req.body; // Status baru yang akan diubah

    const officerId = req.user._id; // ID petugas yang sedang menangani laporan

    // Cek apakah status yang diterima valid
    const validStatuses = ['menunggu', 'diproses', 'selesai', 'dibatalkan'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Status tidak valid' });
    }

    // Cari laporan berdasarkan ID
    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ message: 'Laporan tidak ditemukan' });
    }

    // Jika status laporan belum diproses, kita set handledBy
    report.status = status;
    report.handledBy = officerId; // Menambahkan ID petugas yang menangani

    // Simpan perubahan pada laporan
    await report.save();

    return res.status(200).json({
      message: 'Laporan berhasil diperbarui',
      data: report,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Gagal memproses laporan', error });
  }
};

const getWeeklyReportStats = async (req, res) => {
  try {
    // Get the start and end date for the last 7 days
    const endDate = moment().startOf('day').add(1, 'days');;
    const startDate = moment().subtract(7, 'days').startOf('day');

    // Aggregating reports by day of the week within the last 7 days
    const reports = await Report.aggregate([
      {
        // Filter reports within the last 7 days
        $match: {
          createdAt: {
            $gte: startDate.toDate(),
            $lte: endDate.toDate()
          }
        }
      },
      {
        $project: {
          createdAt: 1
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },  // Format the date into YYYY-MM-DD
          totalReports: { $sum: 1 }  // Count total reports for each date
        }
      },
      {
        $sort: { "_id": 1 }  // Sort by date in ascending order
      }
    ]);

    // Format the result to match the expected output with day of the week and date combined
    const formattedData = reports.map((report) => {
      const date = moment(report._id); // Convert the date string back to moment object
      return {
        name: `${date.format('dddd, D MMM YYYY')}`, // 'Sabtu, 25 Apr 2025'
        totalReports: report.totalReports
      };
    });

    res.status(200).json(formattedData);
  } catch (error) {
    console.error("Error fetching weekly report stats:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteReport = async (req, res) => {
  const { id } = req.params; // Get report ID from the URL parameters

  try {
    const deletedReport = await Report.findByIdAndDelete(id); // Delete the report by ID

    if (!deletedReport) {
      return res.status(404).json({ message: "Report not found" }); // If no report is found
    }

    res.status(200).json({ message: "Report deleted successfully" }); // Successfully deleted
  } catch (error) {
    console.error("Error deleting report:", error);
    res.status(500).json({ message: "Server error" }); // Handle errors
  }
};

let gfs;
const conn = mongoose.connection;

// Inisialisasi GridFS
conn.once('open', () => {
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('uploads'); // Tentukan collection untuk file
});

// Set up multer untuk menyimpan file di memory
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Fungsi untuk upload gambar
const uploadImage = async (req, res) => {
  const file = req.file;
  const reportId = req.params.reportId; // Mendapatkan reportId dari parameter URL

  if (!file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const writestream = gfs.createWriteStream({
    filename: file.originalname,
    content_type: file.mimetype,
  });

  writestream.write(file.buffer);
  writestream.end();

  writestream.on('close', async (file) => {
    try {
      // Menemukan laporan berdasarkan reportId
      const report = await Report.findById(reportId);
      if (!report) {
        return res.status(404).json({ message: 'Report not found' });
      }

      // Menambahkan ID file ke dalam laporan
      report.attachments.push(file._id);
      await report.save();

      res.status(200).json({
        message: 'File uploaded and associated with report successfully!',
        fileId: file._id,
        filename: file.filename,
      });
    } catch (error) {
      res.status(500).json({ message: 'Error saving report with file', error });
    }
  });
};

// Fungsi untuk mengambil gambar berdasarkan ID
const getImage = (req, res) => {
  const { id } = req.params;

  gfs.files.findOne({ _id: mongoose.Types.ObjectId(id) }, (err, file) => {
    if (err || !file) {
      return res.status(404).json({ message: 'File not found' });
    }

    const readstream = gfs.createReadStream(file.filename);
    res.set('Content-Type', file.contentType);
    readstream.pipe(res);
  });
};


export {
  getAllReports,
  getReportById,
  getReportByUser,
  createReport,
  updateReportStatus,
  addReply,
  handleReport,
  getWeeklyReportStats,
  deleteReport,
  uploadImage,
  getImage
}
