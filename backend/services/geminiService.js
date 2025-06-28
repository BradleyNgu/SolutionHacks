const { GoogleGenerativeAI } = require('@google/genai');
const config = require('../config/config');

class GeminiService {
  constructor() {
    if (!config.gemini.apiKey) {
      throw new Error('Gemini API key is required. Please set GEMINI_API_KEY in your environment variables.');
    }
    
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: config.gemini.model });
  }

  /**
   * Generate text using Gemini AI
   * @param {string} prompt - The text prompt to send to Gemini
   * @param {Object} options - Additional options for generation
   * @returns {Promise<string>} - Generated text response
   */
  async generateText(prompt, options = {}) {
    try {
      const generationConfig = {
        temperature: options.temperature || 0.7,
        topP: options.topP || 0.8,
        topK: options.topK || 40,
        maxOutputTokens: options.maxTokens || 2048,
        ...options.generationConfig
      };

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig
      });

      const response = await result.response;
      return response.text();
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
      const generationConfig = {
        temperature: options.temperature || 0.7,
        topP: options.topP || 0.8,
        topK: options.topK || 40,
        maxOutputTokens: options.maxTokens || 2048,
        ...options.generationConfig
      };

      // Convert messages to Gemini format
      const contents = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const result = await this.model.generateContent({
        contents,
        generationConfig
      });

      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error(`Failed to generate text with history: ${error.message}`);
    }
  }

  /**
   * Start a chat session with Gemini
   * @param {Object} options - Chat options
   * @returns {Object} - Chat session object
   */
  startChat(options = {}) {
    try {
      const generationConfig = {
        temperature: options.temperature || 0.7,
        topP: options.topP || 0.8,
        topK: options.topK || 40,
        maxOutputTokens: options.maxTokens || 2048,
        ...options.generationConfig
      };

      return this.model.startChat({
        generationConfig,
        history: options.history || []
      });
    } catch (error) {
      console.error('Failed to start chat session:', error);
      throw new Error(`Failed to start chat session: ${error.message}`);
    }
  }
}

module.exports = new GeminiService(); 