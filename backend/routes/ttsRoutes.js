const express = require('express');
const router = express.Router();
const ttsService = require('../services/ttsService');

// Convert text to speech
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

// Get available voices for a provider
router.get('/voices', async (req, res) => {
  try {
    const { provider = 'web' } = req.query;
    
    const voices = await ttsService.getAvailableVoices(provider);
    
    res.json({
      success: true,
      provider,
      voices,
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

// Get voice providers and their status
router.get('/providers', async (req, res) => {
  try {
    const providers = {
      web: {
        name: 'Web Speech API',
        available: true,
        description: 'Browser-based TTS using Web Speech API'
      },
      browser: {
        name: 'Browser TTS',
        available: true,
        description: 'Client-side text-to-speech synthesis'
      }
    };

    // Check if Google Cloud TTS is available
    try {
      await ttsService.getAvailableVoices('google');
      providers.google = {
        name: 'Google Cloud Text-to-Speech',
        available: true,
        description: 'Google Cloud TTS with high-quality voices'
      };
    } catch (error) {
      providers.google = {
        name: 'Google Cloud Text-to-Speech',
        available: false,
        description: 'Google Cloud TTS (not configured)',
        error: 'Not configured or credentials missing'
      };
    }

    res.json({
      success: true,
      providers,
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

// Get TTS configuration
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
      maxTextLength: 5000
    };

    res.json({
      success: true,
      config,
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