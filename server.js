const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all requests
app.use(cors());

// Proxy endpoint for fetching products
app.get('/products', async (req, res) => {
    try {
        const scriptUrl = 'https://script.google.com/macros/s/AKfycbzm6r970nvjiLJtNkwtnRncrGs7OGRxv_iD0NVXVMXevRfgsMdMhQ5R3rQX7kub-kP4/exec';
        const scriptRes = await fetch(scriptUrl);
        if (!scriptRes.ok) {
            throw new Error(`Google Apps Script error: ${scriptRes.statusText}`);
        }
        const data = await scriptRes.json();

        // Set CORS headers manually if needed
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

        res.json(data);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Failed to fetch product data' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
