const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
const container = document.getElementById('canvas-container');
container.appendChild(canvas);

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

const PARTICLES = [];
const COUNT = window.innerWidth < 768 ? 50 : 120;

for (let i = 0; i < COUNT; i++) {
  PARTICLES.push({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    size: Math.random() * 1.4 + 0.2,
    speedY: Math.random() * 0.3 + 0.08,
    speedX: (Math.random() - 0.5) * 0.1,
    opacity: Math.random() * 0.5 + 0.08,
    color: Math.random() > 0.75 ? 'green' : 'white',
  });
}

let scanY = -60;
let t = 0;

function draw() {
  t += 0.016;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.02)';
  ctx.lineWidth = 1;
  const COLS = 12, ROWS = 8;
  for (let c = 0; c <= COLS; c++) {
    const x = (canvas.width / COLS) * c;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let r = 0; r <= ROWS; r++) {
    const y = (canvas.height / ROWS) * r;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }

  // Green diagonal accent lines
  ctx.strokeStyle = 'rgba(0,255,128,0.04)';
  ctx.lineWidth = 1;
  for (let i = -10; i < 20; i++) {
    const x = i * 140 + (t * 5 % 140);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + canvas.height * 0.35, canvas.height);
    ctx.stroke();
  }

  // Particles
  PARTICLES.forEach(p => {
    p.y -= p.speedY;
    p.x += p.speedX;
    if (p.y < -4) { p.y = canvas.height + 4; p.x = Math.random() * canvas.width; }
    if (p.x < 0) p.x = canvas.width;
    if (p.x > canvas.width) p.x = 0;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = p.color === 'green'
      ? `rgba(0,255,128,${p.opacity})`
      : `rgba(255,255,255,${p.opacity})`;
    ctx.fill();
  });

  // Scanline
  const grad = ctx.createLinearGradient(0, scanY - 80, 0, scanY + 80);
  grad.addColorStop(0, 'rgba(0,255,128,0)');
  grad.addColorStop(0.5, 'rgba(0,255,128,0.012)');
  grad.addColorStop(1, 'rgba(0,255,128,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, scanY - 80, canvas.width, 160);
  scanY += 1.0;
  if (scanY > canvas.height + 80) scanY = -80;

  // Corner brackets
  const bSize = 24, bGap = 44;
  ctx.strokeStyle = 'rgba(0,255,128,0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(bGap, bGap+bSize); ctx.lineTo(bGap, bGap); ctx.lineTo(bGap+bSize, bGap); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(canvas.width-bGap-bSize, bGap); ctx.lineTo(canvas.width-bGap, bGap); ctx.lineTo(canvas.width-bGap, bGap+bSize); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bGap, canvas.height-bGap-bSize); ctx.lineTo(bGap, canvas.height-bGap); ctx.lineTo(bGap+bSize, canvas.height-bGap); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(canvas.width-bGap-bSize, canvas.height-bGap); ctx.lineTo(canvas.width-bGap, canvas.height-bGap); ctx.lineTo(canvas.width-bGap, canvas.height-bGap-bSize); ctx.stroke();

  requestAnimationFrame(draw);
}

draw();