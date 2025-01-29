require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const { body } = require('express-validator');
const morgan = require('morgan'); // ✅ Ensure Morgan is imported

const authenticateToken = require('./middleware/authenticateToken');
const uploadController = require('./controllers/uploadController');

const app = express();

// ✅ Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev')); // ✅ Logs all incoming requests in 'dev' mode

// ✅ Root Route (Avoid "Cannot GET /")
app.get('/', (req, res) => {
  res.status(200).send('🚀 Server is running!');
});

// ✅ Multer Config (for handling file uploads)
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed.'));
    }
  }
});

// ✅ Upload Route (Protect it with authenticateToken if needed)
app.post('/upload-image', upload.single('image'), (req, res) => {
  console.log('Received Request Body:', req.body);
  console.log('Received File:', req.file);

  if (!req.file) {
    return res.status(400).json({ result: 'error', message: 'No file uploaded' });
  }

  res.status(200).json({ result: 'success', message: 'File uploaded successfully' });
});



// ✅ Global Error Handler (Catches all unexpected errors)
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.message);
  res.status(500).json({ result: 'error', message: 'Internal server error' });
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
