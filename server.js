const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzm6r970nvjiLJtNkwtnRncrGs7OGRxv_iD0NVXVMXevRfgsMdMhQ5R3rQX7kub-kP4/exec";

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
