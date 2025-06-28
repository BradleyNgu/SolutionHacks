const { ipcRenderer } = require('electron');

const speechBubble = document.getElementById('speech-bubble');
const maidImg = document.getElementById('maid');

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

  // Play the click line with TTS
  playTTS(randomClickLine, true);

  setTimeout(() => {
    // Revert image
    maidImg.src = 'icon.png';

    // Revert voice line
    speechBubble.textContent = currentIdleLine;
    isOverridden = false;
  }, 2000);
});

// 🎤 Start voice recording when triggered by main process
ipcRenderer.on('trigger-voice-recording', () => {
  recordAudio();
});

// ✅ Record audio and send to main process for transcription
async function recordAudio() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    let chunks = [];

    mediaRecorder.ondataavailable = (e) => {
      chunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunks, { type: 'audio/wav' });
      const arrayBuffer = await blob.arrayBuffer();

      // Send the raw buffer to the main process via base64
      const base64Audio = Buffer.from(arrayBuffer).toString('base64');
      showSpeechBubble("💭 Processing...");

      const result = await ipcRenderer.invoke('transcribe-buffer', base64Audio);
      sendToGemini(result);
    };

    showSpeechBubble("🎤 Recording...");
    mediaRecorder.start();

    setTimeout(() => {
      mediaRecorder.stop();
    }, 5000); // Record for 5 seconds

  } catch (err) {
    console.error("🎙️ Mic access error:", err);
    showSpeechBubble("❌ Mic permission denied.");
  }
}

function showSpeechBubble(text) {
  const bubble = document.getElementById('voice-bubble');
  bubble.textContent = text;
  bubble.style.display = 'block';
}

function hideSpeechBubble() {
  const bubble = document.getElementById('voice-bubble');
  bubble.style.display = 'none';
}

// Updated to use backend API instead of direct Gemini API call
async function sendToGemini(promptText) {
  showSpeechBubble("💭 Thinking...");

  try {
    // Use backend API through preload script
    const response = await window.api.backend.waifuChat(promptText);
    
    if (response.success && response.data && response.data.response) {
      const reply = response.data.response;
      showSpeechBubble(reply);
      
      // Play the response with waifu TTS
      playTTS(reply, false);
    } else {
      const errorMessage = response.error || "Sorry, I didn't understand that~";
      showSpeechBubble(errorMessage);
      console.error("Gemini API Error:", response);
    }
  } catch (err) {
    console.error("Backend communication error:", err);
    showSpeechBubble("❌ Failed to talk to backend.");
  }
}

// New TTS function using backend
async function playTTS(text, isClickLine = false) {
  try {
    // Use different TTS settings for click lines vs responses
    const options = {
      disableWaifu: false
    };

    const response = await window.api.backend.waifuSpeak(text, 'web', options);
    
    if (response.success && response.data) {
      if (response.data.audioUrl) {
        // If backend returns an audio URL, play it
        playAudioFromUrl(response.data.audioUrl);
      } else if (response.data.instructions === 'use_browser_tts') {
        // If backend instructs to use browser TTS, use Web Speech API
        useBrowserTTS(text, isClickLine);
      }
    } else {
      console.warn("TTS failed, falling back to browser TTS:", response.error);
      useBrowserTTS(text, isClickLine);
    }
  } catch (error) {
    console.error("TTS Error:", error);
    // Fallback to browser TTS
    useBrowserTTS(text, isClickLine);
  }
}

// Fallback browser TTS function
function useBrowserTTS(text, isClickLine = false) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Get available voices
    const voices = speechSynthesis.getVoices();
    
    // Try to find a female voice
    const femaleVoice = voices.find(voice => 
      voice.name.toLowerCase().includes('female') || 
      voice.name.toLowerCase().includes('woman') ||
      voice.name.toLowerCase().includes('zira') ||
      voice.name.toLowerCase().includes('hazel')
    ) || voices[0];
    
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }
    
    // Waifu voice settings
    utterance.pitch = isClickLine ? 1.2 : 1.8; // Slightly lower pitch for annoyed lines
    utterance.rate = 1.1;
    utterance.volume = 0.8;
    
    speechSynthesis.speak(utterance);
  }
}

// Play audio from URL (for when backend provides audio file)
function playAudioFromUrl(audioUrl) {
  const audio = new Audio(audioUrl);
  audio.volume = 0.8;
  audio.play().catch(error => {
    console.error("Audio playback error:", error);
  });
}

// Initialize voices when page loads
window.addEventListener('load', () => {
  // Initialize speech synthesis voices
  if ('speechSynthesis' in window) {
    speechSynthesis.getVoices();
    speechSynthesis.onvoiceschanged = () => {
      console.log("Available voices:", speechSynthesis.getVoices().length);
    };
  }
  
  // Test backend connection
  testBackendConnection();
});

// Test backend connection on startup
async function testBackendConnection() {
  try {
    const response = await window.api.backend.healthCheck();
    if (response.success) {
      console.log("✅ Backend connection successful");
    } else {
      console.warn("⚠️ Backend health check failed:", response);
    }
  } catch (error) {
    console.error("❌ Backend connection failed:", error);
  }
}