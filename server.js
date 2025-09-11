const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Database setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize database
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS historical_data (
        id SERIAL PRIMARY KEY,
        data JSONB NOT NULL,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Database initialized');
  } catch (err) {
    console.error('Database init error:', err);
  }
}
initDB();

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// API Routes
app.get('/api/historical-data', async (req, res) => {
  try {
    const result = await pool.query('SELECT data FROM historical_data ORDER BY last_updated DESC LIMIT 1');
    res.json({ data: result.rows[0]?.data || {} });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/historical-data', async (req, res) => {
  try {
    await pool.query('INSERT INTO historical_data (data) VALUES ($1)', [JSON.stringify(req.body.data)]);
    await pool.query('DELETE FROM historical_data WHERE id NOT IN (SELECT id FROM historical_data ORDER BY last_updated DESC LIMIT 5)');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/historical-data', async (req, res) => {
  try {
    await pool.query('DELETE FROM historical_data');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
