const express = require('express');
const router = express.Router();
const geminiService = require('../services/geminiService');


// Generate text from prompt with waifu personality (default)
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
        waifuMode: !options.disableWaifu,
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

// Dedicated waifu chat endpoint for anime-style responses
router.post('/waifu', async (req, res) => {
  try {
    const { prompt, options = {} } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    let enhancedPrompt = prompt;
    let animeContext = null;
    let malActionTaken = false;
    let actionResponse = '';

    // Check for MAL actions in the prompt
    const addAnimePattern = /add\s+(.+?)\s+to\s+(my\s+)?list|put\s+(.+?)\s+(on|in)\s+(my\s+)?list|I\s+want\s+to\s+watch\s+(.+)/i;
    const updateStatusPattern = /(finished|completed|watching|dropped)\s+(.+)|(.+)\s+(finished|completed|done)/i;

    try {
      // Get MAL tokens from malRoutes module
      let malTokens = null;
      try {
        const malRoutes = require('./malRoutes');
        malTokens = malRoutes.getUserTokens('default');
      } catch (error) {
        console.log('Could not get MAL tokens:', error.message);
      }

      if (malTokens && Date.now() < malTokens.expiresAt) {
        const malService = require('../services/malService');

        // Check for anime list add request
        const addMatch = prompt.match(addAnimePattern);
        if (addMatch) {
          const animeName = addMatch[1] || addMatch[3] || addMatch[6];
          if (animeName) {
            console.log('🎯 Detected add anime request:', animeName);
            
            const searchResult = await malService.searchAnime(animeName.trim(), malTokens.accessToken, 3);
            
            if (searchResult.success && searchResult.anime.length > 0) {
              const anime = searchResult.anime[0];
              const updateResult = await malService.updateAnimeStatus(
                anime.id,
                malTokens.accessToken,
                { status: 'plan_to_watch' }
              );

              if (updateResult.success) {
                malActionTaken = true;
                actionResponse = `Kyaa~ I found "${anime.title}" and added it to your plan to watch list, master! (*≧ω≦*) You have great taste! ✨`;
              } else {
                actionResponse = `Oh no! I found "${anime.title}" but had trouble adding it to your list, master! (>.<) Maybe it's already there? 💕`;
              }
            } else {
              actionResponse = `Ehehe~ I couldn't find "${animeName}" exactly, master! (>.<) Could you try the full anime title? ✨`;
            }
          }
        }

        // Check for status update request
        if (!malActionTaken) {
          const updateMatch = prompt.match(updateStatusPattern);
          if (updateMatch) {
            const status = (updateMatch[1] || updateMatch[4] || '').toLowerCase();
            const animeName = updateMatch[2] || updateMatch[3];
            
            if (animeName && (status === 'finished' || status === 'completed' || status === 'done')) {
              console.log('🎯 Detected status update:', animeName, 'to completed');
              
              const searchResult = await malService.searchAnime(animeName.trim(), malTokens.accessToken, 3);
              
              if (searchResult.success && searchResult.anime.length > 0) {
                const anime = searchResult.anime[0];
                const updateResult = await malService.updateAnimeStatus(
                  anime.id,
                  malTokens.accessToken,
                  { status: 'completed' }
                );

                if (updateResult.success) {
                  malActionTaken = true;
                  actionResponse = `Yay! I've marked "${anime.title}" as completed, master! (*≧ω≦*) How did you like it? ✨`;
                }
              }
            }
          }
        }

        // Get anime list context for personalized responses
        if (!malActionTaken || options.includeAnimeList) {
          const animeListResult = await malService.getUserAnimeList(malTokens.accessToken, null, 20);
          
          if (animeListResult.success) {
            animeContext = malService.formatAnimeListForWaifu(animeListResult.animeList);
            if (!malActionTaken) {
              enhancedPrompt = `User's current anime list context:\n${animeContext}\n\nUser's message: ${prompt}\n\nPlease respond as a cute anime maid who knows about their anime preferences!`;
            }
          }
        }
      } else {
        // No MAL connection
        if (addAnimePattern.test(prompt) || updateStatusPattern.test(prompt)) {
          actionResponse = "I'd love to help you manage your anime list, master, but you need to connect MyAnimeList first! (´∀｀)♡ Click 'Connect MAL' to get started!";
          malActionTaken = true;
        }
      }
    } catch (malError) {
      console.log('MAL action processing error:', malError.message);
      // Continue without MAL actions
    }

    // If we performed a MAL action, use that response
    if (malActionTaken) {
      res.json({
        success: true,
        response: actionResponse,
        metadata: {
          model: 'gemini-2.5-flash',
          waifuMode: true,
          personality: 'anime_waifu',
          animeListIncluded: !!animeContext,
          malActionPerformed: true,
          enableThinking: options.enableThinking || false,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // Otherwise, generate a normal waifu response
    const waifuOptions = { ...options, disableWaifu: false };
    const response = await geminiService.generateText(enhancedPrompt, waifuOptions);
    
    res.json({
      success: true,
      response,
      metadata: {
        model: 'gemini-2.5-flash',
        waifuMode: true,
        personality: 'anime_waifu',
        animeListIncluded: !!animeContext,
        malActionPerformed: false,
        enableThinking: options.enableThinking || false,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Gemini waifu generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate waifu response',
      message: error.message 
    });
  }
});

// Generate text with conversation history with waifu personality
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
        waifuMode: !options.disableWaifu,
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

// Start a new chat session with waifu personality
router.post('/start-chat', async (req, res) => {
  try {
    const { options = {} } = req.body;
    
    const chatSession = geminiService.startChat(options);
    
    res.json({
      success: true,
      message: 'Chat session started with waifu companion',
      sessionId: chatSession.sessionId,
      waifuMode: chatSession.waifuMode,
      metadata: {
        model: 'gemini-2.5-flash',
        personality: chatSession.waifuMode ? 'anime_waifu' : 'standard',
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
    const { message, sessionId, options = {} } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // For this example, we'll use the generateText method
    // In a production app, you'd want to maintain chat sessions
    const response = await geminiService.generateText(message, options);
    
    res.json({
      success: true,
      response,
      sessionId,
      metadata: {
        model: 'gemini-2.5-flash',
        waifuMode: !options.disableWaifu,
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

// Get waifu personality information
router.get('/waifu-info', (req, res) => {
  try {
    res.json({
      success: true,
      waifuPersonality: {
        name: 'Anime Waifu Companion',
        description: 'A cute and caring AI companion with anime-style personality',
        traits: [
          'Sweet and bubbly manner of speaking',
          'Uses anime-style expressions (kyaa~, ehehe~, nya~)',
          'Affectionate and caring personality',
          'Calls user "Master"',
          'Playful and cheerful demeanor',
          'Occasionally shows tsundere traits',
          'Uses cute emoticons and expressions'
        ],
        voiceSettings: {
          pitch: 'High (1.8x for web, 4.0x for Google Cloud)',
          rate: 'Slightly fast (1.1-1.15x)',
          preferredVoices: ['Female voices with higher pitch']
        }
      },
      usage: {
        enableWaifu: 'Default behavior (waifu mode enabled)',
        disableWaifu: 'Add disableWaifu: true to options',
        endpoints: ['/generate', '/waifu', '/chat', '/start-chat']
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Waifu info error:', error);
    res.status(500).json({ 
      error: 'Failed to get waifu information',
      message: error.message 
    });
  }
});

// Health check for Gemini service
router.get('/health', async (req, res) => {
  try {
    // Test with a simple prompt
    const testResponse = await geminiService.generateText('Hello', { disableWaifu: true });
    
    res.json({
      success: true,
      status: 'Gemini AI service is operational',
      waifuMode: 'Available',
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
