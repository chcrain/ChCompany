require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const AWS = require('aws-sdk'); // ✅ Import AWS SDK for Cloudflare R2
const fs = require('fs');
const path = require('path');
const morgan = require('morgan'); // ✅ Logging Middleware

const app = express();

// ✅ Log Cloudflare Credentials (For Debugging)
console.log('Cloudflare Credentials:', {
  CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID || 'MISSING',
  CLOUDFLARE_BUCKET_NAME: process.env.CLOUDFLARE_BUCKET_NAME || 'MISSING',
  CLOUDFLARE_ACCESS_KEY_ID: process.env.CLOUDFLARE_ACCESS_KEY_ID || 'MISSING',
  CLOUDFLARE_SECRET_ACCESS_KEY: process.env.CLOUDFLARE_SECRET_ACCESS_KEY || 'MISSING',
});


// ✅ Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev')); // ✅ Logs all requests

// ✅ Configure Multer for File Uploads
const upload = multer({ dest: 'uploads/' });

// ✅ Cloudflare R2 Configuration (AWS SDK)
const s3 = new AWS.S3({
  endpoint: new AWS.Endpoint(`https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`),
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
      console.error('❌ No file uploaded');
      return res.status(400).json({ result: 'error', message: 'No file uploaded' });
    }

    // Get additional parameters from the request
    const { username, exitName, latitude, longitude } = req.body;
    if (!username || !exitName || !latitude || !longitude) {
      return res.status(400).json({ 
        result: 'error', 
        message: 'Missing required parameters: username, exitName, latitude, longitude' 
      });
    }

    console.log('📦 Received Request Body:', req.body);
    console.log('🖼️ Received File:', req.file);

    // Upload to Cloudflare R2
    const filePath = req.file.path;
    const fileStream = fs.createReadStream(filePath);
    const fileExtension = path.extname(req.file.originalname);
    const cloudFileName = `${Date.now()}_${req.file.filename}${fileExtension}`;

    const uploadParams = {
      Bucket: process.env.CLOUDFLARE_BUCKET_NAME,
      Key: cloudFileName,
      Body: fileStream,
      ContentType: req.file.mimetype,
    };

    console.log('🚀 Uploading file to Cloudflare R2...');
    const uploadResponse = await s3.upload(uploadParams).promise();
    console.log('✅ Upload Successful:', uploadResponse);

    // Clean up local file
    fs.unlinkSync(filePath);

    // Generate the R2.dev URL
    const r2DevUrl = `https://pub-${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.dev/${cloudFileName}`;

    // Make request to Google Apps Script web app
    const googleScriptUrl = 'https://script.google.com/macros/s/AKfycbyboJUnpe14yc-IFsnUMOYmMFUQtCNShc9qdDyrElPoy8tmNPY4sLIqEE7awBt3mGVJ/exec';
    const response = await fetch(googleScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'logImage',
        username,
        exitName,
        imageUrl: r2DevUrl,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      })
    });

    const scriptResponse = await response.json();
    if (scriptResponse.result !== 'success') {
      throw new Error(scriptResponse.message);
    }

    return res.status(200).json({
      result: 'success',
      message: 'File uploaded and logged successfully',
      fileUrl: r2DevUrl
    });
  } catch (error) {
    console.error('❌ Upload Error:', error);
    return res.status(500).json({ result: 'error', message: 'Failed to process upload' });
  }
});// ✅ Global Error Handler
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
