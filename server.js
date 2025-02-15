const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();

// Middleware to parse JSON request bodies
app.use(express.json());

// Set up CORS with explicit options
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Google Apps Script Web App URL
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw2q18aZRpcHUNhHYHk8qxYfTb5PBv9XNospCOdvzOSEIrYRDckaT7rinV5GI6OTLoM/exec";

// GET: Fetch products from Google Sheets
app.get("/products", async (req, res) => {
  try {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');

    // Fetch data from Google Script
    const response = await fetch(GOOGLE_SCRIPT_URL);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Return product data with appropriate headers
    res.set({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }).json(data);
    
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ 
      error: "Failed to fetch product data",
      details: error.message 
    });
  }
});

// POST: Add a new product to Google Sheets
app.post("/products", async (req, res) => {
  try {
    // Ensure request body contains necessary fields
    const { id, name, description, price, imageUrl } = req.body;
    if (!id || !name || !description || !price || !imageUrl) {
      return res.status(400).json({ error: "Missing required product fields" });
    }

    // Send the new product to Google Apps Script via POST
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.json(data);
    
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json({ 
      error: "Failed to add product",
      details: error.message 
    });
  }
});

// Start the Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
