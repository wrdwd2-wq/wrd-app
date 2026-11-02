const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();

// Allow the server to receive JSON data up to 10MB (handles history logs)
app.use(express.json({ limit: '10mb' }));

// Serve the HTML file from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Connect to Supabase PostgreSQL using the URL from Render's Environment Variables
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for secure cloud connections
});

// Auto-Create Database Tables on Startup
pool.query(`
    CREATE TABLE IF NOT EXISTS wrd_live_data (
        id SERIAL PRIMARY KEY,
        files_data JSONB NOT NULL DEFAULT '[]',
        letters_data JSONB NOT NULL DEFAULT '[]'
    );
    -- Insert a blank starting row if it doesn't exist
    INSERT INTO wrd_live_data (id, files_data, letters_data)
    SELECT 1, '[]', '[]'
    WHERE NOT EXISTS (SELECT 1 FROM wrd_live_data WHERE id = 1);
`).then(() => console.log("Database tables verified."))
  .catch(err => console.error("Database Init Error:", err));

// API 1: Send Data to the Browser
app.get('/api/data', async (req, res) => {
    try {
        const result = await pool.query('SELECT files_data, letters_data FROM wrd_live_data WHERE id = 1');
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API 2: Save Data from the Browser
app.post('/api/data', async (req, res) => {
    try {
        const { files, letters } = req.body;
        await pool.query(
            'UPDATE wrd_live_data SET files_data = $1, letters_data = $2 WHERE id = 1',
            [JSON.stringify(files), JSON.stringify(letters)]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`WRD File Tracker Server is running on port ${PORT}`);
});