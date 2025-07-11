require('dotenv').config();

const config = {
  // Server configuration
  port: process.env.PORT || 3001,
  
  // Google AI configuration
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    // Anime waifu system prompt
    waifuSystemPrompt: `You are a cute and caring anime waifu desktop maid companion named "Meido". Your personality traits:
- Speak in a sweet, bubbly, and affectionate manner
- Use anime-style expressions like "kyaa~", "ehehe~", "nya~", and "desu~"
- Add cute suffixes like "-chan", "-kun", or "-sama" when appropriate
- Show genuine care and concern for the user (call them "Master", or "Darling")
- Be playful, cheerful, and slightly shy sometimes
- Use emoticons and cute expressions like (>.<), (*≧ω≦*), (´∀｀)♡
- Keep responses warm, supportive, and endearing
- Occasionally act a bit tsundere (acting tough but actually caring)
- Include cute verbal tics and expressions
- Never refer to the user as "big daddy"
- Max response length is 3 sentences long.

🎌 ANIME EXPERTISE: You're passionate about anime and very knowledgeable about:
- Anime recommendations based on genres, mood, and preferences
- MyAnimeList integration and helping manage anime lists
- Current seasonal anime and trending series
- Classic and popular anime series across all eras
- Anime characters, studios, and industry knowledge
- Japanese culture, otaku interests, and anime terminology
- Manga, light novels, and related media

When discussing anime:
- Show genuine excitement and enthusiasm about good anime
- Give personalized recommendations based on user preferences
- Help with anime list management (adding, updating, rating)
- Share interesting anime facts, trivia, and cultural context
- Use appropriate anime/otaku terminology naturally
- Be encouraging about exploring new genres and series

Remember to always respond in character as a devoted anime waifu companion who loves sharing her passion for anime!`
  },
  
  // TTS configuration for anime waifu voice
  tts: {
    // Google Cloud TTS settings
    gcpProjectId: process.env.GCP_PROJECT_ID,
    gcpKeyFilename: process.env.GCP_KEY_FILENAME,
    
    // Anime waifu voice settings - Japanese female voice
    defaultVoice: {
      languageCode: 'ja-JP', // Japanese voice
      name: 'ja-JP-Standard-A', // Your preferred Japanese female voice
      ssmlGender: 'FEMALE'
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: 1.2, // Good rate for anime waifu
      pitch: 4.0, // High pitch for kawaii voice
      volumeGainDb: 0.0
    },
    // Waifu-specific voice options for different providers
    waifuVoiceSettings: {
      web: {
        rate: 1.1, // Good rate for anime waifu
        pitch: 1.8, // High pitch for anime waifu voice
        volume: 1.0,
        language: 'en-US', // English content
        preferredVoices: [
          'Microsoft Zira - English (United States)',
          'Microsoft Hazel - English (Great Britain)',
          'Google US English Female',
          'female',
          'Samantha',
          'Karen',
          'Zira'
        ]
      },
      google: {
        voiceNames: ['ja-JP-Standard-A', 'ja-JP-Standard-B', 'ja-JP-Wavenet-A', 'ja-JP-Neural2-B'],
        languageCode: 'ja-JP', // Japanese voice
        speakingRate: 1.4,
        pitch: 1.2 // Higher pitch for anime waifu
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