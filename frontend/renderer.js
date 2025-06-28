const speechBubble = document.getElementById('speech-bubble');
const maidImg = document.getElementById('maid');

const idleLines = [
  "Don't forget to drink water~!",
  "You should watch some anime!",
  "Time for a break, Master?",
  "You’ve been working hard~"
];

const clickLines = [
  "Unhand me, swine!",
  "Hands off, trash!",
  "Do I *look* like a toy to you?",
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
