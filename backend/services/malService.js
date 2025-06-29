const config = require('../config/config');
const crypto = require('crypto');

class MALService {
    constructor() {
        this.baseURL = 'https://api.myanimelist.net/v2';
        this.authURL = 'https://myanimelist.net/v1/oauth2/authorize';
        this.tokenURL = 'https://myanimelist.net/v1/oauth2/token';
        this.clientId = process.env.MAL_CLIENT_ID;
        this.clientSecret = process.env.MAL_CLIENT_SECRET;
        this.redirectUri = process.env.MAL_REDIRECT_URI || 'http://localhost:3001/api/mal/callback';
        this.codeVerifier = null; // Store for PKCE
    }

    // Generate code verifier for PKCE (must be 43-128 characters, base64url)
    generateCodeVerifier() {
        // Generate 32 random bytes and convert to base64url (results in 43 chars)
        const buffer = crypto.randomBytes(32);
        const base64 = buffer.toString('base64');
        const base64url = base64
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
        
        // Ensure we have exactly 43 characters for PKCE compliance
        return base64url;
    }

    // Generate code challenge for PKCE (MyAnimeList only supports 'plain' method)
    generateCodeChallenge(codeVerifier) {
        // For MyAnimeList, code_challenge = code_verifier (plain method)
        // No SHA256 hashing needed - they must be identical
        return codeVerifier;
    }

