const speechBubble = document.getElementById('speech-bubble');
const maidImg = document.getElementById('maid');

// TTS settings
let ttsEnabled = localStorage.getItem('ttsEnabled') !== 'false'; // Enable TTS by default (saved preference)
let currentTTSUtterance = null; // Track current speech

console.log('🚀 Renderer script loaded');
console.log('📝 Speech bubble element:', speechBubble);
console.log('🖼️ Maid image element:', maidImg);

// Initialize voice bubble with a default message
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM loaded, initializing voice bubble...');
  const voiceBubble = document.getElementById('voice-bubble');
  console.log('💬 Voice bubble element:', voiceBubble);
  
  if (voiceBubble) {
    showSpeechBubble("👋 Click 'Talk to Maid' to chat! Press 'V' to toggle voice 🔊");
    
    // Test TTS configuration on startup
    setTimeout(async () => {
      try {
        const response = await fetch('http://localhost:3001/api/tts/status');
        if (response.ok) {
          const data = await response.json();
          console.log('🔊 TTS Status:', data);
          if (data.providers && data.providers.google && data.providers.google.available) {
            console.log('✅ Google Cloud TTS (ja-JP-Standard-A) is available!');
          } else {
            console.log('⚠️ Google Cloud TTS not available, will use browser TTS fallback');
          }
        }
      } catch (error) {
        console.log('⚠️ Could not check TTS status:', error);
      }
    }, 2000);
  } else {
    console.error('❌ Voice bubble element not found!');
  }
  
});

// ⏱️ Random speech bubble quotes every 5 seconds
const idleLines = [
  "Don't forget to drink water~!",
  "You should watch some anime!",
  "Time for a break, Master?",
  "You've been working hard~"
];
const clickLines = [
  "Unhand me, swine!",
  "Hands off, trash!",
  "Do I look like a toy to you?",
  "I didn't give you permission to touch me!",
  "You absolute degenerate.",
  "Touch me again and I vanish.",
  "Hmph. You wish you could afford me.",
  "Do that again and suffer the consequences."
];

let currentIdleLine = idleLines[0]; // default
let isOverridden = false;

// idle line updater every 5 seconds
setInterval(() => {
  if (isOverridden) return; // Don't override if a click line is active

  currentIdleLine = idleLines[Math.floor(Math.random() * idleLines.length)];
  speechBubble.textContent = currentIdleLine;
}, 5000);

// click handler
document.addEventListener('click', () => {
  // Move window via Electron IPC
  window.api.triggerMove();

  // Image swap
  const originalSrc = maidImg.src;
  maidImg.src = 'madicon.png';

  // Voice line swap
  const randomClickLine = clickLines[Math.floor(Math.random() * clickLines.length)];
  const originalText = speechBubble.textContent;

  speechBubble.textContent = randomClickLine;
  isOverridden = true;

  // 🔊 Play TTS for click response
  playTTSVoice(randomClickLine);

  setTimeout(() => {
    // Revert image
    maidImg.src = 'icon.png';

    // Revert voice line
    speechBubble.textContent = currentIdleLine;
    isOverridden = false;
  }, 2000);
});

// 💬 Start text input when triggered by main process
// Use contextBridge API instead of direct ipcRenderer
if (window.api && window.api.onVoiceRecordingTriggered) {
  window.api.onVoiceRecordingTriggered(() => {
    console.log('💬 Text input triggered via IPC');
    showSpeechBubble("💬 Opening text input...");
    setTimeout(() => openTextInput(), 500);
  });
} else {
  console.log('⚠️ IPC bridge not available - voice input requires main process');
}

// Add error handler for messages from main process
if (window.api && window.api.onShowError) {
  window.api.onShowError((errorMessage) => {
    console.log('❌ Error from main process:', errorMessage);
    showSpeechBubble(`❌ ${errorMessage}`);
    setTimeout(() => hideSpeechBubble(), 8000);
  });
}

