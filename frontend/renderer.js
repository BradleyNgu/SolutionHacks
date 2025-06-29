const speechBubble = document.getElementById('speech-bubble');
const maidImg = document.getElementById('maid');

console.log('🚀 Renderer script loaded');
console.log('📝 Speech bubble element:', speechBubble);
console.log('🖼️ Maid image element:', maidImg);

// Initialize voice bubble with a default message
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM loaded, initializing voice bubble...');
  const voiceBubble = document.getElementById('voice-bubble');
  console.log('🎤 Voice bubble element:', voiceBubble);
  
  if (voiceBubble) {
    showSpeechBubble("👋 Click 'Talk to Maid' in the tray menu to start!");
  } else {
    console.error('❌ Voice bubble element not found!');
  }
  
  // Add test button listener
  const testButton = document.getElementById('test-speech');
  if (testButton) {
    testButton.addEventListener('click', () => {
      console.log('🧪 Test button clicked');
      showSpeechBubble("🧪 Test button clicked - starting speech recognition...");
      
      // Simple test without speech recognition
      setTimeout(() => {
        showSpeechBubble("🎯 This is a test message! Speech bubble is working!");
        setTimeout(() => {
          showSpeechBubble("🎤 Now trying speech recognition...");
          startSpeechRecognition();
        }, 2000);
      }, 1000);
    });
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

  setTimeout(() => {
    // Revert image
    maidImg.src = 'icon.png';

    // Revert voice line
    speechBubble.textContent = currentIdleLine;
    isOverridden = false;
  }, 2000);
});

// 🎤 Start voice recording when triggered by main process
// Use contextBridge API instead of direct ipcRenderer
if (window.api && window.api.onVoiceRecordingTriggered) {
  window.api.onVoiceRecordingTriggered(() => {
    console.log('🎤 Voice recording triggered via IPC');
    showSpeechBubble("🎤 Starting voice recognition...");
    startSpeechRecognition();
  });
} else {
  console.log('⚠️ IPC bridge not available, using test button only');
}

// ✅ Use Web Speech API for speech recognition
function startSpeechRecognition() {
  // Check if Web Speech API is supported
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    showSpeechBubble("❌ Speech recognition not supported in this browser. Try using Chrome or Edge.");
    setTimeout(() => hideSpeechBubble(), 5000);
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  // Configure recognition
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
  recognition.maxAlternatives = 1;

  showSpeechBubble("🎤 Listening... Speak now!");

  recognition.onstart = () => {
    console.log('🎤 Speech recognition started');
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    console.log('🎯 Recognized:', transcript);
    
    showSpeechBubble("💭 Processing: " + transcript);
    sendToGemini(transcript);
  };

  recognition.onerror = (event) => {
    console.error('❌ Speech recognition error:', event.error);
    let errorMessage = "❌ Speech recognition failed";
    
    switch(event.error) {
      case 'no-speech':
        errorMessage = "❌ No speech detected - try speaking louder";
        break;
      case 'audio-capture':
        errorMessage = "❌ Microphone not found - check your microphone";
        break;
      case 'not-allowed':
        errorMessage = "❌ Microphone permission denied - allow microphone access";
        break;
      case 'network':
        errorMessage = "❌ Network error - check your internet connection";
        break;
      default:
        errorMessage = "❌ Speech recognition error: " + event.error;
    }
    
    showSpeechBubble(errorMessage);
    setTimeout(() => hideSpeechBubble(), 5000);
  };

  recognition.onend = () => {
    console.log('🛑 Speech recognition ended');
  };

  // Start recognition
  try {
    recognition.start();
  } catch (err) {
    console.error('❌ Failed to start speech recognition:', err);
    showSpeechBubble("❌ Failed to start speech recognition: " + err.message);
    setTimeout(() => hideSpeechBubble(), 5000);
  }
}

function showSpeechBubble(text) {
  console.log('💬 showSpeechBubble called with:', text);
  const bubble = document.getElementById('voice-bubble');
  console.log('🎤 Voice bubble element found:', bubble);
  
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
  bubble.style.display = 'none';
  console.log('🙈 Hiding speech bubble');
}

async function sendToGemini(promptText) {
  showSpeechBubble("💭 Thinking...");

  // For now, use a placeholder API key - you'll need to add your actual key
  const apiKey = "YOUR_GEMINI_API_KEY_HERE"; // Replace with your actual API key
  
  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE") {
    showSpeechBubble("❌ Please add your Gemini API key to the renderer.js file");
    setTimeout(() => hideSpeechBubble(), 5000);
    return;
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: promptText }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I didn't understand that~";
    showSpeechBubble(reply);
    
    // Hide the bubble after 10 seconds
    setTimeout(() => {
      hideSpeechBubble();
    }, 10000);
    
  } catch (err) {
    console.error("Gemini API Error:", err);
    showSpeechBubble("❌ Failed to talk to Gemini: " + err.message);
    
    // Hide error message after 5 seconds
    setTimeout(() => {
      hideSpeechBubble();
    }, 5000);
  }
}