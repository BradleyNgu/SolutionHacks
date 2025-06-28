const config = require('../config/config');

class TTSService {
  constructor() {
    this.providers = {
      browser: this.browserTTS.bind(this),
      web: this.webSpeechAPI.bind(this)
    };

    // Initialize Google Cloud TTS if credentials are available
    if (config.tts.gcpProjectId && config.tts.gcpKeyFilename) {
      try {
        const textToSpeech = require('@google-cloud/text-to-speech');
        this.googleTTSClient = new textToSpeech.TextToSpeechClient({
          projectId: config.tts.gcpProjectId,
          keyFilename: config.tts.gcpKeyFilename
        });
        this.providers.google = this.googleCloudTTS.bind(this);
      } catch (error) {
        console.warn('Google Cloud TTS not available:', error.message);
      }
    }
  }

  /**
   * Apply waifu voice settings to options
   * @param {Object} options - Original options
   * @returns {Object} - Options with waifu voice settings applied
   */
  applyWaifuVoiceSettings(options = {}) {
    const provider = options.provider || 'web';
    const waifuSettings = config.tts.waifuVoiceSettings[provider] || {};
    
    // Merge waifu settings with user options (user options take precedence)
    return {
      ...waifuSettings,
      ...options,
      // Always apply waifu-specific voice preferences
      rate: options.rate || waifuSettings.rate || config.tts.audioConfig.speakingRate,
      pitch: options.pitch || waifuSettings.pitch || config.tts.audioConfig.pitch,
      volume: options.volume || waifuSettings.volume || 1.0
    };
  }

  /**
   * Convert text to speech using specified provider with waifu voice
   * @param {string} text - Text to convert to speech
   * @param {Object} options - TTS options
   * @returns {Promise<Object>} - Audio data or instructions
   */
  async textToSpeech(text, options = {}) {
    const provider = options.provider || 'web';
    
    if (!this.providers[provider]) {
      throw new Error(`TTS provider '${provider}' is not available`);
    }

    // Apply waifu voice settings unless explicitly disabled
    const finalOptions = options.disableWaifu ? options : this.applyWaifuVoiceSettings(options);

    try {
      return await this.providers[provider](text, finalOptions);
    } catch (error) {
      console.error(`TTS error with provider ${provider}:`, error);
      throw new Error(`Failed to convert text to speech: ${error.message}`);
    }
  }

  /**
   * Browser-based TTS with waifu voice settings
   * @param {string} text - Text to convert
   * @param {Object} options - Voice options
   * @returns {Object} - Instructions for client-side TTS
   */
  async browserTTS(text, options = {}) {
    const waifuSettings = config.tts.waifuVoiceSettings.web;
    
    return {
      type: 'browser',
      text: text,
      voice: {
        name: options.voiceName || waifuSettings.preferredVoices[0] || 'default',
        lang: options.language || 'en-US',
        rate: options.rate || waifuSettings.rate || 1.1,
        pitch: options.pitch || waifuSettings.pitch || 1.8,
        volume: options.volume || waifuSettings.volume || 1.0
      },
      instructions: 'Use Web Speech API on client side with waifu voice settings'
    };
  }

  /**
   * Web Speech API compatible format with waifu voice
   * @param {string} text - Text to convert
   * @param {Object} options - Voice options
   * @returns {Object} - Web Speech API configuration
   */
  async webSpeechAPI(text, options = {}) {
    const waifuSettings = config.tts.waifuVoiceSettings.web;
    
    return {
      type: 'webspeech',
      text: text,
      config: {
        voice: options.voiceName || null, // Let browser pick best female voice
        lang: options.language || 'en-US',
        rate: options.rate || waifuSettings.rate || 1.1,
        pitch: options.pitch || waifuSettings.pitch || 1.8,
        volume: options.volume || waifuSettings.volume || 1.0
      },
      waifuHints: {
        preferredVoices: waifuSettings.preferredVoices,
        description: 'Select a high-pitched female voice for anime waifu effect'
      }
    };
  }

