require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

app.use(cors());

app.get('/api/search', async (req, res) => {
  const { query } = req.query;
  
  if (!query || query.length < 3) {
    return res.status(400).json({ error: 'Query must be at least 3 characters long' });
  }

  try {
    const result = await pool.query(
      `SELECT code, description 
       FROM icd_codes
       WHERE code ILIKE $1 OR description ILIKE $1 
       ORDER BY code 
       LIMIT 100`,
      [`%${query}%`]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error executing query', error);
    res.status(500).json({ error: 'An error occurred while searching' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});