const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
app.use(cors());

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbySYrjVDsztSZQW0hK0jUDqsURu-cOoZfLXGVk7AwiWRAU510J0M0_uQN596cE0fMIr/exec";

// Root Route (Optional - just to confirm server is working)
app.get("/", (req, res) => {
    res.send("Server is running! Try /products");
});

// Endpoint to fetch product data
app.get("/products", async (req, res) => {
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).json({ error: "Failed to fetch data" });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
