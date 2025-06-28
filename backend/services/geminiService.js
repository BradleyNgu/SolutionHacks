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
   * Apply waifu personality to prompt
   * @param {string} userPrompt - The user's prompt
   * @returns {string} - Prompt with waifu system prompt
   */
  applyWaifuPersonality(userPrompt) {
    return `${config.gemini.waifuSystemPrompt}\n\nUser: ${userPrompt}\n\nWaifu Response:`;
  }

  /**
   * Generate text using Gemini AI with anime waifu personality
   * @param {string} prompt - The text prompt to send to Gemini
   * @param {Object} options - Additional options for generation
   * @returns {Promise<string>} - Generated text response
   */
  async generateText(prompt, options = {}) {
    try {
      // Apply waifu personality unless explicitly disabled
      const finalPrompt = options.disableWaifu ? prompt : this.applyWaifuPersonality(prompt);
      
      const requestConfig = {
        model: config.gemini.model,
        contents: finalPrompt,
        config: {
          temperature: options.temperature || 0.9, // Higher temperature for more creative waifu responses
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
   * Generate text with conversation history with waifu personality
   * @param {Array} messages - Array of conversation messages
   * @param {Object} options - Additional options for generation
   * @returns {Promise<string>} - Generated text response
   */
  async generateWithHistory(messages, options = {}) {
    try {
      // Convert messages to a single prompt with context
      let conversationText;
      
      if (options.disableWaifu) {
        // Standard conversation without waifu personality
        conversationText = messages
          .map(msg => `${msg.role === 'assistant' ? 'Assistant' : 'User'}: ${msg.content}`)
          .join('\n') + '\nAssistant:';
      } else {
        // Apply waifu personality to conversation
        conversationText = config.gemini.waifuSystemPrompt + '\n\n' +
          messages
            .map(msg => `${msg.role === 'assistant' ? 'Waifu' : 'Master'}: ${msg.content}`)
            .join('\n') + '\nWaifu:';
      }

      const requestConfig = {
        model: config.gemini.model,
        contents: conversationText,
        config: {
          temperature: options.temperature || 0.9, // Higher temperature for more creative waifu responses
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
   * Start a chat session with Gemini (simplified for new API) with waifu personality
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
          temperature: options.temperature || 0.9, // Higher temperature for waifu personality
          topP: options.topP || 0.8,
          topK: options.topK || 40,
          maxOutputTokens: options.maxTokens || 2048,
          thinkingConfig: {
            thinkingBudget: options.enableThinking ? undefined : 0
          },
          ...options.config
        },
        history: options.history || [],
        waifuMode: !options.disableWaifu // Enable waifu mode by default
      };
    } catch (error) {
      console.error('Failed to start chat session:', error);
      throw new Error(`Failed to start chat session: ${error.message}`);
    }
  }
}

module.exports = new GeminiService(); 