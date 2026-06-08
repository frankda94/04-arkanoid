const LOGICAL_W = 480;
const LOGICAL_H = 640;

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
  state.screen = 'start';
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

function update(dt) { /* filled in later steps */ }

function render(now) { /* filled in later steps */ }

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