// Add keyboard controls for TTS
document.addEventListener('keydown', (e) => {
  // Toggle TTS with V key
  if (e.key.toLowerCase() === 'v' && !e.ctrlKey && !e.altKey) {
    ttsEnabled = !ttsEnabled;
    const status = ttsEnabled ? 'ON' : 'OFF';
    
    // Save preference to localStorage
    localStorage.setItem('ttsEnabled', ttsEnabled.toString());
    
    console.log(`🔊 TTS ${status}`);
    showSpeechBubble(`🔊 Voice ${status}`);
    
    // Stop current speech if disabling
    if (!ttsEnabled) {
      stopCurrentTTS();
    }
    
    // Auto-hide status message
    setTimeout(() => hideSpeechBubble(), 2000);
    
    // Prevent default if we're not in an input field
    if (!e.target.matches('input, textarea')) {
      e.preventDefault();
    }
  }
  
  // Stop current TTS with Escape key
  if (e.key === 'Escape') {
    stopCurrentTTS();
  }
});

// Global variables to store event handlers and prevent duplicates
let modalEventHandlers = null;
let isModalOpen = false;
let isProcessingRequest = false;

// Add text input function
function openTextInput() {
  // Prevent opening multiple modals
  window.api?.setTextModalOpen?.(true);
  if (isModalOpen) {
    console.log('⚠️ Modal already open, ignoring duplicate call');
    return;
  }

  hideSpeechBubble();
  
  // Show the modal
  const modal = document.getElementById('text-input-modal');
  const textField = document.getElementById('text-input-field');
  const sendBtn = document.getElementById('send-text-btn');
  const cancelBtn = document.getElementById('cancel-text-btn');
  
  if (!modal || !textField || !sendBtn || !cancelBtn) {
    console.error('❌ Modal elements not found!');
    showSpeechBubble("❌ Text input not available");
    setTimeout(() => hideSpeechBubble(), 3000);
    return;
  }

  // Set modal as open
  isModalOpen = true;
  
  // Clear previous text and show modal
  textField.value = '';
  modal.style.display = 'flex';
  
  // Focus on the text field
  setTimeout(() => {
    textField.focus();
  }, 100);

  // Clean up any existing event handlers
  if (modalEventHandlers) {
    sendBtn.removeEventListener('click', modalEventHandlers.sendHandler);
    cancelBtn.removeEventListener('click', modalEventHandlers.cancelHandler);
    textField.removeEventListener('keydown', modalEventHandlers.keyHandler);
    modal.removeEventListener('click', modalEventHandlers.modalHandler);
  }
  
  // Handle send button
  const handleSend = () => {
    // Prevent duplicate submissions
    if (isProcessingRequest) {
      console.log('⚠️ Request already processing, ignoring duplicate submission');
      return;
    }

    const inputText = textField.value.trim();
    
    if (inputText) {
      console.log('📝 Text input received:', inputText);
      isProcessingRequest = true;
      closeModal();
      showSpeechBubble("💭 Processing: " + inputText);
      
      // Call sendToGemini and reset flag when done
      sendToGemini(inputText).finally(() => {
        isProcessingRequest = false;
      });
    } else {
      // Flash the text field to indicate empty input
      textField.style.borderColor = '#ff4444';
      setTimeout(() => {
        textField.style.borderColor = '';
      }, 1000);
      textField.focus();
    }
  };
  
  // Handle cancel button
  const handleCancel = () => {
    closeModal();
    showSpeechBubble("🤐 Input cancelled");
    setTimeout(() => hideSpeechBubble(), 2000);
  };
  
  // Handle Enter key in textarea
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  // Handle modal outside click
  const handleModalClick = (e) => {
    if (e.target === modal) {
      handleCancel();
    }
  };

  // Store handlers for cleanup
  modalEventHandlers = {
    sendHandler: handleSend,
    cancelHandler: handleCancel,
    keyHandler: handleKeyPress,
    modalHandler: handleModalClick
  };
  
  // Add event listeners
  sendBtn.addEventListener('click', handleSend);
  cancelBtn.addEventListener('click', handleCancel);
  textField.addEventListener('keydown', handleKeyPress);
  modal.addEventListener('click', handleModalClick);
}

