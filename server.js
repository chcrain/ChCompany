\const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { Pool } = require("pg");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const axios = require("axios");
require("dotenv").config();

const app = express();

// Enhanced CORS configuration
app.use(
  cors({
    origin: "*", // Allow all origins
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

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
    console.log("File filter checking:", file.mimetype);
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
}).single("file"); // Single file upload middleware

// Configure the S3 client for Cloudflare R2
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
  },
});

// ===== Hugging Face AI Chat Integration =====
// This route receives a prompt and sends it to the Hugging Face API.
// ===== Hugging Face AI Chat Integration =====
app.post("/api/chat", async (req, res) => {
  const userInput = req.body.prompt;

@@ -62,20 +63,23 @@

  try {
    const response = await axios.post(
      ""https://api-inference.huggingface.co/models/tiiuae/falcon-7b-instruct", // Correct model name
      "https://api-inference.huggingface.co/models/tiiuae/falcon-7b-instruct", // Single quotes, no extra quotes
      { inputs: userInput },
      { headers: { Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}` } }
      {
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json({ reply: response.data[0].generated_text });
  } catch (error) {
    console.error(
      "Hugging Face API Error:",
      error.response?.data || error.message
    );
    console.error("Hugging Face API Error:", error.response?.data || error.message);
    res.status(500).json({ error: "AI request failed" });
  }
});

// ===== End of AI Chat Integration =====

// Enhanced upload route with better error handling and logging
