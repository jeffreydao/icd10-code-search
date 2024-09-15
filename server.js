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
      `WITH matched_codes AS (
        SELECT 
          CASE 
            WHEN LENGTH(code) > 3 
            THEN CONCAT(LEFT(code, 3), '.', SUBSTRING(code, 4))
            ELSE code
          END AS formatted_code,
          code, description, category, sub_category,
          ts_rank(weighted_vector, websearch_to_tsquery('english', $1)) AS rank
        FROM icd_codes
        WHERE weighted_vector @@ websearch_to_tsquery('english', $1)
      ),
      parent_codes AS (
        SELECT DISTINCT ON (parent.code)
          CASE 
            WHEN LENGTH(parent.code) > 3 
            THEN CONCAT(LEFT(parent.code, 3), '.', SUBSTRING(parent.code, 4))
            ELSE parent.code
          END AS formatted_code,
          parent.code, 
          parent.description,
          parent.category, 
          parent.sub_category,
          0 AS rank
        FROM icd_codes parent
        JOIN matched_codes child ON child.category = parent.code
        WHERE parent.code ~ '^[A-Z][0-9]+$' AND parent.code != child.code
      ),
      all_codes AS (
        SELECT * FROM matched_codes
        UNION ALL
        SELECT * FROM parent_codes
      )
      SELECT DISTINCT ON (code) 
        formatted_code, description, category, sub_category, rank
      FROM all_codes
      ORDER BY code, rank DESC
      LIMIT 500`,
      [query]
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