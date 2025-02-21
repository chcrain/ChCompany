/************************************************************
 * server.js - Combined local + R2 upload
 ************************************************************/

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

// AWS S3 SDK for Cloudflare R2
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const app = express();

/**
 * --------------------------------------------------
 * 1. CORS Configuration
 * --------------------------------------------------
 */
app.use(
  cors({
    origin: "*", // or specify your frontend domain
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
 * 3. File Storage Directories
 * --------------------------------------------------
 */
const uploadsDir = path.join(__dirname, "uploads");

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("📁 Created uploads directory:", uploadsDir);
}

// Serve static files from the uploads directory
app.use("/uploads", express.static(uploadsDir));
console.log("📄 Serving static files from:", uploadsDir);

/**
 * --------------------------------------------------
 * 4. Multer Configuration
 * --------------------------------------------------
 */
const storage = multer.memoryStorage(); // store file buffer in memory
const upload = multer({
  storage,
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
}).single("file");

/**
 * --------------------------------------------------
 * 5. Cloudflare R2 Configuration
 * --------------------------------------------------
 */
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.replace(".r2.dev", "") || "";
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
 * 6. Hugging Face AI Chat Endpoint
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
 * 7. Image Upload (Local + R2)
 * --------------------------------------------------
 */
app.post("/upload", (req, res) => {
  upload(req, res, async (err) => {
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

      if (!req.file) {
        console.log("❌ No file found in request");
        return res.status(400).json({ error: "No file uploaded" });
      }

      console.log("✅ File details:", {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      });

      // 1) Generate a unique filename
      const rawName = req.file.originalname.replace(/\s+/g, "_");
      const timestamp = Date.now();
      const filename = `${timestamp}_${rawName}`;

      // 2) Save file locally
      const filePath = path.join(uploadsDir, filename);
      fs.writeFileSync(filePath, req.file.buffer);
      console.log("✅ File saved locally:", filePath);

      // 3) Upload to Cloudflare R2
      console.log("🔄 Attempting R2 upload:", filename);
      const uploadParams = {
        Bucket: process.env.CLOUDFLARE_BUCKET_NAME, // e.g. 'allentown'
        Key: filename,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      };

      await s3.send(new PutObjectCommand(uploadParams));
      console.log("✅ R2 upload success:", filename);

      // 4) Construct image URLs
      const serverUrl = process.env.SERVER_URL || `https://chcompany.onrender.com`;
      const localUrl = `${serverUrl}/uploads/${filename}`;

      // If your bucket is public via R2.dev subdomain:
      // e.g. https://<bucket>.<accountId>.r2.dev/<filename>
      const r2Url = `https://${process.env.CLOUDFLARE_BUCKET_NAME}.${accountId}.r2.dev/${filename}`;

      // Alternatively, for the standard endpoint:
      // const r2Url = `https://${accountId}.r2.cloudflarestorage.com/${process.env.CLOUDFLARE_BUCKET_NAME}/${filename}`;

      console.log("✅ Local URL:", localUrl);
      console.log("✅ R2 URL:", r2Url);

      // Return both URLs
      res.json({ localUrl, r2Url });
    } catch (error) {
      console.error("❌ Error during upload:", error);
      res.status(500).json({
        error: "Failed to upload image",
        details: error.message,
      });
    }
  });
});

/**
 * --------------------------------------------------
 * 8. Add Product to Database
 * --------------------------------------------------
 */
app.post("/add-product", async (req, res) => {
  try {
    console.log("Received product data:", req.body);

    const { name, description, price, imageUrl, market } = req.body;

    if (!name || !price || !imageUrl) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["name", "price", "imageUrl"],
      });
    }

    const result = await pool.query(
      `INSERT INTO products (name, description, price, "imageUrl", market)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
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
 * 9. Fetch Products
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
 * 10. Start the Server
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
  console.log("- Server URL:", process.env.SERVER_URL || `https://chcompany.onrender.com`);
  console.log("- File uploads directory:", uploadsDir);
});
