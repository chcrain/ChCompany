require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const { body } = require('express-validator');
const morgan = require('morgan'); // ✅ Logging
const fs = require('fs');
const path = require('path');
const { S3 } = require('aws-sdk'); // ✅ AWS SDK for Cloudflare R2

const authenticateToken = require('./middleware/authenticateToken');
const uploadController = require('./controllers/uploadController');

const app = express();

// ✅ Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev')); // ✅ Logs all incoming requests in 'dev' mode

// ✅ Cloudflare R2 Configuration
const s3 = new S3({
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`, 
  accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID,
  secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
  signatureVersion: 'v4',
});

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

// ✅ Upload Route (Uploads file to Cloudflare R2)
app.post('/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ result: 'error', message: 'No file uploaded' });
    }

    console.log('Received Request Body:', req.body);
    console.log('Received File:', req.file);

    // Read file from local uploads folder
    const filePath = req.file.path;
    const fileStream = fs.createReadStream(filePath);
    const fileExtension = path.extname(req.file.originalname);
    const cloudFileName = `${Date.now()}_${req.file.filename}${fileExtension}`;

    // ✅ Upload to Cloudflare R2
    const uploadParams = {
      Bucket: process.env.CLOUDFLARE_BUCKET_NAME,
      Key: cloudFileName,
      Body: fileStream,
      ContentType: req.file.mimetype,
    };

    await s3.upload(uploadParams).promise();

    // ✅ Cleanup local file after successful upload
    fs.unlinkSync(filePath);

    return res.status(200).json({
      result: 'success',
      message: 'File uploaded successfully',
      fileUrl: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.CLOUDFLARE_BUCKET_NAME}/${cloudFileName}`
    });
  } catch (error) {
    console.error('Upload Error:', error);
    return res.status(500).json({ result: 'error', message: 'Failed to upload file' });
  }
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
