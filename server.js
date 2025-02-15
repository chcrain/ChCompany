const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

// PostgreSQL connection (make sure POSTGRES_CONNECTION_URL is set in your Render environment)
const pool = new Pool({
  connectionString: process.env.POSTGRES_CONNECTION_URL,
  ssl: { rejectUnauthorized: false },
});

// Configure Multer for file uploads (using memory storage)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// POST /upload: Handle image upload and return a public URL from your R2 bucket
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    // Construct the public URL using your R2 bucket base URL and the original file name.
    // In a real scenario, you'd upload the file to R2 using an S3-compatible API.
    const publicUrl = `https://pub-c2f46ab877f445158f637f7eb23d276d.r2.dev/${file.originalname}`;
    res.json({ url: publicUrl });
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({ error: "Failed to upload image" });
  }
});

// POST /add-product: Insert a new product into PostgreSQL
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

// GET /products: Retrieve all products that are market-listed
app.get("/products", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products WHERE market = TRUE");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Failed to fetch product data" });
  }
});

// (Optional) Routes for updating or deleting products can be added similarly.

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
