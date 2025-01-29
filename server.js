// server.js

const express = require('express');
const multer = require('multer');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');
const winston = require('winston');

// Configure Environment Variables
dotenv.config();

// Initialize Express App
const app = express();

// Configure Multer for File Uploads
const upload = multer({ 
  dest: 'uploads/', // Temporary storage for uploaded files
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed.'));
    }
  }
});

// Destructure Environment Variables
const {
  PORT,
  CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_BUCKET_NAME,
  CLOUDFLARE_ACCESS_KEY_ID,
  CLOUDFLARE_SECRET_ACCESS_KEY,
  GOOGLE_SHEET_URL,
  API_KEY,
} = process.env;

// CORS Configuration - Allow All Origins for Mobile Apps
app.use(cors({
  origin: '*', // Allow all origins since CORS is not a concern for mobile apps
  methods: ['POST'],
  allowedHeaders: ['Content-Type', 'Authorization'], // Adjust headers as needed
}));

// Use Helmet to Set Security Headers
app.use(helmet());

// Rate Limiting to Prevent Abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes.',
});
app.use(limiter);

// Middleware to Parse JSON Bodies
app.use(express.json());

// Initialize Winston Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// If Not in Production, Also Log to Console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Import Controllers and Middleware
const authController = require('./controllers/authController');
const uploadController = require('./controllers/uploadController');
const authenticateToken = require('./middleware/authenticateToken');

// Routes
app.post('/register', [
  body('username').isString().notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
], authController.register);

app.post('/login', [
  body('email').isEmail(),
  body('password').isString().notEmpty(),
], authController.login);

app.post('/upload-image', authenticateToken, upload.single('image'), [
  body('exitName').isString().notEmpty(),
  body('latitude').isFloat({ min: -90, max: 90 }),
  body('longitude').isFloat({ min: -180, max: 180 }),
], uploadController.uploadImage);

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled Error:', err.message);
  if (err instanceof multer.MulterError) {
    // Handle Multer-specific errors
    return res.status(400).json({ result: 'error', message: err.message });
  }
  res.status(500).json({ result: 'error', message: 'An unexpected error occurred.' });
});

// Start the Server
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});
