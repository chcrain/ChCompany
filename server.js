const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
app.use(cors()); // Enable CORS

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxhTe9qtYmrwUDiK6tbFd2xbZlWrxfnyrWosD2dN9tsBi4g6cu1vnqQNNdnFFIoUw6a/exec";

app.get("/products", async (req, res) => {
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL);
        if (!response.ok) {
            throw new Error("Failed to fetch data from Google Scripts");
        }
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).json({ error: "Failed to fetch data" });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
