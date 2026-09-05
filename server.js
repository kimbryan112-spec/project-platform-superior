const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// I-serve ang buong frontend files mo (mga HTML, CSS, JS, images) mula sa public o current folder
app.use(express.static(path.join(__dirname, 'public')));
// Kung sakaling nasa root folder lang din ang HTML files mo, pwede ring tanggalin o palitan ito.

// Lumilikha ito ng local database.sqlite file sa iyong PC
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to local SQLite database successfully.');
  }
});

// Table para sa couple dashboard / items
db.run(`CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Endpoint para makuha ang data
app.get('/api/data', (req, res) => {
  db.all("SELECT * FROM items", [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ rows });
  });
});

// Endpoint para mag-save ng bagong data (tulad ng couple names o dashboard updates)
app.post('/api/data', (req, res) => {
  const { name } = req.body;
  db.run(`INSERT INTO items (name) VALUES (?)`, [name], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID, name });
  });
});

// Fallback para sa frontend routing kung single-page app man ito
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Patakbuhin ang server sa port 3000
app.listen(3000, () => {
  console.log('Local server is running on http://localhost:3000');
});