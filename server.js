const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const app = express();

// First, set up CORS middleware with explicit options
app.use(cors({
  origin: '*',
  methods: ['GET'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Your Google Script URL
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbySYrjVDsztSZQW0hK0jUDqsURu-cOoZfLXGVk7AwiWRAU510J0M0_uQN596cE0fMIr/exec";

app.get("/products", async (req, res) => {
  try {
    // Explicitly set headers before making the fetch
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    
    const response = await fetch(GOOGLE_SCRIPT_URL);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Send the response with explicit headers
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});