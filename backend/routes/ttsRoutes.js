const express = require('express');
const router = express.Router();
const ttsService = require('../services/ttsService');

// Convert text to speech with waifu voice (default)
router.post('/speak', async (req, res) => {
  try {
    const { text, options = {} } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Validate and sanitize options
    const validatedOptions = ttsService.validateOptions(options);
    
    const result = await ttsService.textToSpeech(text, validatedOptions);
    
    res.json({
      success: true,
      ...result,
      metadata: {
        provider: validatedOptions.provider,
        language: validatedOptions.language,
        waifuMode: !validatedOptions.disableWaifu,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('TTS speak error:', error);
    res.status(500).json({ 
      error: 'Failed to convert text to speech',
      message: error.message 
    });
  }
});

// Dedicated waifu TTS endpoint with anime voice settings
router.post('/waifu-speak', async (req, res) => {
  try {
    const { text, provider = 'web', options = {} } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Force waifu settings on
    const waifuOptions = { 
      ...options, 
      provider,
      disableWaifu: false // Ensure waifu mode is enabled
    };

    const validatedOptions = ttsService.validateOptions(waifuOptions);
    const result = await ttsService.textToSpeech(text, validatedOptions);
    
    res.json({
      success: true,
      ...result,
      metadata: {
        provider: validatedOptions.provider,
        language: validatedOptions.language,
        waifuMode: true,
        voiceType: 'anime_waifu',
        pitch: validatedOptions.pitch,
        rate: validatedOptions.rate,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('TTS waifu speak error:', error);
    res.status(500).json({ 
      error: 'Failed to convert text to speech with waifu voice',
      message: error.message 
    });
  }
});

// Get available voices for a provider with waifu recommendations
router.get('/voices', async (req, res) => {
  try {
    const { provider = 'web' } = req.query;
    
    const voices = await ttsService.getAvailableVoices(provider);
    
    res.json({
      success: true,
      provider,
      voices,
      waifuRecommendations: voices.waifuRecommended || voices.recommendedWaifuVoices || [],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('TTS voices error:', error);
    res.status(500).json({ 
      error: 'Failed to get available voices',
      message: error.message 
    });
  }
});

// Get waifu voice recommendations
router.get('/waifu-voices', async (req, res) => {
  try {
    const { provider = 'web' } = req.query;
    
    const voices = await ttsService.getAvailableVoices(provider);
    
    res.json({
      success: true,
      provider,
      waifuVoices: {
        recommended: voices.waifuRecommended || voices.recommendedWaifuVoices || [],
        preferred: voices.waifuPreferred || [],
        settings: {
          pitch: provider === 'google' ? '4.0x' : '1.8x',
          rate: '1.1-1.15x',
          volume: '1.0x'
        }
      },
      description: 'Recommended voices for anime waifu personality',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('TTS waifu voices error:', error);
    res.status(500).json({ 
      error: 'Failed to get waifu voice recommendations',
      message: error.message 
    });
  }
});

// Get voice providers and their status
router.get('/providers', async (req, res) => {
  try {
    const providers = {
      web: {
        name: 'Web Speech API',
        available: true,
        description: 'Browser-based TTS using Web Speech API',
        waifuSupport: true,
        waifuSettings: 'High pitch (1.8x), faster rate (1.1x)'
      },
      browser: {
        name: 'Browser TTS',
        available: true,
        description: 'Client-side text-to-speech synthesis',
        waifuSupport: true,
        waifuSettings: 'High pitch (1.8x), faster rate (1.1x)'
      }
    };

    // Check if Google Cloud TTS is available
    try {
      await ttsService.getAvailableVoices('google');
      providers.google = {
        name: 'Google Cloud Text-to-Speech',
        available: true,
        description: 'Google Cloud TTS with high-quality voices',
        waifuSupport: true,
        waifuSettings: 'Very high pitch (4.0x), neural voices available'
      };
    } catch (error) {
      providers.google = {
        name: 'Google Cloud Text-to-Speech',
        available: false,
        description: 'Google Cloud TTS (not configured)',
        waifuSupport: false,
        error: 'Not configured or credentials missing'
      };
    }

    res.json({
      success: true,
      providers,
      recommendedForWaifu: 'google > web > browser',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('TTS providers error:', error);
    res.status(500).json({ 
      error: 'Failed to get TTS providers',
      message: error.message 
    });
  }
});

// Convert text to speech with specific voice
router.post('/speak-with-voice', async (req, res) => {
  try {
    const { text, provider = 'web', voiceName, language = 'en-US', options = {} } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const ttsOptions = {
      provider,
      voiceName,
      language,
      ...options
    };

    const validatedOptions = ttsService.validateOptions(ttsOptions);
    const result = await ttsService.textToSpeech(text, validatedOptions);
    
    res.json({
      success: true,
      ...result,
      metadata: {
        provider: validatedOptions.provider,
        voiceName: validatedOptions.voiceName,
        language: validatedOptions.language,
        waifuMode: !validatedOptions.disableWaifu,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('TTS speak with voice error:', error);
    res.status(500).json({ 
      error: 'Failed to convert text to speech with specified voice',
      message: error.message 
    });
  }
});

// Health check for TTS service
router.get('/health', async (req, res) => {
  try {
    // Test TTS service with a simple text
    const testResult = await ttsService.textToSpeech('Test', { provider: 'web' });
    
    res.json({
      success: true,
      status: 'TTS service is operational',
      waifuMode: 'Available',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'TTS service is not available',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get TTS configuration with waifu settings
router.get('/config', (req, res) => {
  try {
    const config = {
      defaultProvider: 'web',
      supportedProviders: ['web', 'browser', 'google'],
      defaultLanguage: 'en-US',
      supportedLanguages: [
        'en-US', 'en-GB', 'en-AU', 'en-CA',
        'es-ES', 'es-MX', 'fr-FR', 'de-DE',
        'it-IT', 'pt-BR', 'ja-JP', 'ko-KR',
        'zh-CN', 'zh-TW', 'ru-RU', 'ar-SA'
      ],
      audioFormats: ['mp3', 'wav', 'ogg'],
      maxTextLength: 5000,
      waifuSettings: {
        enabled: true,
        defaultPitch: {
          web: 1.8,
          google: 4.0,
          browser: 1.8
        },
        defaultRate: {
          web: 1.1,
          google: 1.15,
          browser: 1.1
        },
        preferredVoices: {
          web: ['Google US English Female', 'Microsoft Zira', 'Samantha'],
          google: ['en-US-Neural2-F', 'en-US-Wavenet-F', 'en-US-Standard-C']
        }
      }
    };

    res.json({
      success: true,
      config,
      usage: {
        enableWaifu: 'Default behavior (waifu voice enabled)',
        disableWaifu: 'Add disableWaifu: true to options',
        waifuEndpoint: '/waifu-speak for guaranteed waifu voice'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('TTS config error:', error);
    res.status(500).json({ 
      error: 'Failed to get TTS configuration',
      message: error.message 
    });
  }
});

module.exports = router; 