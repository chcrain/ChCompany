/************************************************************
 * server.js - Updated Node/Express Server with fixed R2 config
 ************************************************************/

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { Pool } = require("pg");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const axios = require("axios");

const app = express();

/**
 * --------------------------------------------------
 * 1. CORS Configuration
 * --------------------------------------------------
 */
app.use(
  cors({
    origin: "*", // Allow all origins (you can restrict this if needed)
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);
app.use(express.json());

/**
 * --------------------------------------------------
 * 2. PostgreSQL Database Connection
 * --------------------------------------------------
 */
const pool = new Pool({
  connectionString: process.env.POSTGRES_CONNECTION_URL,
  ssl: { rejectUnauthorized: false },
});

/**
 * --------------------------------------------------
 * 3. Multer Configuration for File Uploads
 * --------------------------------------------------
 */
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

/**
 * --------------------------------------------------
 * 4. Cloudflare R2 Configuration - FIXED
 * --------------------------------------------------
 */
// Extract just the account ID from the environment variable
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.replace('.r2.dev', '');

console.log("🔍 Checking Cloudflare R2 credentials...");
console.log("CLOUDFLARE_ACCOUNT_ID (cleaned):", accountId);
console.log(
  "CLOUDFLARE_ACCESS_KEY_ID:",
  process.env.CLOUDFLARE_ACCESS_KEY_ID ? "✅ Exists" : "❌ Missing"
);
console.log(
  "CLOUDFLARE_SECRET_ACCESS_KEY:",
  process.env.CLOUDFLARE_SECRET_ACCESS_KEY ? "✅ Exists" : "❌ Missing"
);
console.log("CLOUDFLARE_BUCKET_NAME:", process.env.CLOUDFLARE_BUCKET_NAME);

// Create S3 client with corrected endpoint
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
  },
});

/**
 * --------------------------------------------------
 * 5. Hugging Face AI Chat Endpoint
 * --------------------------------------------------
 */
app.post("/api/chat", async (req, res) => {
  const userInput = req.body.prompt;
  console.log("AI prompt received:", userInput);

  try {
    const response = await axios.post(
      "https://api-inference.huggingface.co/models/tiiuae/falcon-7b-instruct",
      { inputs: userInput },
      {
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Falcon-7B-Instruct returns an array with 'generated_text'
    res.json({ reply: response.data[0].generated_text });
  } catch (error) {
    console.error("Hugging Face API Error:", error.response?.data || error.message);
    res.status(500).json({ error: "AI request failed" });
  }
});

/**
 * --------------------------------------------------
 * 6. Image Upload to Cloudflare R2 - ENHANCED ERROR HANDLING
 * --------------------------------------------------
 */
app.post("/upload", (req, res) => {
  upload(req, res, async (err) => {
    // Handle Multer errors first
    if (err) {
      console.error("❌ Multer error:", err);
      return res.status(400).json({
        error: "File upload error",
        details: err.message,
      });
    }

    try {
      console.log("Upload request received");
      console.log("Request body:", req.body);

      // Check if file exists
      if (!req.file) {
        console.log("❌ No file found in request");
        return res.status(400).json({ error: "No file uploaded" });
      }

      console.log("✅ File details:", {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      });

      // Generate a unique filename
      const filename = `${Date.now()}_${req.file.originalname.replace(
        /\s+/g,
        "_"
      )}`;

      console.log("🔄 Attempting R2 upload:", filename);

      // More detailed R2 configuration check
      const r2Config = {
        hasAccountId: !!accountId,
        cleanedAccountId: accountId,
        hasAccessKey: !!process.env.CLOUDFLARE_ACCESS_KEY_ID,
        hasSecretKey: !!process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
        bucketName: process.env.CLOUDFLARE_BUCKET_NAME,
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      };
      console.log("R2 configuration check:", r2Config);

      // Prepare S3/R2 upload parameters
      const params = {
        Bucket: process.env.CLOUDFLARE_BUCKET_NAME,
        Key: filename,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      };

      try {
        // Send to Cloudflare R2
        const command = new PutObjectCommand(params);
        await s3.send(command);

        // Construct the public URL using your public domain
        const publicUrl = `https://${process.env.CLOUDFLARE_PUBLIC_DOMAIN}/${filename}`;
        console.log("✅ Upload successful:", publicUrl);

        // Return the new image URL
        res.json({ imageUrl: publicUrl });
      } catch (r2Error) {
        console.error("❌ R2 upload error:", r2Error);
        res.status(500).json({
          error: "Failed to upload image to R2 storage",
          details: r2Error.message,
          code: r2Error.code,
        });
      }
    } catch (error) {
      console.error("❌ Error in upload process:", error);
      res.status(500).json({
        error: "Failed to upload image",
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  });
});

/**
 * --------------------------------------------------
 * 7. Add Product to Database
 * --------------------------------------------------
 */
app.post("/add-product", async (req, res) => {
  try {
    console.log("Received product data:", req.body);

    const { name, description, price, imageUrl, market } = req.body;

    // Basic validation
    if (!name || !price || !imageUrl) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["name", "price", "imageUrl"],
      });
    }

    const result = await pool.query(
      "INSERT INTO products (name, description, price, imageUrl, market) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [name, description, price, imageUrl, market]
    );

    console.log("✅ Product added successfully:", result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error adding product:", error);
    res.status(500).json({
      error: "Failed to add product",
      details: error.message,
    });
  }
});

/**
 * --------------------------------------------------
 * 8. Fetch Products
 * --------------------------------------------------
 */
app.get("/products", async (req, res) => {
  try {
    console.log("Fetching products, show all:", req.query.all);
    const showAll = req.query.all === "true";
    const query = showAll
      ? "SELECT * FROM products"
      : "SELECT * FROM products WHERE market = TRUE";

    const result = await pool.query(query);
    console.log(`Found ${result.rows.length} products`);

    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error fetching products:", error);
    res.status(500).json({
      error: "Failed to fetch product data",
      details: error.message,
    });
  }
});

/**
 * --------------------------------------------------
 * 9. Start the Server
 * --------------------------------------------------
 */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log("Environment check:");
  console.log(
    "- Database URL configured:",
    !!process.env.POSTGRES_CONNECTION_URL
  );
  console.log(
    "- Hugging Face API key configured:",
    !!process.env.HUGGINGFACE_API_KEY
  );
  console.log("- R2 credentials configured:", {
    accountId: accountId,
    accessKey: !!process.env.CLOUDFLARE_ACCESS_KEY_ID,
    secretKey: !!process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
    bucketName: process.env.CLOUDFLARE_BUCKET_NAME,
    publicDomain: process.env.CLOUDFLARE_PUBLIC_DOMAIN,
  });
});