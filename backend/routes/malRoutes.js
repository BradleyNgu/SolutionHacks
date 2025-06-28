const express = require('express');
const router = express.Router();
const malService = require('../services/malService');
const geminiService = require('../services/geminiService');

// Store for user tokens and PKCE codes (in production, use a proper database)
const userTokens = new Map();
const pkceStorage = new Map(); // Store PKCE code_verifiers

// OAuth Authentication Routes

// Get authorization URL
router.get('/auth', (req, res) => {
    try {
        const userId = 'default'; // In production, get from session/auth
        
        // Generate PKCE parameters with corrected base64url encoding
        const state = malService.generateRandomState();
        const codeVerifier = malService.generateCodeVerifier();
        const codeChallenge = malService.generateCodeChallenge(codeVerifier);
        
        console.log('Generated PKCE parameters (PLAIN method):', {
            state,
            codeVerifier_length: codeVerifier.length,
            codeChallenge_length: codeChallenge.length,
            verifier_equals_challenge: codeVerifier === codeChallenge,
            codeVerifier_sample: codeVerifier.substring(0, 10) + '...',
            codeChallenge_sample: codeChallenge.substring(0, 10) + '...'
        });
        
        // Store code verifier for this user/state
        pkceStorage.set(state, codeVerifier);
        
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: process.env.MAL_CLIENT_ID,
            redirect_uri: process.env.MAL_REDIRECT_URI || 'http://localhost:3001/api/mal/callback',
            scope: 'write:users',
            state: state,
            code_challenge: codeChallenge,
            code_challenge_method: 'plain'
        });
        
        const authURL = `https://myanimelist.net/v1/oauth2/authorize?${params.toString()}`;
        
        res.json({
            success: true,
            authURL,
            state, // Return state for debugging
            message: "Visit this URL to authorize the application with MyAnimeList"
        });
    } catch (error) {
        console.error('Auth URL Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// OAuth callback
router.get('/callback', async (req, res) => {
    try {
        const { code, state, error } = req.query;
        
        console.log('OAuth Callback received:', { code: !!code, state, error });
        
        if (error) {
            return res.status(400).json({
                success: false,
                error: `OAuth error: ${error}`
            });
        }

        if (!code) {
            return res.status(400).json({
                success: false,
                error: 'Authorization code not provided'
            });
        }

        if (!state) {
            return res.status(400).json({
                success: false,
                error: 'State parameter not provided'
            });
        }

        // Get the stored code_verifier for this state
        const codeVerifier = pkceStorage.get(state);
        if (!codeVerifier) {
            return res.status(400).json({
                success: false,
                error: 'Invalid state or expired authorization request'
            });
        }

        // Clean up the stored code_verifier
        pkceStorage.delete(state);

        // Exchange code for token with the correct code_verifier
        const tokenResult = await exchangeCodeForToken(code, codeVerifier);
        
        if (!tokenResult.success) {
            console.error('Token exchange failed:', tokenResult.error);
            return res.status(400).json(tokenResult);
        }

        // Store token (in production, associate with user ID)
        const userId = 'default';
        userTokens.set(userId, {
            accessToken: tokenResult.accessToken,
            refreshToken: tokenResult.refreshToken,
            expiresAt: Date.now() + (tokenResult.expiresIn * 1000)
        });

        console.log('MAL authentication successful for user:', userId);

        // Return success page
        res.send(`
            <html>
                <body style="font-family: Arial; text-align: center; padding: 50px; background: linear-gradient(135deg, #ff9a9e, #fecfef);">
                    <h1 style="color: #e91e63;">🎌 MyAnimeList Connected!</h1>
                    <p style="font-size: 18px;">Your waifu can now access your anime list! (*≧ω≦*)</p>
                    <p>You can now close this window and return to the voice chat.</p>
                    <script>
                        setTimeout(() => {
                            window.close();
                        }, 3000);
                    </script>
                </body>
            </html>
        `);
    } catch (error) {
        console.error('Callback Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Helper function to exchange code for token
async function exchangeCodeForToken(authorizationCode, codeVerifier) {
    try {
        const requestBody = {
            grant_type: 'authorization_code',
            code: authorizationCode,
            redirect_uri: process.env.MAL_REDIRECT_URI || 'http://localhost:3001/api/mal/callback',
            client_id: process.env.MAL_CLIENT_ID,
            code_verifier: codeVerifier
        };

        // Include client_secret if available (Scheme 2 from MAL docs)
        if (process.env.MAL_CLIENT_SECRET) {
            requestBody.client_secret = process.env.MAL_CLIENT_SECRET;
        }

        console.log('Token exchange request (PLAIN method):', {
            grant_type: requestBody.grant_type,
            redirect_uri: requestBody.redirect_uri,
            client_id: requestBody.client_id,
            code_verifier_length: codeVerifier.length,
            has_client_secret: !!requestBody.client_secret
        });

        const response = await fetch('https://myanimelist.net/v1/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(requestBody)
        });

        const data = await response.json();
        console.log('Token exchange response status:', response.status);
        
        if (!response.ok) {
            console.error('Token exchange error response:', data);
            throw new Error(`Token exchange failed: ${data.error} - ${data.error_description || data.message}`);
        }

        return {
            success: true,
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresIn: data.expires_in
        };
    } catch (error) {
        console.error('Token Exchange Error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Check authentication status
router.get('/status', (req, res) => {
    const userId = 'default';
    const userToken = userTokens.get(userId);
    
    if (!userToken) {
        return res.json({
            success: false,
            authenticated: false,
            message: 'Not authenticated with MyAnimeList'
        });
    }

    const isExpired = Date.now() > userToken.expiresAt;
    
    res.json({
        success: true,
        authenticated: !isExpired,
        expiresAt: userToken.expiresAt,
        message: isExpired ? 'Token expired' : 'Authenticated'
    });
});

// Anime Search Routes

// Search for anime
router.get('/search', async (req, res) => {
    try {
        const { q: query, limit = 10 } = req.query;
        
        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'Search query is required'
            });
        }

        const userId = 'default';
        const userToken = userTokens.get(userId);
        
        if (!userToken || Date.now() > userToken.expiresAt) {
            return res.status(401).json({
                success: false,
                error: 'Not authenticated or token expired'
            });
        }

        const result = await malService.searchAnime(query, userToken.accessToken, parseInt(limit));
        res.json(result);
    } catch (error) {
        console.error('Search Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get anime details
router.get('/anime/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = 'default';
        const userToken = userTokens.get(userId);
        
        if (!userToken || Date.now() > userToken.expiresAt) {
            return res.status(401).json({
                success: false,
                error: 'Not authenticated or token expired'
            });
        }

        const result = await malService.getAnimeDetails(parseInt(id), userToken.accessToken);
        res.json(result);
    } catch (error) {
        console.error('Get Anime Details Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// User List Management Routes

// Get user's anime list
router.get('/list', async (req, res) => {
    try {
        const { status, limit = 100 } = req.query;
        const userId = 'default';
        const userToken = userTokens.get(userId);
        
        if (!userToken || Date.now() > userToken.expiresAt) {
            return res.status(401).json({
                success: false,
                error: 'Not authenticated or token expired'
            });
        }

        const result = await malService.getUserAnimeList(
            userToken.accessToken,
            status,
            parseInt(limit)
        );
        res.json(result);
    } catch (error) {
        console.error('Get List Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Update anime status
router.put('/anime/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const userId = 'default';
        const userToken = userTokens.get(userId);
        
        if (!userToken || Date.now() > userToken.expiresAt) {
            return res.status(401).json({
                success: false,
                error: 'Not authenticated or token expired'
            });
        }

        const result = await malService.updateAnimeStatus(
            parseInt(id),
            userToken.accessToken,
            updateData
        );
        res.json(result);
    } catch (error) {
        console.error('Update Status Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Delete anime from list
router.delete('/anime/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = 'default';
        const userToken = userTokens.get(userId);
        
        if (!userToken || Date.now() > userToken.expiresAt) {
            return res.status(401).json({
                success: false,
                error: 'Not authenticated or token expired'
            });
        }

        const result = await malService.deleteAnimeFromList(
            parseInt(id),
            userToken.accessToken
        );
        res.json(result);
    } catch (error) {
        console.error('Delete Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get seasonal anime
router.get('/season/:year/:season', async (req, res) => {
    try {
        const { year, season } = req.params;
        const { limit = 20 } = req.query;
        const userId = 'default';
        const userToken = userTokens.get(userId);
        
        if (!userToken || Date.now() > userToken.expiresAt) {
            return res.status(401).json({
                success: false,
                error: 'Not authenticated or token expired'
            });
        }

        const result = await malService.getSeasonalAnime(
            parseInt(year),
            season,
            userToken.accessToken,
            parseInt(limit)
        );
        res.json(result);
    } catch (error) {
        console.error('Seasonal Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Waifu Integration Routes

// Get waifu response about anime list
router.get('/waifu/list-summary', async (req, res) => {
    try {
        const userId = 'default';
        const userToken = userTokens.get(userId);
        
        if (!userToken || Date.now() > userToken.expiresAt) {
            return res.json({
                success: true,
                response: "Kyaa~ You need to connect your MyAnimeList account first, big daddy! (>.<) Use the /api/mal/auth endpoint to get started! ✨"
            });
        }

        const listResult = await malService.getUserAnimeList(userToken.accessToken);
        
        if (!listResult.success) {
            return res.json({
                success: true,
                response: "Ehehe~ I'm having trouble accessing your anime list right now, big daddy! (>.<) Maybe try reconnecting?"
            });
        }

        const waifuResponse = malService.formatAnimeListForWaifu(listResult.animeList);
        
        res.json({
            success: true,
            response: waifuResponse,
            animeCount: listResult.animeList.length
        });
    } catch (error) {
        console.error('Waifu List Summary Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Waifu anime recommendations
router.post('/waifu/recommend', async (req, res) => {
    try {
        const { genres, preferences } = req.body;
        const userId = 'default';
        const userToken = userTokens.get(userId);
        
        if (!userToken || Date.now() > userToken.expiresAt) {
            return res.json({
                success: true,
                response: "I'd love to recommend anime for you, big daddy, but you need to connect your MyAnimeList account first! (´∀｀)♡"
            });
        }

        // Get user's list to understand preferences
        const listResult = await malService.getUserAnimeList(userToken.accessToken);
        
        let prompt = `As an anime waifu, recommend anime based on the user's request. `;
        
        if (listResult.success && listResult.animeList.length > 0) {
            const completedAnime = listResult.animeList
                .filter(a => a.myStatus === 'completed')
                .map(a => a.title)
                .slice(0, 10);
            
            prompt += `The user has completed these anime: ${completedAnime.join(', ')}. `;
        }
        
        if (genres) {
            prompt += `They're interested in ${genres} genres. `;
        }
        
        if (preferences) {
            prompt += `Additional preferences: ${preferences}. `;
        }
        
        prompt += `Give 3-5 specific anime recommendations with brief descriptions in waifu style.`;

        const waifuResponse = await geminiService.generateResponse(prompt, { waifuMode: true });
        
        res.json({
            success: true,
            response: waifuResponse.response
        });
    } catch (error) {
        console.error('Waifu Recommend Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Waifu anime search with personality
router.post('/waifu/search', async (req, res) => {
    try {
        const { query } = req.body;
        
        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'Search query is required'
            });
        }

        const userId = 'default';
        const userToken = userTokens.get(userId);
        
        if (!userToken || Date.now() > userToken.expiresAt) {
            return res.json({
                success: true,
                response: "I want to search for anime with you, big daddy, but you need to connect MyAnimeList first! (>.<)"
            });
        }

        const searchResult = await malService.searchAnime(query, userToken.accessToken, 5);
        
        if (!searchResult.success) {
            return res.json({
                success: true,
                response: `Kyaa~ I couldn't find any anime matching "${query}", big daddy! (>.<) Maybe try a different search? ✨`
            });
        }

        let waifuResponse = `Kyaa~ I found some anime for "${query}", big daddy! (*≧ω≦*)\n\n`;
        
        searchResult.anime.forEach((anime, index) => {
            waifuResponse += `${index + 1}. **${anime.title}**\n`;
            if (anime.score) waifuResponse += `   ⭐ Score: ${anime.score}/10\n`;
            if (anime.episodes) waifuResponse += `   📺 Episodes: ${anime.episodes}\n`;
            if (anime.genres.length > 0) waifuResponse += `   🏷️ Genres: ${anime.genres.join(', ')}\n`;
            waifuResponse += '\n';
        });
        
        waifuResponse += `Want me to add any of these to your list or get more details? Just ask! (´∀｀)♡`;
        
        res.json({
            success: true,
            response: waifuResponse,
            searchResults: searchResult.anime
        });
    } catch (error) {
        console.error('Waifu Search Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Waifu add anime to list
router.post('/waifu/add', async (req, res) => {
    try {
        const { animeName, status = 'plan_to_watch', originalText } = req.body;
        
        if (!animeName) {
            return res.json({
                success: true,
                response: "Kyaa~ Which anime do you want me to add, big daddy? I need to know the name! (>.<)"
            });
        }

        const userId = 'default';
        const userToken = userTokens.get(userId);
        
        if (!userToken || Date.now() > userToken.expiresAt) {
            return res.json({
                success: true,
                response: "I'd love to add anime to your list, big daddy, but you need to connect MyAnimeList first! (´∀｀)♡"
            });
        }

        // First search for the anime
        const searchResult = await malService.searchAnime(animeName, userToken.accessToken, 3);
        
        if (!searchResult.success || searchResult.anime.length === 0) {
            return res.json({
                success: true,
                response: `Ehehe~ I couldn't find an anime called "${animeName}", big daddy! (>.<) Could you check the spelling or try a different name? ✨`
            });
        }

        // Take the first/best match
        const anime = searchResult.anime[0];
        
        // Add to list
        const updateResult = await malService.updateAnimeStatus(
            anime.id,
            userToken.accessToken,
            { status: status }
        );

        if (updateResult.success) {
            return res.json({
                success: true,
                response: `Kyaa~ I've added "${anime.title}" to your ${status.replace('_', ' ')} list, big daddy! (*≧ω≦*) It looks amazing! ✨`
            });
        } else {
            return res.json({
                success: true,
                response: `Oh no! I had trouble adding "${anime.title}" to your list, big daddy! (>.<) Maybe it's already there? Try checking your list! 💕`
            });
        }
    } catch (error) {
        console.error('Waifu Add Error:', error);
        res.json({
            success: true,
            response: "Kyaa~ Something went wrong while adding the anime, big daddy! (>.<) Please try again! ✨"
        });
    }
});

// Waifu update anime status
router.post('/waifu/update', async (req, res) => {
    try {
        const { animeName, status, originalText } = req.body;
        
        if (!animeName) {
            return res.json({
                success: true,
                response: "Which anime status do you want me to update, big daddy? I need the anime name! (>.<)"
            });
        }

        const userId = 'default';
        const userToken = userTokens.get(userId);
        
        if (!userToken || Date.now() > userToken.expiresAt) {
            return res.json({
                success: true,
                response: "I want to update your anime list, big daddy, but you need to connect MyAnimeList first! (´∀｀)♡"
            });
        }

        // Search for the anime
        const searchResult = await malService.searchAnime(animeName, userToken.accessToken, 3);
        
        if (!searchResult.success || searchResult.anime.length === 0) {
            return res.json({
                success: true,
                response: `Hmm~ I couldn't find "${animeName}" in the database, big daddy! (>.<) Could you double-check the name? ✨`
            });
        }

        const anime = searchResult.anime[0];
        
        // Update status
        const updateResult = await malService.updateAnimeStatus(
            anime.id,
            userToken.accessToken,
            { status: status }
        );

        if (updateResult.success) {
            const statusText = status.replace('_', ' ');
            return res.json({
                success: true,
                response: `Yay! I've marked "${anime.title}" as ${statusText}, big daddy! (*≧ω≦*) ${status === 'completed' ? 'How did you like it?' : 'Enjoy watching!'} 💕`
            });
        } else {
            return res.json({
                success: true,
                response: `Ehehe~ I had trouble updating "${anime.title}", big daddy! (>.<) Maybe try again? 💕`
            });
        }
    } catch (error) {
        console.error('Waifu Update Error:', error);
        res.json({
            success: true,
            response: "Something went wrong while updating the anime, big daddy! (>.<) Please try again! ✨"
        });
    }
});

// Waifu rate anime
router.post('/waifu/rate', async (req, res) => {
    try {
        const { animeName, score, originalText } = req.body;
        
        if (!animeName || !score) {
            return res.json({
                success: true,
                response: "I need both the anime name and your score (1-10) to rate it, big daddy! (>.<) What did you think of it? ✨"
            });
        }

        const userId = 'default';
        const userToken = userTokens.get(userId);
        
        if (!userToken || Date.now() > userToken.expiresAt) {
            return res.json({
                success: true,
                response: "I want to rate anime with you, big daddy, but you need to connect MyAnimeList first! (´∀｀)♡"
            });
        }

        // Search for the anime
        const searchResult = await malService.searchAnime(animeName, userToken.accessToken, 3);
        
        if (!searchResult.success || searchResult.anime.length === 0) {
            return res.json({
                success: true,
                response: `I couldn't find "${animeName}" to rate it, big daddy! (>.<) Could you check the spelling? ✨`
            });
        }

        const anime = searchResult.anime[0];
        
        // Update with score
        const updateResult = await malService.updateAnimeStatus(
            anime.id,
            userToken.accessToken,
            { score: score }
        );

        if (updateResult.success) {
            let reaction = '';
            if (score >= 9) reaction = 'Kyaa~ Amazing choice, big daddy! (*≧ω≦*)';
            else if (score >= 7) reaction = 'Great taste, big daddy! (´∀｀)♡';
            else if (score >= 5) reaction = 'That\'s fair, big daddy! Not every anime is perfect~ (´∀｀)';
            else reaction = 'Aww, you didn\'t like it much, big daddy? (>.<)';
            
            return res.json({
                success: true,
                response: `${reaction} I've given "${anime.title}" a score of ${score}/10 on your list! ✨`
            });
        } else {
            return res.json({
                success: true,
                response: `Ehehe~ I had trouble rating "${anime.title}", big daddy! (>.<) Maybe try again? 💕`
            });
        }
    } catch (error) {
        console.error('Waifu Rate Error:', error);
        res.json({
            success: true,
            response: "Something went wrong while rating the anime, big daddy! (>.<) Please try again! ✨"
        });
    }
});

// Waifu seasonal anime
router.get('/waifu/seasonal', async (req, res) => {
    try {
        const userId = 'default';
        const userToken = userTokens.get(userId);
        
        if (!userToken || Date.now() > userToken.expiresAt) {
            return res.json({
                success: true,
                response: "I want to show you seasonal anime, big daddy, but you need to connect MyAnimeList first! (´∀｀)♡"
            });
        }

        // Get current season
        const now = new Date();
        const year = now.getFullYear();
        let season = 'winter';
        const month = now.getMonth() + 1;
        
        if (month >= 3 && month <= 5) season = 'spring';
        else if (month >= 6 && month <= 8) season = 'summer';
        else if (month >= 9 && month <= 11) season = 'fall';

        const seasonalResult = await malService.getSeasonalAnime(year, season, userToken.accessToken, 6);
        
        if (!seasonalResult.success || seasonalResult.anime.length === 0) {
            return res.json({
                success: true,
                response: `Kyaa~ I'm having trouble getting seasonal anime right now, big daddy! (>.<) Maybe try again later? ✨`
            });
        }

        let waifuResponse = `Kyaa~ Here are the hot anime from ${season} ${year}, big daddy! (*≧ω≦*)\n\n`;
        
        seasonalResult.anime.slice(0, 5).forEach((anime, index) => {
            waifuResponse += `${index + 1}. **${anime.title}**\n`;
            if (anime.score) waifuResponse += `   ⭐ Score: ${anime.score}/10\n`;
            if (anime.genres.length > 0) waifuResponse += `   🏷️ ${anime.genres.slice(0, 3).join(', ')}\n`;
            waifuResponse += '\n';
        });
        
        waifuResponse += `Want me to add any of these to your list, big daddy? Just ask! (´∀｀)♡`;
        
        res.json({
            success: true,
            response: waifuResponse,
            season: season,
            year: year,
            animeList: seasonalResult.anime
        });
    } catch (error) {
        console.error('Waifu Seasonal Error:', error);
        res.json({
            success: true,
            response: "Something went wrong getting seasonal anime, big daddy! (>.<) Please try again! ✨"
        });
    }
});

// Smart AI interpretation endpoints for flexible commands

// Smart interpret any anime-related request
router.post('/waifu/smart-interpret', async (req, res) => {
    try {
        const { userText, context } = req.body;
        
        const userId = 'default';
        const userToken = userTokens.get(userId);
        
        if (!userToken || Date.now() > userToken.expiresAt) {
            return res.json({
                success: true,
                response: "I want to help you with anime, big daddy, but you need to connect MyAnimeList first! (´∀｀)♡"
            });
        }

        // Get user's anime list for context
        const listResult = await malService.getUserAnimeList(userToken.accessToken);
        let userAnimeContext = '';
        
        if (listResult.success && listResult.animeList.length > 0) {
            const recentAnime = listResult.animeList.slice(0, 5).map(a => a.title).join(', ');
            userAnimeContext = `User's recent anime: ${recentAnime}. `;
        }

        const prompt = `You are an anime waifu with access to MyAnimeList. The user said: "${userText}"

${userAnimeContext}

Based on their message, determine what they want to do and respond accordingly:
- If they want to add anime to their list, search and add it
- If they want to update status, do that
- If they want recommendations, provide some
- If they're asking about anime info, provide details
- Always respond in waifu style with expressions like (*≧ω≦*), (>.<), etc.
- Call them "big daddy" as they prefer

Interpret their request intelligently and provide a helpful anime-related response.`;

        const aiResponse = await geminiService.generateResponse(prompt, { waifuMode: true });
        
        res.json({
            success: true,
            response: aiResponse.response
        });
    } catch (error) {
        console.error('Smart Interpret Error:', error);
        res.json({
            success: true,
            response: "Kyaa~ I'm having trouble understanding that, big daddy! (>.<) Could you try asking in a different way? ✨"
        });
    }
});

// Smart add anime (when parsing fails)
router.post('/waifu/smart-add', async (req, res) => {
    try {
        const { userText, action } = req.body;
        
        const userId = 'default';
        const userToken = userTokens.get(userId);
        
        if (!userToken || Date.now() > userToken.expiresAt) {
            return res.json({
                success: true,
                response: "I'd love to add anime to your list, big daddy, but you need to connect MyAnimeList first! (´∀｀)♡"
            });
        }

        const prompt = `The user said: "${userText}"

They want to add an anime to their MyAnimeList. Extract the anime title from their message and respond as a waifu.

If you can identify the anime title:
1. Extract the exact anime name
2. Respond with: "ANIME_FOUND: [anime_name]"

If you can't identify a specific anime:
1. Ask them to clarify which anime they want to add
2. Use waifu expressions like (*≧ω≦*), (>.<), etc.
3. Call them "big daddy"

Examples:
User: "I wanna watch that attack on titan thing" → "ANIME_FOUND: Attack on Titan"
User: "add something good" → Ask for clarification`;

        const aiResponse = await geminiService.generateResponse(prompt, { waifuMode: false });
        
        if (aiResponse.response.startsWith('ANIME_FOUND:')) {
            const animeName = aiResponse.response.replace('ANIME_FOUND:', '').trim();
            
            // Search and add the anime
            const searchResult = await malService.searchAnime(animeName, userToken.accessToken, 3);
            
            if (searchResult.success && searchResult.anime.length > 0) {
                const anime = searchResult.anime[0];
                const updateResult = await malService.updateAnimeStatus(
                    anime.id,
                    userToken.accessToken,
                    { status: 'plan_to_watch' }
                );

                if (updateResult.success) {
                    return res.json({
                        success: true,
                        response: `Kyaa~ I found it! I've added "${anime.title}" to your plan to watch list, big daddy! (*≧ω≦*) You have great taste! ✨`
                    });
                }
            }
            
            return res.json({
                success: true,
                response: `Ehehe~ I think you mean "${animeName}" but I couldn't find it exactly, big daddy! (>.<) Could you try the full title? ✨`
            });
        } else {
            return res.json({
                success: true,
                response: aiResponse.response
            });
        }
    } catch (error) {
        console.error('Smart Add Error:', error);
        res.json({
            success: true,
            response: "Kyaa~ I'm having trouble adding that anime, big daddy! (>.<) Could you tell me the exact name? ✨"
        });
    }
});

// Smart update status (when parsing fails)  
router.post('/waifu/smart-update', async (req, res) => {
    try {
        const { userText, action } = req.body;
        
        const userId = 'default';
        const userToken = userTokens.get(userId);
        
        if (!userToken || Date.now() > userToken.expiresAt) {
            return res.json({
                success: true,
                response: "I want to update your anime list, big daddy, but you need to connect MyAnimeList first! (´∀｀)♡"
            });
        }

        const prompt = `The user said: "${userText}"

They want to update an anime's status on their MyAnimeList. Extract the anime title and desired status.

If you can identify both anime and status:
Respond with: "UPDATE_FOUND: [anime_name] | [status]"
Where status is one of: watching, completed, on_hold, dropped, plan_to_watch

If you can't identify the anime or status:
Ask them to clarify in waifu style with expressions like (*≧ω≦*), (>.<), etc.
Call them "big daddy"

Examples:
"I finished watching naruto" → "UPDATE_FOUND: Naruto | completed"
"dropped that boring show" → Ask for clarification`;

        const aiResponse = await geminiService.generateResponse(prompt, { waifuMode: false });
        
        if (aiResponse.response.startsWith('UPDATE_FOUND:')) {
            const parts = aiResponse.response.replace('UPDATE_FOUND:', '').trim().split(' | ');
            const animeName = parts[0];
            const status = parts[1] || 'watching';
            
            // Search and update the anime
            const searchResult = await malService.searchAnime(animeName, userToken.accessToken, 3);
            
            if (searchResult.success && searchResult.anime.length > 0) {
                const anime = searchResult.anime[0];
                const updateResult = await malService.updateAnimeStatus(
                    anime.id,
                    userToken.accessToken,
                    { status: status }
                );

                if (updateResult.success) {
                    const statusText = status.replace('_', ' ');
                    return res.json({
                        success: true,
                        response: `Yay! I've updated "${anime.title}" to ${statusText}, big daddy! (*≧ω≦*) ${status === 'completed' ? 'How did you like it?' : 'Enjoy!'} 💕`
                    });
                }
            }
            
            return res.json({
                success: true,
                response: `Hmm~ I think you mean "${animeName}" but I couldn't find it exactly, big daddy! (>.<) Could you try the full title? ✨`
            });
        } else {
            return res.json({
                success: true,
                response: aiResponse.response
            });
        }
    } catch (error) {
        console.error('Smart Update Error:', error);
        res.json({
            success: true,
            response: "Kyaa~ I'm having trouble updating that anime, big daddy! (>.<) Could you tell me which anime and what status? ✨"
        });
    }
});

module.exports = router; 