    // Generate OAuth authorization URL with PKCE
    getAuthorizationURL() {
        const state = this.generateRandomState();
        const codeVerifier = this.generateCodeVerifier();
        const codeChallenge = this.generateCodeChallenge(codeVerifier);
        
        // Store code verifier for later use (in production, use proper session storage)
        this.codeVerifier = codeVerifier;
        
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            scope: 'write:users',
            state: state,
            code_challenge: codeChallenge,
            code_challenge_method: 'S256'
        });
        
        return `${this.authURL}?${params.toString()}`;
    }

    // Exchange authorization code for access token with PKCE
    async getAccessToken(authorizationCode) {
        try {
            const requestBody = {
                grant_type: 'authorization_code',
                code: authorizationCode,
                redirect_uri: this.redirectUri,
                client_id: this.clientId,
                code_verifier: this.codeVerifier // PKCE parameter
            };

            // Only include client_secret if available (some PKCE flows don't need it)
            if (this.clientSecret) {
                requestBody.client_secret = this.clientSecret;
            }

            const response = await fetch(this.tokenURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams(requestBody)
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(`Token exchange failed: ${data.error} - ${data.error_description || data.message}`);
            }

            return {
                success: true,
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                expiresIn: data.expires_in
            };
        } catch (error) {
            console.error('MAL Token Exchange Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Search for anime
    async searchAnime(query, accessToken, limit = 10) {
        try {
            const url = `${this.baseURL}/anime?q=${encodeURIComponent(query)}&limit=${limit}&fields=id,title,main_picture,synopsis,mean,rank,popularity,num_episodes,start_season,genres,media_type,status`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(`Search failed: ${data.message}`);
            }

            return {
                success: true,
                anime: data.data.map(item => ({
                    id: item.node.id,
                    title: item.node.title,
                    image: item.node.main_picture?.large || item.node.main_picture?.medium,
                    synopsis: item.node.synopsis,
                    score: item.node.mean,
                    rank: item.node.rank,
                    popularity: item.node.popularity,
                    episodes: item.node.num_episodes,
                    season: item.node.start_season,
                    genres: item.node.genres?.map(g => g.name) || [],
                    type: item.node.media_type,
                    status: item.node.status
                }))
            };
        } catch (error) {
            console.error('MAL Search Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get user's anime list
    async getUserAnimeList(accessToken, status = null, limit = 100) {
        try {
            let url = `${this.baseURL}/users/@me/animelist?fields=list_status,node(id,title,main_picture,synopsis,mean,num_episodes,genres,media_type,status)&limit=${limit}`;
            
            if (status) {
                url += `&status=${status}`;
            }

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(`Failed to get anime list: ${data.message}`);
            }

            return {
                success: true,
                animeList: data.data.map(item => ({
                    id: item.node.id,
                    title: item.node.title,
                    image: item.node.main_picture?.large || item.node.main_picture?.medium,
                    synopsis: item.node.synopsis,
                    score: item.node.mean,
                    episodes: item.node.num_episodes,
                    genres: item.node.genres?.map(g => g.name) || [],
                    type: item.node.media_type,
                    animeStatus: item.node.status,
                    myStatus: item.list_status.status,
                    myScore: item.list_status.score,
                    watchedEpisodes: item.list_status.num_episodes_watched,
                    isRewatching: item.list_status.is_rewatching,
                    updatedAt: item.list_status.updated_at
                }))
            };
        } catch (error) {
            console.error('MAL Get List Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Update anime in user's list
    async updateAnimeStatus(animeId, accessToken, updateData) {
        try {
            const formData = new URLSearchParams();
            
            // Add only provided fields
            if (updateData.status) formData.append('status', updateData.status);
            if (updateData.score !== undefined) formData.append('score', updateData.score);
            if (updateData.num_watched_episodes !== undefined) formData.append('num_watched_episodes', updateData.num_watched_episodes);
            if (updateData.is_rewatching !== undefined) formData.append('is_rewatching', updateData.is_rewatching);
            if (updateData.priority !== undefined) formData.append('priority', updateData.priority);
            if (updateData.comments) formData.append('comments', updateData.comments);
            if (updateData.tags) formData.append('tags', updateData.tags);

            const response = await fetch(`${this.baseURL}/anime/${animeId}/my_list_status`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(`Update failed: ${data.message}`);
            }

            return {
                success: true,
                updatedStatus: data
            };
        } catch (error) {
            console.error('MAL Update Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Delete anime from user's list
    async deleteAnimeFromList(animeId, accessToken) {
        try {
            const response = await fetch(`${this.baseURL}/anime/${animeId}/my_list_status`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (!response.ok && response.status !== 404) {
                const data = await response.json();
                throw new Error(`Delete failed: ${data.message}`);
            }

            return {
                success: true,
                message: 'Anime removed from list'
            };
        } catch (error) {
            console.error('MAL Delete Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get anime details
    async getAnimeDetails(animeId, accessToken) {
        try {
            const url = `${this.baseURL}/anime/${animeId}?fields=id,title,main_picture,alternative_titles,start_date,end_date,synopsis,mean,rank,popularity,num_list_users,num_scoring_users,media_type,status,genres,my_list_status,num_episodes,start_season,broadcast,source,rating,pictures,background,related_anime,recommendations,studios,statistics`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(`Failed to get anime details: ${data.message}`);
            }

            return {
                success: true,
                anime: {
                    id: data.id,
                    title: data.title,
                    alternativeTitles: data.alternative_titles,
                    image: data.main_picture?.large || data.main_picture?.medium,
                    synopsis: data.synopsis,
                    score: data.mean,
                    rank: data.rank,
                    popularity: data.popularity,
                    episodes: data.num_episodes,
                    startDate: data.start_date,
                    endDate: data.end_date,
                    season: data.start_season,
                    genres: data.genres?.map(g => g.name) || [],
                    type: data.media_type,
                    status: data.status,
                    rating: data.rating,
                    studios: data.studios?.map(s => s.name) || [],
                    myListStatus: data.my_list_status,
                    related: data.related_anime,
                    recommendations: data.recommendations
                }
            };
        } catch (error) {
            console.error('MAL Get Details Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get seasonal anime
    async getSeasonalAnime(year, season, accessToken, limit = 20) {
        try {
            const url = `${this.baseURL}/anime/season/${year}/${season}?limit=${limit}&fields=id,title,main_picture,synopsis,mean,rank,popularity,num_episodes,genres,media_type,status,start_season`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(`Failed to get seasonal anime: ${data.message}`);
            }

            return {
                success: true,
                anime: data.data.map(item => ({
                    id: item.node.id,
                    title: item.node.title,
                    image: item.node.main_picture?.large || item.node.main_picture?.medium,
                    synopsis: item.node.synopsis,
                    score: item.node.mean,
                    rank: item.node.rank,
                    popularity: item.node.popularity,
                    episodes: item.node.num_episodes,
                    genres: item.node.genres?.map(g => g.name) || [],
                    type: item.node.media_type,
                    status: item.node.status
                }))
            };
        } catch (error) {
            console.error('MAL Seasonal Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Generate random state for OAuth
    generateRandomState(length = 32) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // Helper method to format anime list for waifu responses
    formatAnimeListForWaifu(animeList) {
        if (!animeList || animeList.length === 0) {
            return "It looks like your anime list is empty, big daddy! (>.<) Let me help you find some amazing anime to watch! ✨";
        }

        const watching = animeList.filter(a => a.myStatus === 'watching');
        const completed = animeList.filter(a => a.myStatus === 'completed');
        const planToWatch = animeList.filter(a => a.myStatus === 'plan_to_watch');

        let response = `Kyaa~ Here's your anime list summary, big daddy! (*≧ω≦*)\n\n`;
        
        if (watching.length > 0) {
            response += `📺 Currently Watching (${watching.length}):\n`;
            watching.slice(0, 5).forEach(anime => {
                response += `• ${anime.title} (${anime.watchedEpisodes}/${anime.episodes || '?'} episodes)\n`;
            });
            if (watching.length > 5) response += `... and ${watching.length - 5} more!\n`;
            response += '\n';
        }

        if (completed.length > 0) {
            response += `✅ Completed (${completed.length}):\n`;
            completed.slice(0, 3).forEach(anime => {
                response += `• ${anime.title}${anime.myScore ? ` (${anime.myScore}/10)` : ''}\n`;
            });
            if (completed.length > 3) response += `... and ${completed.length - 3} more!\n`;
            response += '\n';
        }

        if (planToWatch.length > 0) {
            response += `📋 Plan to Watch (${planToWatch.length}):\n`;
            planToWatch.slice(0, 3).forEach(anime => {
                response += `• ${anime.title}\n`;
            });
            if (planToWatch.length > 3) response += `... and ${planToWatch.length - 3} more!\n`;
        }

        response += `\nWant me to recommend something new or update your list? Just ask! (´∀｀)♡`;
        
        return response;
    }
}

module.exports = new MALService(); 