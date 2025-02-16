const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { Pool } = require("pg");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// PostgreSQL connection using environment variable
const pool = new Pool({
  connectionString: process.env.POSTGRES_CONNECTION_URL, // Ensure this is set in Render
  ssl: { rejectUnauthorized: false },
});

// Configure Multer to use memory storage for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Configure the S3 client for Cloudflare R2
const s3 = new S3Client({
  region: "auto", // For R2, the region is "auto"
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
  },
});

// Route to handle image upload to Cloudflare R2
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Create a unique filename using a timestamp
    const filename = `${Date.now()}_${file.originalname}`;

    // Upload the file to R2 using the PutObjectCommand
    const params = {
      Bucket: process.env.CLOUDFLARE_BUCKET_NAME, // e.g., "allentown"
      Key: filename,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    const command = new PutObjectCommand(params);
    await s3.send(command);

    // Construct the public URL for the uploaded file.
    // Format: https://{bucket}.{account_id}.r2.cloudflarestorage.com/{filename}
    const publicUrl = `https://${process.env.CLOUDFLARE_BUCKET_NAME}.${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/${filename}`;

    res.json({ url: publicUrl });
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({ error: "Failed to upload image" });
  }
});

// Route to add a new product to PostgreSQL
app.post("/add-product", async (req, res) => {
  try {
    const { name, description, price, imageUrl, market } = req.body;
    const result = await pool.query(
      "INSERT INTO products (name, description, price, imageUrl, market) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [name, description, price, imageUrl, market]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json({ error: "Failed to add product" });
  }
});

// Route to fetch products
// If the query parameter `all=true` is provided, return all products.
// Otherwise, return only those where market = TRUE.
app.get("/products", async (req, res) => {
  try {
    const showAll = req.query.all === "true";
    const query = showAll
      ? "SELECT * FROM products"
      : "SELECT * FROM products WHERE market = TRUE";
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Failed to fetch product data" });
  }
});

// Start the Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
