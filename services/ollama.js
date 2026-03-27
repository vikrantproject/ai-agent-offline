const fetch = require('node-fetch');

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';

const streamChat = async (messages, onToken) => {
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: messages,
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const reader = response.body;
    let buffer = '';

    for await (const chunk of reader) {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            const data = JSON.parse(line);
            
            if (data.message && data.message.content) {
              onToken(data.message.content);
            }
            
            if (data.done) {
              return;
            }
          } catch (parseError) {
            console.error('Error parsing Ollama response:', parseError);
          }
        }
      }
    }
  } catch (error) {
    console.error('Ollama streaming error:', error);
    throw new Error(`Failed to connect to Ollama: ${error.message}`);
  }
};

// Test Ollama connection
const testConnection = async () => {
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/tags`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Ollama connected successfully');
      console.log('📦 Available models:', data.models?.map(m => m.name).join(', ') || 'none');
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Ollama connection failed:', error.message);
    return false;
  }
};

module.exports = {
  streamChat,
  testConnection
};