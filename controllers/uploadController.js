// controllers/uploadController.js

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { validationResult } = require('express-validator');

exports.uploadImage = async (req, res) => {
  // 1) Validate incoming fields (username, exitName, latitude, longitude, etc.)
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    if (req.file && req.file.path) {
      // Delete the uploaded file if validation fails
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
    return res.status(400).json({
      result: 'error',
      message: 'Invalid input.',
      errors: errors.array(),
    });
  }

  // Make sure we grab "username" from the request, in addition to exitName, latitude, longitude
  const { username, exitName, latitude, longitude } = req.body;
  const file = req.file;
  if (!file) {
    return res.status(400).json({
      result: 'error',
      message: 'No image file uploaded.',
    });
  }

  try {
    // 2) Read the temporary file from disk
    const fileContent = fs.readFileSync(file.path);
    const fileExtension = path.extname(file.originalname) || '.jpg';
    const uniqueFileName = `${uuidv4()}${fileExtension}`;

    // 3) Load env vars
    const {
      CLOUDFLARE_ACCOUNT_ID,
      CLOUDFLARE_BUCKET_NAME,
      CLOUDFLARE_ACCESS_KEY_ID,
      CLOUDFLARE_SECRET_ACCESS_KEY,
      GOOGLE_SHEET_URL,
    } = process.env;

    // 4) Construct the R2 destination URL
    const r2Url = `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/${CLOUDFLARE_BUCKET_NAME}/${uniqueFileName}`;

    // 5) Upload to Cloudflare R2
    const uploadResponse = await axios.put(r2Url, fileContent, {
      headers: {
        'Content-Type': file.mimetype,
        'x-amz-acl': 'public-read', // Optional: public-read
      },
      auth: {
        username: CLOUDFLARE_ACCESS_KEY_ID,
        password: CLOUDFLARE_SECRET_ACCESS_KEY,
      },
    });

    if (uploadResponse.status === 200 || uploadResponse.status === 201) {
      // If upload succeeded, build the final image URL
      const imageUrl = r2Url;

      // 6) POST to your new Google script with action: "logImage"
      // IMPORTANT: now includes "username"
      const logResponse = await axios.post(GOOGLE_SHEET_URL, {
        action: 'logImage',
        username,   // <--- So the script knows which user sheet to update
        exitName,
        imageUrl,
        latitude,
        longitude,
      });

      if (logResponse.data.result === 'success') {
        // Clean up local temp file
        fs.unlinkSync(file.path);

        return res.status(200).json({ result: 'success', imageUrl });
      } else {
        console.error('Failed to log to Sheets:', logResponse.data.message);
        return res.status(500).json({
          result: 'error',
          message: 'Failed to log image to Google Sheets.'
        });
      }
    } else {
      console.error('Cloudflare upload error:', uploadResponse.statusText);
      return res.status(500).json({
        result: 'error',
        message: 'Upload to Cloudflare failed.'
      });
    }
  } catch (error) {
    console.error('Error uploading:', error.message);

    // Clean up temp file on error
    if (file && file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    return res.status(500).json({
      result: 'error',
      message: error.message
    });
  }
};
