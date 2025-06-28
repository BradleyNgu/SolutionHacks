# SolutionHacks Backend

A Node.js backend service providing Text-to-Speech (TTS) and Google Gemini AI integration.

## Features

- **Gemini AI Integration**: Text generation, chat functionality, and conversation management
- **Text-to-Speech**: Multiple TTS providers including Web Speech API and Google Cloud TTS
- **RESTful API**: Well-structured endpoints for frontend integration
- **Environment Configuration**: Flexible configuration with environment variables

## Setup Instructions

### 1. Environment Configuration

Copy the environment template and configure your API keys:

```bash
cp backend/env.template backend/.env
```

Edit `backend/.env` and add your API keys:

```env
# Required
GEMINI_API_KEY=your_actual_gemini_api_key

# Optional (for enhanced TTS)
GCP_PROJECT_ID=your_google_cloud_project_id
GCP_KEY_FILENAME=path/to/service-account-key.json
```

### 2. Get Your Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key to your `.env` file

### 3. Install Dependencies

```bash
npm install
```

### 4. Start the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will start on `http://localhost:3001`

## API Endpoints

### Health Check
- `GET /health` - Check if the server is running

### Gemini AI Endpoints

#### Generate Text
```
POST /api/gemini/generate
Content-Type: application/json

{
  "prompt": "Your text prompt here",
  "options": {
    "temperature": 0.7,
    "maxTokens": 2048,
    "enableThinking": false
  }
}
```

#### Chat with History
```
POST /api/gemini/chat
Content-Type: application/json

{
  "messages": [
    {"role": "user", "content": "Hello"},
    {"role": "assistant", "content": "Hi there!"},
    {"role": "user", "content": "How are you?"}
  ],
  "options": {
    "temperature": 0.7
  }
}
```

#### Start Chat Session
```
POST /api/gemini/start-chat
Content-Type: application/json

{
  "options": {
    "temperature": 0.7
  }
}
```

#### Send Message
```
POST /api/gemini/send-message
Content-Type: application/json

{
  "message": "Your message here",
  "sessionId": "session_id_from_start_chat"
}
```

#### Health Check
```
GET /api/gemini/health
```

### TTS Endpoints

#### Convert Text to Speech
```
POST /api/tts/speak
Content-Type: application/json

{
  "text": "Hello, this is a test",
  "options": {
    "provider": "web",
    "language": "en-US",
    "rate": 1.0,
    "pitch": 1.0,
    "volume": 1.0
  }
}
```

#### Speak with Specific Voice
```
POST /api/tts/speak-with-voice
Content-Type: application/json

{
  "text": "Hello world",
  "provider": "web",
  "voiceName": "Google US English",
  "language": "en-US",
  "options": {
    "rate": 1.2,
    "pitch": 0.8
  }
}
```

#### Get Available Voices
```
GET /api/tts/voices?provider=web
```

#### Get TTS Providers
```
GET /api/tts/providers
```

#### Get TTS Configuration
```
GET /api/tts/config
```

#### Health Check
```
GET /api/tts/health
```

## TTS Providers

### Web Speech API (Default)
- **Provider**: `web`
- **Description**: Browser-based TTS using Web Speech API
- **Advantages**: No additional setup required, works in most browsers
- **Limitations**: Voice quality depends on browser and OS

### Browser TTS
- **Provider**: `browser`
- **Description**: Client-side text-to-speech synthesis
- **Usage**: Returns configuration for client-side implementation

### Google Cloud TTS (Optional)
- **Provider**: `google`
- **Description**: High-quality voices from Google Cloud
- **Setup**: Requires Google Cloud project and service account
- **Advantages**: High-quality voices, many languages and voice options

## Configuration Options

### Gemini AI Options
- `temperature`: Controls randomness (0.0 to 1.0)
- `topP`: Controls diversity (0.0 to 1.0)
- `topK`: Controls diversity (1 to 40)
- `maxTokens`: Maximum response length

### TTS Options
- `provider`: TTS provider (`web`, `browser`, `google`)
- `language`: Language code (e.g., `en-US`, `es-ES`)
- `voiceName`: Specific voice name
- `rate`: Speaking rate (0.1 to 3.0)
- `pitch`: Voice pitch (0.0 to 2.0)
- `volume`: Volume level (0.0 to 1.0)

## Error Handling

All endpoints return structured error responses:

```json
{
  "error": "Error description",
  "message": "Detailed error message"
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad Request (missing required parameters)
- `500`: Internal Server Error
- `503`: Service Unavailable (API service down)

## Development

### Project Structure
```
backend/
├── config/
│   └── config.js          # Configuration management
├── routes/
│   ├── geminiRoutes.js    # Gemini AI endpoints
│   └── ttsRoutes.js       # TTS endpoints
├── services/
│   ├── geminiService.js   # Gemini AI service logic
│   └── ttsService.js      # TTS service logic
├── server.js              # Main server file
├── env.template           # Environment template
└── README.md              # This file
```

### Adding New Features

1. **New Service**: Add to `services/` directory
2. **New Routes**: Add to `routes/` directory and register in `server.js`
3. **Configuration**: Add to `config/config.js`

## Troubleshooting

### Common Issues

1. **"Gemini API key is required"**
   - Make sure `GEMINI_API_KEY` is set in your `.env` file
   - Verify the API key is valid

2. **"Google Cloud TTS not available"**
   - This is optional - the system will use Web Speech API instead
   - To enable: Set up Google Cloud project and add credentials

3. **CORS Errors**
   - Make sure your frontend URL is configured in `FRONTEND_URL`
   - Default allows `http://localhost:3000`

4. **Port Already in Use**
   - Change the `PORT` in your `.env` file
   - Default is `3001`

## License

This project is licensed under the ISC License. 