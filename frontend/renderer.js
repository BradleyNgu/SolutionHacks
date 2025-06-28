const speechBubble = document.getElementById('speech-bubble');

setInterval(() => {
  const lines = [
    "Don't forget to drink water~!",
    "You should watch some anime!",
    "Time for a break, Master?",
    "You’ve been working hard~"
  ];

  const randomLine = lines[Math.floor(Math.random() * lines.length)];
  speechBubble.textContent = randomLine;
}, 5000);