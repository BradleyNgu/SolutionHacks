const speechBubble = document.getElementById('speech-bubble');
const maidImg = document.getElementById('maid');

console.log('🚀 Renderer script loaded');
console.log('📝 Speech bubble element:', speechBubble);
console.log('🖼️ Maid image element:', maidImg);

// Chat window elements
const chatWindow = document.getElementById('chat-window');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-message');
const closeChatButton = document.getElementById('close-chat');

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

// Chat window functionality
if (window.api && window.api.onShowChatWindow) {
  window.api.onShowChatWindow(() => {
    console.log('💬 Chat window triggered');
    showChatWindow();
  });
}

function showChatWindow() {
  chatWindow.classList.remove('chat-hidden');
  chatInput.focus();
  addMessage('maid', 'Okaerinasai, Goshujin! How can I help you today? 💕');
}

function hideChatWindow() {
  chatWindow.classList.add('chat-hidden');
}

function addMessage(sender, text) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${sender}-message`;
  messageDiv.textContent = text;
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendMessage() {
  const message = chatInput.value.trim();
  if (!message) return;

  // Add user message to chat
  addMessage('user', message);
  chatInput.value = '';
  sendButton.disabled = true;

  try {
    // Send to Gemini API
    const response = await sendToGemini(message);
    addMessage('maid', response);
  } catch (error) {
    addMessage('maid', 'Gomen ne, Goshujin! I had trouble processing that. 😅');
    console.error('Chat error:', error);
  } finally {
    sendButton.disabled = false;
    chatInput.focus();
  }
}

async function sendToGemini(promptText) {
  const apiKey = window.api?.getGeminiKey();
  
  if (!apiKey) {
    return "Gomen ne, Goshujin! I need my API key to chat with you. Please add GEMINI_KEY to your .env file! 💕";
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
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Gomen ne, I didn't understand that! 😅";
    
  } catch (err) {
    console.error("Gemini API Error:", err);
    throw err;
  }
}

// Event listeners for chat
sendButton.addEventListener('click', sendMessage);
closeChatButton.addEventListener('click', hideChatWindow);

chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});

// Close chat window when clicking outside
document.addEventListener('click', (e) => {
  if (!chatWindow.contains(e.target) && !e.target.closest('#chat-window')) {
    hideChatWindow();
  }
}); 