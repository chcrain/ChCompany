
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { Pool } = require("pg");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
require("dotenv").config();

const app = express();

// Enhanced CORS configuration
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// PostgreSQL connection using environment variable
const pool = new Pool({
  connectionString: process.env.POSTGRES_CONNECTION_URL,
  ssl: { rejectUnauthorized: false },
});

// Configure Multer with enhanced error handling and logging
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log('File filter checking:', file.mimetype);
    
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  }
}).single('file'); // Configure single file upload middleware
}).single('file'); // Single file upload middleware

// Configure the S3 client for Cloudflare R2
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
  },
});

// Enhanced upload route with better error handling and logging
app.post("/upload", (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({ 
        error: "File upload error", 
        details: err.message 
      });
    }

    try {
      console.log('Upload request received');

      // Create a unique filename
      const filename = `${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`;

      console.log('Attempting R2 upload:', filename);

      // Verify R2 credentials before upload
      console.log('R2 configuration check:', {
        hasAccountId: !!process.env.CLOUDFLARE_ACCOUNT_ID,
        hasAccessKey: !!process.env.CLOUDFLARE_ACCESS_KEY_ID,
        hasSecretKey: !!process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
        hasBucketName: !!process.env.CLOUDFLARE_BUCKET_NAME
      });

      const params = {
        Bucket: process.env.CLOUDFLARE_BUCKET_NAME,
        Key: filename,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      };

      const command = new PutObjectCommand(params);
      await s3.send(command);

      const publicUrl = `https://${process.env.CLOUDFLARE_BUCKET_NAME}.${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/${filename}`;
      // Construct the public URL using the public domain from the environment variable
      const publicUrl = `https://${process.env.CLOUDFLARE_PUBLIC_DOMAIN}/${filename}`;

      console.log('Upload successful:', publicUrl);

    secretKey: !!process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
    bucketName: !!process.env.CLOUDFLARE_BUCKET_NAME
  });
});
});