const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz-Eg3_i4p_WKmEEYd5MFKCAxchqIfZkHNpbb_exAUPyYvb0FzXIlbr5Wpb9Nm4MZNa/exec";

app.get('/products', async (req, res) => {
    try {
        console.log("Fetching data from Google Sheets...");

        const response = await fetch(GOOGLE_SCRIPT_URL);
        const text = await response.text(); // Read response as text first

        // ✅ Check if the response is valid JSON
        try {
            const data = JSON.parse(text); // Attempt to parse JSON
            console.log("Data received:", data);

            // ✅ Add CORS headers manually
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Methods", "GET");
            res.setHeader("Access-Control-Allow-Headers", "Content-Type");

            return res.json(data); // ✅ Send JSON response
        } catch (jsonError) {
            console.error("Invalid JSON received:", text);
            return res.status(500).json({ error: "Invalid response from Google Apps Script" });
        }
    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).json({ error: "Failed to fetch data" });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
