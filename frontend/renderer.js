const { ipcRenderer } = require('electron');

const speechBubble = document.getElementById('speech-bubble');
const maidImg = document.getElementById('maid');

// ⏱️ Random speech bubble quotes every 5 seconds
const idleLines = [
  "Don't forget to drink water~!",
  "You should watch some anime!",
  "Time for a break, Master?",
  "You’ve been working hard~"
];
const clickLines = [
  "Unhand me, swine!",
  "Hands off, trash!",
  "Do I look like a toy to you?",
  "I didn’t give you permission to touch me!",
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

async function sendToGemini(promptText) {
  showSpeechBubble("💭 Thinking...");

  const apiKey = "AIzaSyBsMY3b_YqxPzwFPYamP2u_crA-GCYHi9A"; 

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

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I didn’t understand that~";
    showSpeechBubble(reply);
  } catch (err) {
    console.error("Gemini API Error:", err);
    showSpeechBubble("❌ Failed to talk to Gemini.");
  }
}