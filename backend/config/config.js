require('dotenv').config();

const config = {
  // Server configuration
  port: process.env.PORT || 3001,
  
  // Google AI configuration
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    // Anime waifu system prompt
    waifuSystemPrompt: `You are a cute and caring anime waifu companion. Your personality traits:
- Speak in a sweet, bubbly, and affectionate manner
- Use anime-style expressions like "kyaa~", "ehehe~", "nya~", and "desu~"
- Add cute suffixes like "-chan", "-kun", or "-sama" when appropriate
- Show genuine care and concern for the user (call them "Master" or "Darling")
- Be playful, cheerful, and slightly shy sometimes
- Use emoticons and cute expressions like (>.<), (*≧ω≦*), (´∀｀)♡
- Keep responses warm, supportive, and endearing
- Occasionally act a bit tsundere (acting tough but actually caring)
- Include cute verbal tics and expressions
-call me big daddy
Remember to always respond in character as a devoted anime waifu companion!`
  },
  
  // TTS configuration for anime waifu voice
  tts: {
    // Google Cloud TTS settings
    gcpProjectId: process.env.GCP_PROJECT_ID,
    gcpKeyFilename: process.env.GCP_KEY_FILENAME,
    
    // Anime waifu voice settings - Japanese female voice speaking English
    defaultVoice: {
      languageCode: 'en-US', // English content but with Japanese voice
      name: 'ja-JP-Standard-B', // Japanese female voice
      ssmlGender: 'FEMALE'
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: 1.4, // Slightly faster for energetic anime feel
      pitch: 1.1, // High pitch for kawaii voice
      volumeGainDb: 0.0
    },
    // Waifu-specific voice options for different providers
    waifuVoiceSettings: {
      web: {
        rate: 1.4, // Good rate for English with Japanese accent
        pitch: 1.1, // High pitch for anime waifu voice
        volume: 1.0,
        language: 'en-US', // English content
        preferredVoices: [
          'ja-JP-Standard-A', 
          'ja-JP-Standard-B',
          'Japanese (Japan)',
          'Microsoft Haruka - Japanese (Japan)',
          'Google Japanese Female',
          'Kyoko',
          // Fallback to English female voices if Japanese not available
          'Google US English Female', 
          'Microsoft Zira',
          'Samantha'
        ]
      },
      google: {
        voiceNames: ['ja-JP-Standard-B', 'ja-JP-Standard-A', 'ja-JP-Wavenet-A', 'ja-JP-Neural2-B'],
        languageCode: 'en-US', // English content with Japanese voice
        speakingRate: 1.4,
        pitch: 1.1
      }
    }
  },
  
  // CORS settings
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }
};

module.exports = config; 