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
Remember to always respond in character as a devoted anime waifu companion!`
  },
  
  // TTS configuration for anime waifu voice
  tts: {
    // Google Cloud TTS settings
    gcpProjectId: process.env.GCP_PROJECT_ID,
    gcpKeyFilename: process.env.GCP_KEY_FILENAME,
    
    // Anime waifu voice settings - higher pitch, faster rate, more expressive
    defaultVoice: {
      languageCode: 'en-US',
      name: 'en-US-Neural2-F', // Female neural voice (more expressive)
      ssmlGender: 'FEMALE'
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: 1.15, // Slightly faster for cute anime feel
      pitch: 4.0, // Higher pitch for anime waifu voice
      volumeGainDb: 0.0
    },
    // Waifu-specific voice options for different providers
    waifuVoiceSettings: {
      web: {
        rate: 1.1,
        pitch: 1.8, // Higher pitch for web speech API
        volume: 1.0,
        preferredVoices: ['Google US English Female', 'Microsoft Zira', 'Samantha']
      },
      google: {
        voiceNames: ['en-US-Neural2-F', 'en-US-Wavenet-F', 'en-US-Standard-C'],
        speakingRate: 1.15,
        pitch: 4.0
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