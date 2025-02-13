const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();

// ✅ Explicitly allow requests from your frontend
app.use(cors({
    origin: '*', // Change this to your frontend URL for security
    methods: ['GET'],
    allowedHeaders: ['Content-Type'],
}));

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxhTe9qtYmrwUDiK6tbFd2xbZlWrxfnyrWosD2dN9tsBi4g6cu1vnqQNNdnFFIoUw6a/exec";

app.get('/products', async (req, res) => {
    try {
        console.log("Fetching data from Google Sheets...");
        
        const response = await fetch(GOOGLE_SCRIPT_URL);
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Data received:", data);
        
        // ✅ Add CORS headers manually
        res.setHeader("Access-Control-Allow-Origin", "*"); 
        res.setHeader("Access-Control-Allow-Methods", "GET");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");

        res.json(data); // ✅ Send data to frontend
    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).json({ error: "Failed to fetch data" });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