// Helper function to close modal and clean up
function closeModal() {
  isModalOpen = false;
  window.api?.setTextModalOpen?.(false);
  const modal = document.getElementById('text-input-modal');
  const textField = document.getElementById('text-input-field');
  const sendBtn = document.getElementById('send-text-btn');
  const cancelBtn = document.getElementById('cancel-text-btn');

  if (modal) {
    modal.style.display = 'none';
  }

  // Clean up event listeners
  if (modalEventHandlers) {
    if (sendBtn) sendBtn.removeEventListener('click', modalEventHandlers.sendHandler);
    if (cancelBtn) cancelBtn.removeEventListener('click', modalEventHandlers.cancelHandler);
    if (textField) textField.removeEventListener('keydown', modalEventHandlers.keyHandler);
    if (modal) modal.removeEventListener('click', modalEventHandlers.modalHandler);
    modalEventHandlers = null;
  }

  // Mark modal as closed
  isModalOpen = false;
}

function showSpeechBubble(text) {
  console.log('💬 showSpeechBubble called with:', text);
  const bubble = document.getElementById('voice-bubble');
  console.log('💬 Voice bubble element found:', bubble);
  
  if (!bubble) {
    console.error('❌ Voice bubble element not found in showSpeechBubble!');
    return;
  }
  
  bubble.textContent = text;
  bubble.style.display = 'block';
  bubble.style.backgroundColor = '#ffffcc';
  bubble.style.color = '#333';
  
  console.log('✅ Speech bubble updated:', {
    text: text,
    display: bubble.style.display,
    backgroundColor: bubble.style.backgroundColor,
    color: bubble.style.color
  });
}

function hideSpeechBubble() {
  const bubble = document.getElementById('voice-bubble');
  if (bubble) {
  bubble.style.display = 'none';
  }
}

async function checkMALStatus() {
  try {
    const response = await fetch('http://localhost:3001/api/mal/status');
    if (response.ok) {
      const data = await response.json();
      return data.authenticated || false;
    }
    return false;
  } catch (error) {
    console.log('⚠️ MAL status check failed:', error);
    return false;
  }
}

// 🔊 Play TTS voice for anime maid responses
async function playTTSVoice(text, force = false) {
  try {
    // Check if TTS is enabled (unless forced)
    if (!ttsEnabled && !force) {
      console.log('🔇 TTS disabled, skipping playback');
    return;
  }

    // Stop any current speech
    stopCurrentTTS();

    console.log('🔊 Requesting TTS for:', text);
    
    // Call backend TTS API with waifu voice - prefer Google Cloud TTS
    const response = await fetch('http://localhost:3001/api/tts/waifu-speak', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        provider: 'google', // Prefer Google Cloud TTS for ja-JP-Standard-A
        options: {
          language: 'ja-JP',
          voiceName: 'ja-JP-Standard-A',
          rate: 1.2,
          pitch: 4.0,
          volume: 1.0
        }
      })
    });

    if (!response.ok) {
      console.log('⚠️ Google TTS request failed, trying Web Speech API fallback...');
      // Fallback to Web Speech API if Google Cloud TTS fails
      await playWebSpeechTTS(text, {
        rate: 1.1,
        pitch: 1.8,
        volume: 1.0,
        lang: 'en-US'
      });
      return;
    }

    const ttsData = await response.json();
    
    if (!ttsData.success) {
      console.log('⚠️ TTS service error, trying Web Speech API fallback:', ttsData.error);
      // Fallback to Web Speech API
      await playWebSpeechTTS(text, {
        rate: 1.1,
        pitch: 1.8,
        volume: 1.0,
        lang: 'en-US'
      });
      return;
    }

    console.log('🔊 TTS data received:', ttsData.type);

    // Handle different TTS response types
    if (ttsData.type === 'webspeech') {
      // Use Web Speech API for browser-based TTS
      await playWebSpeechTTS(text, ttsData.config);
    } else if (ttsData.type === 'google') {
      // Play Google Cloud TTS audio
      await playGoogleTTSAudio(ttsData.base64, ttsData.mimeType);
    } else if (ttsData.type === 'browser') {
      // Use browser TTS with voice settings
      await playWebSpeechTTS(text, ttsData.voice);
    }

  } catch (error) {
    console.log('⚠️ TTS playback error, trying Web Speech API fallback:', error);
    // Fallback to Web Speech API on any error
    try {
      await playWebSpeechTTS(text, {
        rate: 1.1,
        pitch: 1.8,
        volume: 1.0,
        lang: 'en-US'
      });
    } catch (fallbackError) {
      console.log('⚠️ Web Speech API fallback also failed:', fallbackError);
      // Now truly fail silently
    }
  }
}

