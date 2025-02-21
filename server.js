const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { Pool } = require("pg");
const axios = require("axios"); // Add axios to your dependencies
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

// Worker upload route
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
      console.log('Preparing upload:', filename);

      // The Worker URL
      const workerUrl = "https://r2-image-proxy.chcrain94.workers.dev";
      
      try {
        // Send the file to your worker
        console.log('Sending file to worker:', workerUrl);
        const response = await axios.post(`${workerUrl}/upload`, 
          req.file.buffer,
          {
            headers: {
              'Content-Type': req.file.mimetype,
              'X-Filename': filename
            }
          }
        );
        
        console.log('Worker upload response:', response.status);
        
        // Get the URL from the worker response
        const fileUrl = response.data.url;
        console.log('Upload successful:', fileUrl);
        
        res.json({ url: fileUrl });
      } catch (uploadError) {
        console.error('Error during worker upload:', uploadError.message);
        if (uploadError.response) {
          console.error('Worker response:', uploadError.response.status, uploadError.response.data);
        }
        throw uploadError;
      }
    } catch (error) {
      console.error("Error in upload process:", error.message);
      res.status(500).json({ 
        error: "Failed to upload image",
        details: error.message
      });
    }
  });
});

// Enhanced product addition route
app.post("/add-product", async (req, res) => {
  try {
    console.log('Received product data:', req.body);

    const { name, description, price, imageurl, market } = req.body;

    if (!name || !price || !imageurl) {
      return res.status(400).json({ 
        error: "Missing required fields",
        required: ['name', 'price', 'imageurl']
      });
    }

    // Change the column name to match your database schema
    const result = await pool.query(
      "INSERT INTO products (name, description, price, imageurl, market) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [name, description, price, imageurl, market]
    );

    console.log('Product added successfully:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json({ 
      error: "Failed to add product",
      details: error.message
    });
  }
});

// Enhanced products fetch route
app.get("/products", async (req, res) => {
  try {
    console.log('Fetching products, show all:', req.query.all);

    const showAll = req.query.all === "true";
    const query = showAll
      ? "SELECT * FROM products"
      : "SELECT * FROM products WHERE market = TRUE";

    const result = await pool.query(query);
    console.log(`Found ${result.rows.length} products`);

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ 
      error: "Failed to fetch product data",
      details: error.message
    });
  }
});

// Start the server with environment check
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log('Environment check:');
  console.log('- Database URL configured:', !!process.env.POSTGRES_CONNECTION_URL);
  console.log('- Using Cloudflare Worker for R2 uploads: https://r2-image-proxy.chcrain94.workers.dev');
});

// AI Chat Endpoint
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

    // Falcon-7B-Instruct returns an array with a generated_text property
    res.json({ reply: response.data[0].generated_text });
  } catch (error) {
    console.error(
      "Hugging Face API Error:",
      error.response?.data || error.message
    );
    res.status(500).json({
      error: "AI request failed",
      details: error.response?.data || error.message,
    });
  }
});
