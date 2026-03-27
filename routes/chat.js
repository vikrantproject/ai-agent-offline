const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const { streamChat } = require('../services/ollama');

const SYSTEM_PROMPT = `You are Claude, an AI assistant made by Anthropic. You are helpful, harmless, and honest. You have a warm conversational tone. You reason carefully and admit uncertainty when relevant. You never pretend to have internet access or real-time data.`;

router.post('/chat', async (req, res) => {
  try {
    const { conversation_id, message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    let convId = conversation_id;

    // Create new conversation if needed
    if (!convId) {
      const result = db.prepare(
        'INSERT INTO conversations (title, created_at, updated_at) VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
      ).run(message.substring(0, 50) + (message.length > 50 ? '...' : ''));
      convId = result.lastInsertRowid;
    }

    // Save user message
    db.prepare(
      'INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)'
    ).run(convId, 'user', message);

    // Update conversation timestamp
    db.prepare(
      'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(convId);

    // Load conversation history
    const messages = db.prepare(
      'SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC'
    ).all(convId);

    // Prepare messages for Ollama (add system prompt)
    const ollamaMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages
    ];

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send conversation_id in first chunk
    res.write(`data: ${JSON.stringify({ conversation_id: convId, type: 'start' })}\n\n`);

    let assistantResponse = '';

    // Stream response from Ollama
    await streamChat(ollamaMessages, (token) => {
      assistantResponse += token;
      res.write(`data: ${JSON.stringify({ token, type: 'token' })}\n\n`);
    });

    // Save assistant response
    db.prepare(
      'INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)'
    ).run(convId, 'assistant', assistantResponse);

    // Update conversation timestamp again
    db.prepare(
      'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(convId);

    // Send completion signal
    res.write(`data: ${JSON.stringify({ type: 'done', conversation_id: convId })}\n\n`);
    res.end();

  } catch (error) {
    console.error('Chat error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Failed to process chat request' });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
      res.end();
    }
  }
});

module.exports = router;