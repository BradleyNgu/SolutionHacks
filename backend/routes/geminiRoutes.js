const express = require('express');
const router = express.Router();
const geminiService = require('../services/geminiService');

// Generate text from prompt
router.post('/generate', async (req, res) => {
  try {
    const { prompt, options = {} } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const response = await geminiService.generateText(prompt, options);
    
    res.json({
      success: true,
      response,
      metadata: {
        model: 'gemini-2.5-flash',
        enableThinking: options.enableThinking || false,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Gemini generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate text',
      message: error.message 
    });
  }
});

// Generate text with conversation history
router.post('/chat', async (req, res) => {
  try {
    const { messages, options = {} } = req.body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const response = await geminiService.generateWithHistory(messages, options);
    
    res.json({
      success: true,
      response,
      metadata: {
        model: 'gemini-2.5-flash',
        enableThinking: options.enableThinking || false,
        timestamp: new Date().toISOString(),
        messageCount: messages.length
      }
    });
  } catch (error) {
    console.error('Gemini chat error:', error);
    res.status(500).json({ 
      error: 'Failed to generate chat response',
      message: error.message 
    });
  }
});

// Start a new chat session
router.post('/start-chat', async (req, res) => {
  try {
    const { options = {} } = req.body;
    
    const chatSession = geminiService.startChat(options);
    
    res.json({
      success: true,
      message: 'Chat session started',
      sessionId: Date.now().toString(), // Simple session ID
      metadata: {
        model: 'gemini-2.5-flash',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Gemini start chat error:', error);
    res.status(500).json({ 
      error: 'Failed to start chat session',
      message: error.message 
    });
  }
});

// Send message to existing chat session
router.post('/send-message', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // For this example, we'll use the generateText method
    // In a production app, you'd want to maintain chat sessions
    const response = await geminiService.generateText(message);
    
    res.json({
      success: true,
      response,
      sessionId,
      metadata: {
        model: 'gemini-2.5-flash',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Gemini send message error:', error);
    res.status(500).json({ 
      error: 'Failed to send message',
      message: error.message 
    });
  }
});

// Health check for Gemini service
router.get('/health', async (req, res) => {
  try {
    // Test with a simple prompt
    const testResponse = await geminiService.generateText('Hello');
    
    res.json({
      success: true,
      status: 'Gemini AI service is operational',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'Gemini AI service is not available',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router; 