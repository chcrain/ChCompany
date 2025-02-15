const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json()); // Allows sending JSON data in requests

// Database connection using environment variable
const pool = new Pool({
  connectionString: process.env.POSTGRES_CONNECTION_URL, // Ensure this is set in Render
  ssl: {
    rejectUnauthorized: false, // Required for connecting to Render's managed PostgreSQL
  },
});

// ✅ Route to Fetch All Products
app.get("/products", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products WHERE market = TRUE");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Failed to fetch product data" });
  }
});

// ✅ Route to Add a New Product
app.post("/add-product", async (req, res) => {
  try {
    const { name, description, price, imageUrl, market } = req.body;
    const result = await pool.query(
      "INSERT INTO products (name, description, price, imageUrl, market) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [name, description, price, imageUrl, market]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json({ error: "Failed to add product" });
  }
});

// ✅ Route to Update Product Market Status
app.put("/update-market/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { market } = req.body;
    const result = await pool.query(
      "UPDATE products SET market = $1 WHERE id = $2 RETURNING *",
      [market, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "Failed to update product" });
  }
});

// ✅ Route to Delete a Product
app.delete("/delete-product/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM products WHERE id = $1", [id]);
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