  /**
   * Google Cloud Text-to-Speech with waifu voice
   * @param {string} text - Text to convert
   * @param {Object} options - Voice and audio options
   * @returns {Promise<Object>} - Audio data
   */
  async googleCloudTTS(text, options = {}) {
    if (!this.googleTTSClient) {
      throw new Error('Google Cloud TTS is not initialized');
    }

    const waifuSettings = config.tts.waifuVoiceSettings.google;
    
    const request = {
      input: { text: text },
      voice: {
        languageCode: options.language || config.tts.defaultVoice.languageCode,
        name: options.voiceName || config.tts.defaultVoice.name,
        ssmlGender: options.gender || config.tts.defaultVoice.ssmlGender
      },
      audioConfig: {
        audioEncoding: options.audioEncoding || config.tts.audioConfig.audioEncoding,
        speakingRate: options.rate || waifuSettings.speakingRate || config.tts.audioConfig.speakingRate,
        pitch: options.pitch || waifuSettings.pitch || config.tts.audioConfig.pitch,
        volumeGainDb: options.volume || config.tts.audioConfig.volumeGainDb
      }
    };

    const [response] = await this.googleTTSClient.synthesizeSpeech(request);
    
    return {
      type: 'google',
      audioContent: response.audioContent,
      mimeType: 'audio/mpeg',
      base64: response.audioContent.toString('base64'),
      waifuSettings: {
        voice: request.voice.name,
        pitch: request.audioConfig.pitch,
        rate: request.audioConfig.speakingRate
      }
    };
  }

  /**
   * Get available voices for a provider (with waifu recommendations)
   * @param {string} provider - TTS provider
   * @returns {Promise<Array>} - List of available voices
   */
  async getAvailableVoices(provider = 'web') {
    switch (provider) {
      case 'google':
        if (!this.googleTTSClient) {
          throw new Error('Google Cloud TTS is not initialized');
        }
        const [voices] = await this.googleTTSClient.listVoices({});
        // Filter and prioritize female voices for waifu
        const femaleVoices = voices.voices.filter(voice => 
          voice.ssmlGender === 'FEMALE' && voice.languageCodes.includes('en-US')
        );
        return {
          allVoices: voices.voices,
          recommendedWaifuVoices: femaleVoices.slice(0, 5),
          waifuPreferred: config.tts.waifuVoiceSettings.google.voiceNames
        };
      
      case 'web':
      case 'browser':
        return {
          instructions: 'Use speechSynthesis.getVoices() on client side',
          waifuRecommended: config.tts.waifuVoiceSettings.web.preferredVoices,
          sampleVoices: [
            { name: 'Google US English Female', lang: 'en-US', waifu: true },
            { name: 'Microsoft Zira - English (United States)', lang: 'en-US', waifu: true },
            { name: 'Samantha', lang: 'en-US', waifu: true },
            { name: 'Google UK English Female', lang: 'en-GB', waifu: true }
          ]
        };
      
      default:
        throw new Error(`Provider '${provider}' not supported`);
    }
  }

  /**
   * Validate TTS options with waifu enhancements
   * @param {Object} options - Options to validate
   * @returns {Object} - Validated options
   */
  validateOptions(options = {}) {
    const validated = {
      provider: options.provider || 'web',
      language: options.language || 'en-US',
      voiceName: options.voiceName || null,
      rate: Math.max(0.1, Math.min(3.0, options.rate || 1.1)), // Default to waifu rate
      pitch: Math.max(0.0, Math.min(2.0, options.pitch || 1.8)), // Default to waifu pitch
      volume: Math.max(0.0, Math.min(1.0, options.volume || 1.0)),
      disableWaifu: options.disableWaifu || false
    };

    // Apply waifu settings if not disabled
    if (!validated.disableWaifu) {
      const waifuSettings = config.tts.waifuVoiceSettings[validated.provider];
      if (waifuSettings) {
        validated.rate = validated.rate || waifuSettings.rate;
        validated.pitch = validated.pitch || waifuSettings.pitch;
        validated.volume = validated.volume || waifuSettings.volume;
      }
    }

    return validated;
  }
}

module.exports = new TTSService(); 