# Frontend-Backend Connection Guide

## 🎉 Your Frontend and Backend are now Connected!

The application has been updated to properly connect the Electron frontend with the Express.js backend.

## What Changed

### ✅ Security Improvements
- **Removed direct API calls** from the frontend renderer process
- **Eliminated exposed API keys** in the client-side code
- **Added secure IPC communication** between processes

### ✅ Backend Integration
- **All AI requests** now go through your backend API (`/api/gemini/*`)
- **TTS functionality** integrated with your backend (`/api/tts/*`)
- **MAL integration** uses backend authentication
- **Proper error handling** and fallback mechanisms

### ✅ New Features
- **Voice synthesis** for both chat responses and click reactions
- **Health check** on startup to verify backend connection
- **Graceful fallbacks** when backend services are unavailable

## How to Run

### Option 1: Using Startup Scripts (Recommended)

**Windows:**
```bash
# Double-click or run:
start-app.bat
```

**Linux/Mac:**
```bash
# Make executable first time:
chmod +x start-app.sh

# Then run:
./start-app.sh
```

### Option 2: Manual Startup

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```

**Terminal 2 - Frontend:**
```bash
cd frontend  
npm start
```

## How It Works

```
┌─────────────────┐    IPC    ┌─────────────────┐    HTTP    ┌─────────────────┐
│   Renderer      │◄─────────►│   Main Process  │◄──────────►│   Backend API   │
│   (Frontend UI) │           │   (Electron)    │            │   (Express.js)  │
└─────────────────┘           └─────────────────┘            └─────────────────┘
      │                              │                              │
      ├─ Speech Bubbles              ├─ API Routing                 ├─ Gemini AI
      ├─ Voice Recording             ├─ Speech Recognition          ├─ Text-to-Speech  
      ├─ Animation                   ├─ Window Management           ├─ MyAnimeList
      └─ User Interactions           └─ Security Layer              └─ Health Checks
```

## API Endpoints Used

The frontend now communicates with these backend endpoints:

- **`POST /api/gemini/waifu`** - AI chat responses with anime personality
- **`POST /api/tts/waifu-speak`** - Text-to-speech with cute voice settings
- **`GET /api/mal/auth`** - MyAnimeList authentication
- **`GET /health`** - Backend health check

## Testing the Connection

1. **Start both services** using one of the methods above
2. **Check the console** in the Electron app (Ctrl+Shift+I) for:
   - ✅ "Backend connection successful" 
3. **Try voice chat** by right-clicking the system tray icon → "Talk to Maid"
4. **Click the character** to hear voice responses
5. **Check backend logs** for incoming API requests

## Troubleshooting

### Backend Not Starting
- Ensure you have all dependencies: `cd backend && npm install`
- Check if port 3001 is available
- Verify your `.env` file has the required API keys

### Frontend Connection Errors  
- Make sure backend is running on `http://localhost:3001`
- Check the Electron console for error messages
- Restart both services if needed

### Voice/TTS Not Working
- The app will fall back to browser TTS if backend TTS fails
- Check backend logs for TTS service errors
- Ensure microphone permissions are granted

## Environment Variables

Make sure your backend `.env` file includes:
```env
GEMINI_KEY=your_gemini_api_key
GOOGLE_APPLICATION_CREDENTIALS=path/to/your/service-account.json
PORT=3001
```

## Success Indicators

✅ **Backend running**: Console shows "Server running on port 3001"  
✅ **Frontend connected**: Electron console shows "Backend connection successful"  
✅ **Voice working**: Character speaks when clicked or after voice input  
✅ **AI responding**: Speech bubbles show AI responses from backend  

Your anime maid desktop companion is now fully connected and ready to chat! 🎌✨ 