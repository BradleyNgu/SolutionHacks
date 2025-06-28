const { GoogleGenAI } = require('@google/genai');
const config = require('../config/config');

class GeminiService {
  constructor() {
    if (!config.gemini.apiKey) {
      throw new Error('Gemini API key is required. Please set GEMINI_API_KEY in your environment variables.');
    }
    
    // Set API key as environment variable for the client
    process.env.GEMINI_API_KEY = config.gemini.apiKey;
    this.ai = new GoogleGenAI({});
  }

  /**
   * Generate text using Gemini AI
   * @param {string} prompt - The text prompt to send to Gemini
   * @param {Object} options - Additional options for generation
   * @returns {Promise<string>} - Generated text response
   */
  async generateText(prompt, options = {}) {
    try {
      const requestConfig = {
        model: config.gemini.model,
        contents: prompt,
        config: {
          temperature: options.temperature || 0.7,
          topP: options.topP || 0.8,
          topK: options.topK || 40,
          maxOutputTokens: options.maxTokens || 2048,
          // Disable thinking by default for faster responses
          thinkingConfig: {
            thinkingBudget: options.enableThinking ? undefined : 0
          },
          ...options.config
        }
      };

      const response = await this.ai.models.generateContent(requestConfig);
      return response.text;
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error(`Failed to generate text: ${error.message}`);
    }
  }

  /**
   * Generate text with conversation history
   * @param {Array} messages - Array of conversation messages
   * @param {Object} options - Additional options for generation
   * @returns {Promise<string>} - Generated text response
   */
  async generateWithHistory(messages, options = {}) {
    try {
      // Convert messages to a single prompt with context
      const conversationText = messages
        .map(msg => `${msg.role === 'assistant' ? 'Assistant' : 'User'}: ${msg.content}`)
        .join('\n') + '\nAssistant:';

      const requestConfig = {
        model: config.gemini.model,
        contents: conversationText,
        config: {
          temperature: options.temperature || 0.7,
          topP: options.topP || 0.8,
          topK: options.topK || 40,
          maxOutputTokens: options.maxTokens || 2048,
          // Disable thinking by default for faster responses
          thinkingConfig: {
            thinkingBudget: options.enableThinking ? undefined : 0
          },
          ...options.config
        }
      };

      const response = await this.ai.models.generateContent(requestConfig);
      return response.text;
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error(`Failed to generate text with history: ${error.message}`);
    }
  }

  /**
   * Start a chat session with Gemini (simplified for new API)
   * @param {Object} options - Chat options
   * @returns {Object} - Chat session configuration
   */
  startChat(options = {}) {
    try {
      // Return a configuration object that can be used for chat
      return {
        sessionId: Date.now().toString(),
        config: {
          model: config.gemini.model,
          temperature: options.temperature || 0.7,
          topP: options.topP || 0.8,
          topK: options.topK || 40,
          maxOutputTokens: options.maxTokens || 2048,
          thinkingConfig: {
            thinkingBudget: options.enableThinking ? undefined : 0
          },
          ...options.config
        },
        history: options.history || []
      };
    } catch (error) {
      console.error('Failed to start chat session:', error);
      throw new Error(`Failed to start chat session: ${error.message}`);
    }
  }
}

module.exports = new GeminiService(); 