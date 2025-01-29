require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

// ✅ 1) Upload Controller
exports.uploadImage = async (req, res) => {
  try {
    // 🔹 Validate Request
    if (!req.file) {
      return res.status(400).json({ result: 'error', message: 'No image file uploaded.' });
    }

    // 🔹 Extract Data from Request
    const { username, exitName, latitude, longitude } = req.body;
    const file = req.file;
    const fileExtension = path.extname(file.originalname) || '.jpg';
    const uniqueFileName = `${uuidv4()}${fileExtension}`;
    const fileContent = fs.readFileSync(file.path);

    // 🔹 Cloudflare R2 Upload using API Token
    const uploadResponse = await axios.put(
      `${process.env.CLOUDFLARE_ENDPOINT}/${process.env.CLOUDFLARE_BUCKET_NAME}/${uniqueFileName}`,
      fileContent,
      {
        headers: {
          'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          'Content-Type': file.mimetype,
          'x-amz-acl': 'public-read',
        }
      }
    );

    if (uploadResponse.status === 200 || uploadResponse.status === 201) {
      const imageUrl = `${process.env.CLOUDFLARE_ENDPOINT}/${process.env.CLOUDFLARE_BUCKET_NAME}/${uniqueFileName}`;
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
    } else {
      throw new Error(`Cloudflare upload failed with status ${uploadResponse.status}`);
    }
  } catch (error) {
    console.error("❌ Upload Error:", error.message);
    if (req.file && req.file.path) {
      fs.promises.unlink(req.file.path).catch(console.error);
    }
    return res.status(500).json({ result: 'error', message: error.message });
  }
};
