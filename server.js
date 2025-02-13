const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET'],
  allowedHeaders: ['Content-Type']
}));

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwLKMRfd3UFuPyk4adRHpyWbSsxy29XZH3vWEOd7uNDAHW6fcvyr57bTgLRJjVRXwMY/exec";

app.get('/products', async (req, res) => {
  try {
    console.log("Fetching data from Google Sheets...");
    const response = await fetch(GOOGLE_SCRIPT_URL);
    
    if (!response.ok) {
      throw new Error(`Google Script responded with status: ${response.status}`);
    }
    
    const text = await response.text();
    
    try {
      const data = JSON.parse(text);
      console.log("Data received:", data);
      return res.json(data);
    } catch (jsonError) {
      console.error("Invalid JSON received:", text);
      return res.status(500).json({ error: "Invalid response from Google Apps Script" });
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));