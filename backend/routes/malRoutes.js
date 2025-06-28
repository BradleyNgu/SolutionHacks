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
        
        console.log('Generated PKCE parameters:', {
            state,
            codeVerifier_length: codeVerifier.length,
            codeChallenge_length: codeChallenge.length,
            codeVerifier_sample: codeVerifier.substring(0, 10) + '...',
            codeChallenge_sample: codeChallenge.substring(0, 10) + '...',
            codeVerifier_full: codeVerifier, // Full verifier for debugging
            codeChallenge_full: codeChallenge // Full challenge for debugging
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
            code_challenge_method: 'S256'
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

        // Include client_secret if available
        if (process.env.MAL_CLIENT_SECRET) {
            requestBody.client_secret = process.env.MAL_CLIENT_SECRET;
        }

        console.log('Token exchange request:', {
            grant_type: requestBody.grant_type,
            redirect_uri: requestBody.redirect_uri,
            client_id: requestBody.client_id,
            code_verifier_length: codeVerifier.length,
            code_verifier_full: codeVerifier, // Full verifier for debugging
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

module.exports = router; 