// Stop current TTS playback
function stopCurrentTTS() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  if (currentTTSUtterance) {
    currentTTSUtterance = null;
  }
}

// Play TTS using Web Speech API with waifu voice settings
async function playWebSpeechTTS(text, voiceConfig) {
  try {
    if (!window.speechSynthesis) {
      console.log('⚠️ Web Speech API not supported');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Apply waifu voice settings
    utterance.rate = voiceConfig.rate || 1.1;
    utterance.pitch = voiceConfig.pitch || 1.8;
    utterance.volume = voiceConfig.volume || 1.0;
    utterance.lang = voiceConfig.lang || 'en-US';

    // Ensure voices are loaded before trying to select one
    const getVoices = () => {
      return new Promise((resolve) => {
        let voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          resolve(voices);
        } else {
          // Wait for voices to load
          window.speechSynthesis.addEventListener('voiceschanged', () => {
            voices = window.speechSynthesis.getVoices();
            resolve(voices);
          }, { once: true });
        }
      });
    };

    const voices = await getVoices();
    console.log('🎤 Available voices:', voices.map(v => `${v.name} (${v.lang})`));
    let selectedVoice = null;

    // Preferred female voices for waifu (high-pitched English voices work best)
    const waifuVoiceNames = [
      'Microsoft Zira',
      'Microsoft Hazel', 
      'Google US English Female',
      'Samantha',
      'Karen',
      'female'
    ];

    // Find the best waifu voice
    for (const voiceName of waifuVoiceNames) {
      selectedVoice = voices.find(voice => 
        voice.name.toLowerCase().includes(voiceName.toLowerCase()) ||
        (voice.name.toLowerCase().includes('zira') && voice.lang.startsWith('en')) ||
        (voice.name.toLowerCase().includes('hazel') && voice.lang.startsWith('en'))
      );
      if (selectedVoice) break;
    }

    // Fallback to any English female voice
    if (!selectedVoice) {
      selectedVoice = voices.find(voice => 
        voice.lang.startsWith('en') && (
          voice.name.toLowerCase().includes('female') ||
          voice.name.toLowerCase().includes('woman') ||
          voice.name.toLowerCase().includes('zira') ||
          voice.name.toLowerCase().includes('hazel') ||
          voice.name.toLowerCase().includes('samantha')
        )
      );
    }

    // Final fallback to any female-sounding voice
    if (!selectedVoice) {
      selectedVoice = voices.find(voice => 
        voice.name.toLowerCase().includes('female') ||
        voice.name.toLowerCase().includes('woman')
      );
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      console.log('🎤 Using voice:', selectedVoice.name, selectedVoice.lang);
    } else {
      console.log('🎤 Using default system voice');
    }

    // Add event listeners
    utterance.onstart = () => {
      console.log('🔊 TTS started playing');
    };

    utterance.onend = () => {
      console.log('🔊 TTS finished playing');
    };

    utterance.onerror = (error) => {
      console.log('🔊 TTS error:', error);
    };

    // Track current utterance
    currentTTSUtterance = utterance;
    
    // Play the speech
    window.speechSynthesis.speak(utterance);

  } catch (error) {
    console.log('⚠️ Web Speech TTS error:', error);
  }
}

