require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { validationResult } = require('express-validator');
const AWS = require('aws-sdk');  // ✅ Use AWS SDK instead of axios
const axios = require('axios');

// ✅ 1) Configure Cloudflare R2
const r2 = new AWS.S3({
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID,
  secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
  signatureVersion: 'v4', // Required for Cloudflare R2
});

// ✅ 2) Upload Controller
exports.uploadImage = async (req, res) => {
  try {
    // 🔹 Validate Request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ result: 'error', message: 'Invalid input.', errors: errors.array() });
    }

    // 🔹 Extract Data from Request
    const { username, exitName, latitude, longitude } = req.body;
    const file = req.file;
    if (!file) {
      return res.status(400).json({ result: 'error', message: 'No image file uploaded.' });
    }

    // 🔹 Read File & Generate Unique Name
    const fileExtension = path.extname(file.originalname) || '.jpg';
    const uniqueFileName = `${uuidv4()}${fileExtension}`;
    const fileStream = fs.createReadStream(file.path);

    // 🔹 Cloudflare R2 Upload
    const uploadParams = {
      Bucket: process.env.CLOUDFLARE_BUCKET_NAME,
      Key: uniqueFileName,
      Body: fileStream,
      ContentType: file.mimetype,
      ACL: 'public-read',
    };

    console.log("🚀 Uploading to Cloudflare R2:", uploadParams.Key);
    await r2.upload(uploadParams).promise();

    // 🔹 Construct Public URL
    const imageUrl = `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.CLOUDFLARE_BUCKET_NAME}/${uniqueFileName}`;
    
    console.log("✅ Cloudflare Upload Successful:", imageUrl);

    // 🔹 Log to Google Sheets
    const logResponse = await axios.post(process.env.GOOGLE_SHEET_URL, {
      action: 'logImage',
      username,
      exitName,
      imageUrl,
      latitude,
      longitude,
    });

    if (logResponse.data.result !== 'success') {
      throw new Error('Failed to log image to Google Sheets.');
    }

    // 🔹 Delete Temporary File
    fs.promises.unlink(file.path).catch(console.error);

    // 🔹 Return Success Response
    return res.status(200).json({ result: 'success', imageUrl });

  } catch (error) {
    console.error("❌ Upload Error:", error.message);

    // Cleanup if error occurs
    if (req.file && req.file.path) {
      fs.promises.unlink(req.file.path).catch(console.error);
    }

    return res.status(500).json({ result: 'error', message: error.message });
  }
};
