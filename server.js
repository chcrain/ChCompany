const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const app = express();

// Allow requests from any origin
app.use(cors({
  origin: '*',
  methods: ['GET'],
  optionsSuccessStatus: 200
}));

// Your Google Script URL
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbySYrjVDsztSZQW0hK0jUDqsURu-cOoZfLXGVk7AwiWRAU510J0M0_uQN596cE0fMIr/exec";

// Root route
app.get("/", (req, res) => {
  res.send("Server is running! Try /products endpoint");
});

// Products endpoint
app.get("/products", async (req, res) => {
  try {
    // Fetch data from Google Script
    const response = await fetch(GOOGLE_SCRIPT_URL);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Parse and send the data
    const data = await response.json();
    res.json(data);
    
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ 
      error: "Failed to fetch product data",
      details: error.message 
    });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});