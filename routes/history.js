const express = require('express');
const router = express.Router();
const { db } = require('../database/db');

// Get all conversations
router.get('/conversations', (req, res) => {
  try {
    const conversations = db.prepare(`
      SELECT id, title, created_at, updated_at 
      FROM conversations 
      ORDER BY updated_at DESC
    `).all();

    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get messages for a specific conversation
router.get('/conversations/:id/messages', (req, res) => {
  try {
    const { id } = req.params;
    
    const messages = db.prepare(`
      SELECT id, role, content, created_at 
      FROM messages 
      WHERE conversation_id = ? 
      ORDER BY created_at ASC
    `).all(id);

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Delete a conversation
router.delete('/conversations/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const result = db.prepare('DELETE FROM conversations WHERE id = ?').run(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

module.exports = router;