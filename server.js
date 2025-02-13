const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const app = express();

// Enable CORS for all origins during development
app.use(cors());

// Your Google Script URL - make sure to replace with your actual URL
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbySYrjVDsztSZQW0hK0jUDqsURu-cOoZfLXGVk7AwiWRAU510J0M0_uQN596cE0fMIr/exec";

// Root route - useful for checking if server is running
app.get("/", (req, res) => {
  res.send("Server is running! Try /products endpoint");
});

// Products endpoint
app.get("/products", async (req, res) => {
  try {
    console.log("Fetching data from Google Scripts...");
    
    // Fetch data from Google Script
    const response = await fetch(GOOGLE_SCRIPT_URL);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Transform response to JSON
    const data = await response.json();
    console.log("Data received from Google Scripts:", data);
    
    // Optional: Add any data transformation here if needed
    
    // Send JSON to frontend
    res.json(data);
    console.log("Data sent to frontend successfully");
    
  } catch (error) {
    console.error("Error in /products endpoint:", error);
    res.status(500).json({ 
      error: "Failed to fetch product data",
      details: error.message 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Something broke!",
    details: err.message
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the API at http://localhost:${PORT}/products`);
});