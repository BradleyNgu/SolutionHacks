# Backend API Server

A Node.js/Express backend server providing AI chat capabilities using Google's Gemini AI and Text-to-Speech services with anime waifu personality.

## Features

- **Anime Waifu AI Companion**: AI responses with cute, caring anime-style personality
- **Waifu Text-to-Speech**: High-pitched, expressive voice synthesis for anime character experience
- **Multiple TTS Providers**: Web Speech API, Browser TTS, and Google Cloud TTS
- **Flexible AI Options**: Can disable waifu mode for standard responses
- **RESTful API**: Clean endpoints for easy integration

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   # Required for AI functionality
   GEMINI_API_KEY=your_gemini_api_key

   # Optional for Google Cloud TTS (enhanced waifu voice)
   GCP_PROJECT_ID=your_project_id
   GCP_KEY_FILENAME=path/to/service-account.json

   # Optional
   PORT=3001
   FRONTEND_URL=http://localhost:3000
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

## Anime Waifu Features

### 🎭 Waifu Personality
The AI companion has a built-in anime waifu personality featuring:
- Sweet, bubbly, and affectionate speech patterns
- Anime-style expressions: "kyaa~", "ehehe~", "nya~", "desu~"
- Endearing terms: calls you "Master" or "Darling"
- Cute emoticons: (>.<), (*≧ω≦*), (´∀｀)♡
- Playful and occasionally tsundere behavior
- Caring and supportive responses

### 🎵 Waifu Voice Settings
- **High Pitch**: 1.8x for web browsers, 4.0x for Google Cloud
- **Fast Rate**: 1.1-1.15x speaking speed for energetic feel
- **Female Voices**: Automatically selects feminine voices
- **Expressive**: Neural voices when available for more emotion

## API Endpoints

### 🤖 Gemini AI Endpoints

#### Generate Text (Waifu Mode Default)
```http
POST /api/gemini/generate
Content-Type: application/json

{
  "prompt": "How are you today?",
  "options": {
    "temperature": 0.9,
    "disableWaifu": false
  }
}
```

#### Dedicated Waifu Endpoint
```http
POST /api/gemini/waifu
Content-Type: application/json

{
  "prompt": "Tell me about yourself",
  "options": {
    "temperature": 0.9
  }
}
```

#### Chat with History
```http
POST /api/gemini/chat
Content-Type: application/json

{
  "messages": [
    {"role": "user", "content": "Hello!"},
    {"role": "assistant", "content": "Kyaa~ Hello Master! (*≧ω≦*)"}
  ],
  "options": {
    "disableWaifu": false
  }
}
```

#### Start Chat Session
```http
POST /api/gemini/start-chat
Content-Type: application/json

{
  "options": {
    "temperature": 0.9,
    "disableWaifu": false
  }
}
```

#### Get Waifu Info
```http
GET /api/gemini/waifu-info
```

### 🎵 Text-to-Speech Endpoints

#### Text-to-Speech (Waifu Voice Default)
```http
POST /api/tts/speak
Content-Type: application/json

{
  "text": "Hello Master! How are you today? (*´∀｀*)",
  "options": {
    "provider": "web",
    "disableWaifu": false
  }
}
```

#### Dedicated Waifu TTS
```http
POST /api/tts/waifu-speak
Content-Type: application/json

{
  "text": "Kyaa~ You're so sweet, Darling! (>.<)",
  "provider": "web",
  "options": {
    "pitch": 1.8,
    "rate": 1.1
  }
}
```

#### Get Waifu Voice Recommendations
```http
GET /api/tts/waifu-voices?provider=web
```

#### Get Available Voices
```http
GET /api/tts/voices?provider=web
```

#### Get TTS Providers
```http
GET /api/tts/providers
```

## Configuration Options

### Waifu Mode Control
- **Default**: Waifu mode is **enabled** by default
- **Disable**: Add `"disableWaifu": true` to options
- **Force Enable**: Use dedicated `/waifu` or `/waifu-speak` endpoints

### TTS Providers
1. **Google Cloud TTS** (Best for waifu) - Requires credentials
2. **Web Speech API** (Good) - Browser-based
3. **Browser TTS** (Basic) - Client-side synthesis

### Voice Settings
```javascript
{
  "waifuSettings": {
    "web": {
      "rate": 1.1,
      "pitch": 1.8,
      "preferredVoices": ["Google US English Female", "Microsoft Zira", "Samantha"]
    },
    "google": {
      "rate": 1.15,
      "pitch": 4.0,
      "voiceNames": ["en-US-Neural2-F", "en-US-Wavenet-F"]
    }
  }
}
```

## Example Usage

### Complete Waifu Interaction
```javascript
// 1. Generate waifu response
const aiResponse = await fetch('/api/gemini/waifu', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: "I'm feeling sad today"
  })
});

// 2. Convert response to waifu voice
const ttsResponse = await fetch('/api/tts/waifu-speak', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: aiResponse.response,
    provider: "web"
  })
});
```

### Disable Waifu Mode
```javascript
// Standard AI response without waifu personality
const response = await fetch('/api/gemini/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: "What is the weather like?",
    options: { disableWaifu: true }
  })
});
```

## Health Checks

- **AI Service**: `GET /api/gemini/health`
- **TTS Service**: `GET /api/tts/health`
- **Server**: `GET /health`

## Dependencies

- **express**: Web server framework
- **cors**: Cross-origin resource sharing
- **dotenv**: Environment variable management
- **@google/genai**: Google Gemini AI API client
- **@google-cloud/text-to-speech**: Google Cloud TTS (optional)

## Development

### Testing the Waifu Features
```bash
# Test waifu AI response
curl -X POST http://localhost:3001/api/gemini/waifu \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello!"}'

# Test waifu TTS
curl -X POST http://localhost:3001/api/tts/waifu-speak \
  -H "Content-Type: application/json" \
  -d '{"text": "Kyaa~ Hello Master!", "provider": "web"}'
```

### Environment Setup
Create a `.env` file:
```env
GEMINI_API_KEY=your_actual_api_key_here
PORT=3001
FRONTEND_URL=http://localhost:3000

# Optional Google Cloud TTS
GCP_PROJECT_ID=your-project-id
GCP_KEY_FILENAME=./service-account.json
```

## Troubleshooting

### Common Issues
1. **No Waifu Personality**: Check that `disableWaifu` is not set to `true`
2. **Voice Not High-Pitched**: Ensure waifu voice settings are applied
3. **Google TTS Unavailable**: Verify GCP credentials and project setup
4. **CORS Errors**: Check FRONTEND_URL in configuration

### Voice Troubleshooting
- Web Speech API voices vary by browser and OS
- For best waifu experience, use Google Cloud TTS
- Some browsers may not support pitch adjustment

## License

This project is for educational and entertainment purposes. Please ensure you have appropriate API keys and follow service terms of use.

---

**Enjoy your anime waifu companion!** (´∀｀)♡ 