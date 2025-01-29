// controllers/uploadController.js

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { validationResult } = require('express-validator');

exports.uploadImage = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Delete the uploaded file if validation fails
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
    return res.status(400).json({ result: 'error', message: 'Invalid input data.', errors: errors.array() });
  }

  const { exitName, latitude, longitude } = req.body;
  const file = req.file;

  try {
    // Read the Uploaded File
    const fileContent = fs.readFileSync(file.path);
    const fileExtension = path.extname(file.originalname);
    const uniqueFileName = `${uuidv4()}${fileExtension}`;

    // Construct Cloudflare R2 URL
    const r2Url = `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.CLOUDFLARE_BUCKET_NAME}/${uniqueFileName}`;

    // Upload Image to Cloudflare R2
    const uploadResponse = await axios.put(r2Url, fileContent, {
      headers: {
        'Content-Type': file.mimetype,
        'x-amz-acl': 'public-read', // Optional: Make the file publicly accessible
      },
      auth: {
        username: process.env.CLOUDFLARE_ACCESS_KEY_ID,
        password: process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
      },
    });

    // Check Upload Success
    if (uploadResponse.status === 200 || uploadResponse.status === 201) {
      const imageUrl = r2Url;

      // Log Image Data to Google Sheets via Apps Script
      const logResponse = await axios.post(process.env.GOOGLE_SHEET_URL, {
        action: 'logImage',
        exitName: exitName,
        imageUrl: imageUrl,
        latitude: latitude,
        longitude: longitude,
      });

      if (logResponse.data.result === 'success') {
        // Delete the Temporary File After Successful Upload
        fs.unlinkSync(file.path);
        return res.status(200).json({ result: 'success', imageUrl: imageUrl });
      } else {
        // If Logging to Google Sheets Fails
        console.error('Failed to log image to Google Sheets:', logResponse.data.message);
        return res.status(500).json({ result: 'error', message: 'Failed to log image to Google Sheets.' });
      }
    } else {
      console.error('Failed to upload image to Cloudflare R2:', uploadResponse.statusText);
      return res.status(500).json({ result: 'error', message: 'Failed to upload image to Cloudflare R2.' });
    }
  } catch (error) {
    console.error('Error uploading image:', error.response ? error.response.data : error.message);

    // Handle Specific Errors
    if (error.message === 'Invalid file type. Only JPEG, PNG, and GIF are allowed.') {
      return res.status(400).json({ result: 'error', message: error.message });
    }

    return res.status(500).json({ result: 'error', message: 'An internal server error occurred.' });
  }
};
