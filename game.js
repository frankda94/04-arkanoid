const LOGICAL_W = 480;
const LOGICAL_H = 640;
const PADDLE_SPEED = 400; // logical px/s

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Scale factor: logical coords → real canvas pixels
function getScale() {
  return canvas.getBoundingClientRect().width / LOGICAL_W;
}

// Convert real canvas X to logical X
function toLogicalX(realX) {
  return realX / getScale();
}

// Input state
const keys = {};
let mouseLogicalX = null; // null = not yet moved

window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') mouseLogicalX = null;
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  mouseLogicalX = toLogicalX(e.clientX - rect.left);
});

const state = {
  screen: 'start',
  lives: 3,
  score: 0,
  paddle: { x: 0, y: 0, w: 162, h: 14 },
  ball: { x: 0, y: 0, vx: 0, vy: 0, r: 8, attached: true },
  bricks: [],
  explosions: [],
  highScores: [],
};

function initState() {
  state.screen = 'playing'; // temporary; Step 8 sets this to 'start'
  state.lives = 3;
  state.score = 0;
  state.paddle.x = (LOGICAL_W - state.paddle.w) / 2;
  state.paddle.y = LOGICAL_H - 40;
  state.ball.attached = true;
  state.ball.vx = 0;
  state.ball.vy = 0;
  state.bricks = [];
  state.explosions = [];
}

function resetBallAndPaddle() {
  state.paddle.x = (LOGICAL_W - state.paddle.w) / 2;
  state.ball.attached = true;
  state.ball.vx = 0;
  state.ball.vy = 0;
}

function loadHighScores() {
  try {
    const raw = localStorage.getItem('arkanoid:scores:v1');
    state.highScores = raw ? JSON.parse(raw) : [];
  } catch {
    state.highScores = [];
  }
}

function clampPaddle() {
  state.paddle.x = Math.max(0, Math.min(LOGICAL_W - state.paddle.w, state.paddle.x));
}

function updatePaddle(dt) {
  if (mouseLogicalX !== null) {
    // Center paddle on mouse X
    state.paddle.x = mouseLogicalX - state.paddle.w / 2;
  } else {
    if (keys['ArrowLeft'])  state.paddle.x -= PADDLE_SPEED * dt;
    if (keys['ArrowRight']) state.paddle.x += PADDLE_SPEED * dt;
  }
  clampPaddle();
}

function update(dt) {
  if (state.screen !== 'playing') return;
  updatePaddle(dt);
}

function render(now) {
  ctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

  if (state.screen === 'playing') {
    drawSprite(ctx, 'paddle', state.paddle.x, state.paddle.y, state.paddle.w, state.paddle.h);
  }
}

let lastTime = null;

function loop(timestamp) {
  if (lastTime === null) lastTime = timestamp;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05); // cap at 50ms
  lastTime = timestamp;

  update(dt);
  render(timestamp);

  requestAnimationFrame(loop);
}

loadSpritesheet(() => {
  loadHighScores();
  initState();
  requestAnimationFrame(loop);
});
