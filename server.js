require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const { S3 } = require('aws-sdk'); // ✅ Import AWS SDK
const fs = require('fs');
const path = require('path');
const morgan = require('morgan'); // ✅ Import Morgan for logging

const app = express();

// ✅ Log Cloudflare Credentials (Debugging `.env` issues)
console.log('Cloudflare Credentials:', {
  CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID || 'MISSING',
  CLOUDFLARE_BUCKET_NAME: process.env.CLOUDFLARE_BUCKET_NAME || 'MISSING',
  CLOUDFLARE_ACCESS_KEY_ID: process.env.CLOUDFLARE_ACCESS_KEY_ID || 'MISSING',
  CLOUDFLARE_SECRET_ACCESS_KEY: process.env.CLOUDFLARE_SECRET_ACCESS_KEY ? 'LOADED' : 'MISSING', // Avoid printing secret keys
});

// ✅ Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev')); // ✅ Logs all incoming requests in 'dev' mode

// ✅ Configure Multer (File Upload)
const upload = multer({ dest: 'uploads/' });

// ✅ Cloudflare R2 Configuration (AWS SDK)
const s3 = new S3({
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`, 
  accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID,
  secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
  signatureVersion: 'v4',
});

// ✅ Root Route (For Testing)
app.get('/', (req, res) => {
  res.status(200).send('🚀 Server is running!');
});

// ✅ Upload Route (Handles Image Uploads)
app.post('/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ result: 'error', message: 'No file uploaded' });
    }

    console.log('Received Request Body:', req.body);
    console.log('Received File:', req.file);

    // ✅ Read the file from local storage
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

// ✅ Global Error Handler (Catches All Unexpected Errors)
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.message);
  res.status(500).json({ result: 'error', message: 'Internal server error' });
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;

// ✅ Prevent "Address Already in Use" Error
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