// Play Google Cloud TTS audio from base64 data
async function playGoogleTTSAudio(base64Audio, mimeType) {
  try {
    // Convert base64 to blob
    const audioData = atob(base64Audio);
    const arrayBuffer = new ArrayBuffer(audioData.length);
    const uint8Array = new Uint8Array(arrayBuffer);
    
    for (let i = 0; i < audioData.length; i++) {
      uint8Array[i] = audioData.charCodeAt(i);
    }

    const audioBlob = new Blob([arrayBuffer], { type: mimeType });
    const audioUrl = URL.createObjectURL(audioBlob);

    // Create and play audio element
    const audio = new Audio(audioUrl);
    
    audio.oncanplay = () => {
      console.log('🔊 Google TTS audio ready to play');
      audio.play().catch(error => {
        console.log('⚠️ Audio play error:', error);
      });
    };

    audio.onended = () => {
      console.log('🔊 Google TTS audio finished');
      URL.revokeObjectURL(audioUrl);
    };

    audio.onerror = (error) => {
      console.log('🔊 Google TTS audio error:', error);
      URL.revokeObjectURL(audioUrl);
    };

  } catch (error) {
    console.log('⚠️ Google TTS audio processing error:', error);
  }
}

async function sendToGemini(promptText) {
  const maxRetries = 3;
  let retryCount = 0;
  
  console.log('🤖 Sending to Gemini:', promptText);
  
  // Check MAL status for personalized responses
  const isMALConnected = await checkMALStatus();
  console.log('📺 MAL connected:', isMALConnected);

  const makeRequest = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout

      const response = await fetch('http://localhost:3001/api/gemini/waifu', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: promptText,
          options: {
            disableWaifu: false
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        if (errorText) {
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || errorMessage;
          } catch {
            errorMessage = errorText.length > 100 ? errorText.substring(0, 100) + '...' : errorText;
          }
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('📦 Response data:', data);

      if (!data.success) {
        throw new Error(data.error || 'Gemini request failed');
      }

      if (!data.response) {
        throw new Error('No response from Gemini');
      }

      console.log('✅ Gemini response:', data.response);
      showSpeechBubble(data.response);
      
      // 🔊 Play TTS voice for the response
      await playTTSVoice(data.response);
      
      // Auto-hide after 15 seconds
    setTimeout(() => {
      hideSpeechBubble();
      }, 15000);

    } catch (error) {
      console.error(`❌ Gemini request attempt ${retryCount + 1} failed:`, error);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timed out - please try again with a shorter message');
      } else if (error.message.includes('localhost:3001')) {
        throw new Error('Backend server not running - please start the backend server');
      } else if (error.message.includes('fetch')) {
        throw new Error('Network connection failed - check your internet connection');
      }
      
      throw error;
    }
  };

  // Retry logic
  while (retryCount < maxRetries) {
    try {
      await makeRequest();
      return; // Success
    } catch (error) {
      retryCount++;
      
      if (retryCount >= maxRetries) {
        console.error("❌ All Gemini attempts failed:", error);
        
        let userMessage = "❌ AI request failed";
        
        if (error.message.includes('Backend server not running')) {
          userMessage = "❌ Backend server not running. Please start the server.";
        } else if (error.message.includes('Network connection failed')) {
          userMessage = "❌ Network connection failed. Check your internet.";
        } else if (error.message.includes('timed out')) {
          userMessage = "❌ Request timed out. Try a shorter message.";
        } else if (error.message.includes('API key')) {
          userMessage = "❌ API key issue. Check your Gemini API configuration.";
        } else {
          userMessage = `❌ AI error: ${error.message}`;
        }
        
        showSpeechBubble(userMessage);
        setTimeout(() => hideSpeechBubble(), 8000);
        return;
      }
      
      showSpeechBubble(`🔄 Retrying AI request... (${retryCount}/${maxRetries})`);
      
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Fallback function (simplified since we removed speech)
async function sendToGeminiFallback(promptText) {
  showSpeechBubble("🔄 Using fallback method...");
  await sendToGemini(promptText);
}