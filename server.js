const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzu33jA6iKrA0I_VjRzl7Bzd-RhO8gxhcFAZ0FzoBkNM4ynETOT0qNxFTZrE8XC33Np/exec";

app.get('/products', async (req, res) => {
    try {
        console.log("Fetching data from Google Sheets...");
        const response = await fetch(GOOGLE_SCRIPT_URL);
        const data = await response.json();
        console.log("Data received:", data);
        res.json(data);
    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).json({ error: "Failed to fetch data" });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
