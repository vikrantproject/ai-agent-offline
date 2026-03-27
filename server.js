require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database/db');
const chatRoutes = require('./routes/chat');
const historyRoutes = require('./routes/history');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 7778;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize database
db.init();

// Routes
app.use('/api', chatRoutes);
app.use('/api', historyRoutes);
app.use('/api', settingsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Claude Agent is running' });
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Claude Agent running on port ${PORT}`);
  console.log(`📍 Access at: http://localhost:${PORT}`);
  console.log(`🤖 Model: ${process.env.OLLAMA_MODEL || 'llama3'}`);
  console.log(`💾 Database: ${process.env.DB_PATH || './database/agent.db'}\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  db.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down gracefully...');
  db.close();
  process.exit(0);
});