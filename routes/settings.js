const express = require('express');
const router = express.Router();
const { db } = require('../database/db');

// Get all settings
router.get('/settings', (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    
    const settings = {};
    rows.forEach(row => {
      settings[row.key] = row.value;
    });

    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update or create a setting
router.post('/settings', (req, res) => {
  try {
    const { key, value } = req.body;

    if (!key) {
      return res.status(400).json({ error: 'Key is required' });
    }

    db.prepare(`
      INSERT INTO settings (key, value) 
      VALUES (?, ?) 
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(key, value);

    res.json({ message: 'Setting saved successfully', key, value });
  } catch (error) {
    console.error('Error saving setting:', error);
    res.status(500).json({ error: 'Failed to save setting' });
  }
});

module.exports = router;