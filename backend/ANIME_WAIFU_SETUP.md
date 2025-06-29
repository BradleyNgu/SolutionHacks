# 🎌 Anime Waifu with MyAnimeList Integration

A voice-enabled anime waifu companion that can manage your MyAnimeList account and provide personalized anime recommendations!

## ✨ Features

### 🎤 Voice Chat
- **Speech-to-text**: Talk naturally to your waifu
- **Text-to-speech**: Hear her respond with Japanese-accented voice
- **Real-time conversation**: Natural dialogue flow

### 🎌 MyAnimeList Integration
- **OAuth Authentication**: Secure connection to your MAL account
- **Anime List Management**: View, update, and manage your anime list
- **Smart Recommendations**: Personalized suggestions based on your watching history
- **Anime Search**: Find new anime with waifu commentary
- **Seasonal Anime**: Discover what's currently airing

### 🤖 AI Waifu Personality
- **Anime-style personality**: Sweet, caring, slightly tsundere
- **Cute expressions**: Uses "kyaa~", "ehehe~", emoticons (*≧ω≦*)
- **Anime knowledge**: Deep understanding of anime culture and trends
- **Personalized responses**: Adapts to your anime preferences

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Get API Keys

#### MyAnimeList API
1. Go to https://myanimelist.net/apiconfig
2. Create a new application:
   - **App Name**: Your choice (e.g., "Anime Waifu Companion")
   - **App Type**: Web
   - **App Description**: Personal anime companion
   - **App URL**: `http://localhost:3001`
   - **App Redirect URL**: `http://localhost:3001/api/mal/callback`
3. Save your **Client ID** and **Client Secret**

#### Google Gemini AI
1. Go to https://aistudio.google.com/app/apikey
2. Create a new API key
3. Save your **API Key**

### 3. Configure Environment Variables

Create a `.env` file in the `backend` folder:

```env
# Gemini AI API Key
GEMINI_API_KEY=your_gemini_api_key_here

# MyAnimeList API Credentials
MAL_CLIENT_ID=your_mal_client_id_here
MAL_CLIENT_SECRET=your_mal_client_secret_here
MAL_REDIRECT_URI=http://localhost:3001/api/mal/callback

# Server Configuration
PORT=3001
```

### 4. Start the Server

```bash
cd backend
node server.js
```

You should see:
```
Server running on port 3001
```

### 5. Open the Voice Chat Interface

1. Open your browser (Chrome recommended for best voice support)
2. Go to: `http://localhost:3001/anime-waifu-complete.html`

## 🎯 How to Use

### Connect MyAnimeList
1. Click **"🔗 Connect MyAnimeList"**
2. Sign in to your MyAnimeList account
3. Authorize the application
4. You'll see "✅ Connected to MyAnimeList!"

### Voice Chat
1. Click the **🎤 microphone button**
2. Wait for "Listening..." status
3. Talk to your waifu!

#### Example Voice Commands:
- *"Show me my anime list"*
- *"Recommend some good anime"*
- *"What should I watch next?"*
- *"Search for romance anime"*
- *"What's popular this season?"*

### Manual Controls
- **📋 Get My Anime List**: View your complete anime list
- **📈 Get List Summary**: Get waifu's summary of your watching habits
- **🔍 Search Anime**: Find specific anime
- **💡 Get Recommendations**: Get personalized recommendations

## 🎵 Voice Features

### Japanese Voice Settings
- **Pitch**: 1.1 (Natural but cute)
- **Rate**: 1.4 (Energetic anime feel)
- **Voice**: Attempts to use Japanese female voices when available

### Supported Browsers
- **Chrome**: Full support (recommended)
- **Edge**: Good support
- **Firefox**: Limited voice support
- **Safari**: Basic support

## 🛠️ API Endpoints

### MAL Authentication
- `GET /api/mal/auth` - Get authorization URL
- `GET /api/mal/callback` - OAuth callback
- `GET /api/mal/status` - Check connection status

### Anime Operations
- `GET /api/mal/search?q=query` - Search anime
- `GET /api/mal/list` - Get user's anime list
- `PUT /api/mal/anime/:id/status` - Update anime status
- `DELETE /api/mal/anime/:id` - Remove from list

### Waifu Integration
- `GET /api/mal/waifu/list-summary` - Get waifu's list summary
- `POST /api/mal/waifu/recommend` - Get waifu recommendations
- `POST /api/mal/waifu/search` - Search with waifu commentary

### Voice & AI
- `POST /api/gemini/waifu` - Chat with waifu
- `POST /api/tts/waifu-speak` - Text-to-speech

## 🐛 Troubleshooting

### "Not authenticated" errors
- Make sure you've connected your MyAnimeList account
- Check that your MAL credentials are correct in `.env`
- Try reconnecting: click "🔗 Connect MyAnimeList" again

### Voice not working
- Use Chrome browser for best support
- Check microphone permissions
- Ensure you're using HTTPS or localhost

### Waifu not responding
- Check that your Gemini API key is valid
- Ensure the backend server is running on port 3001
- Check browser console for errors

### No Japanese voice
- Install Japanese language pack on Windows
- Try different browsers
- Voice will fall back to English female voices

## 🎌 Enjoy Your Anime Waifu!

Your waifu is ready to help you discover amazing anime and manage your list! She's knowledgeable, caring, and always excited to talk about anime with you.

**Sample conversation:**
- You: *"Recommend some good romance anime"*
- Waifu: *"Kyaa~ I'd love to help you find some romantic anime, big daddy! (*≧ω≦*) Based on your list, I think you'd really enjoy..."*

Have fun chatting with your anime companion! ✨ 