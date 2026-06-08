const LOGICAL_W = 480;
const LOGICAL_H = 640;
const PADDLE_SPEED = 400; // logical px/s

const BRICK_COLS   = 8;
const BRICK_ROWS   = 5;
const BRICK_W      = 56;   // logical px (8 cols * 56 = 448, centred in 480)
const BRICK_H      = 20;
const BRICK_OFFSET_X = (LOGICAL_W - BRICK_COLS * BRICK_W) / 2; // 16 px margin each side
const BRICK_OFFSET_Y = 60;  // top margin
const BRICK_GAP    = 4;
const ROW_COLORS   = ['red', 'hotpink', 'magenta', 'yellow', 'gray'];

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
  if (e.code === 'Space' && state.screen === 'playing') launchBall();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

canvas.addEventListener('click', () => {
  if (state.screen === 'playing') launchBall();
});

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

function buildBricks() {
  const bricks = [];
  for (let row = 0; row < BRICK_ROWS; row++) {
    for (let col = 0; col < BRICK_COLS; col++) {
      bricks.push({
        col, row,
        color: ROW_COLORS[row],
        alive: true,
        x: BRICK_OFFSET_X + col * (BRICK_W + BRICK_GAP),
        y: BRICK_OFFSET_Y + row * (BRICK_H + BRICK_GAP),
      });
    }
  }
  return bricks;
}

function brickRect(b) {
  return { x: b.x, y: b.y, w: BRICK_W, h: BRICK_H };
}

function initState() {
  state.screen = 'playing'; // temporary; Step 8 sets this to 'start'
  state.lives = 3;
  state.score = 0;
  state.paddle.x = (LOGICAL_W - state.paddle.w) / 2;
  state.paddle.y = LOGICAL_H - 40;
  state.ball.attached = true;
  state.ball.vx = 0;
  state.ball.vy = 0;
  state.bricks = buildBricks();
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

function launchBall() {
  if (!state.ball.attached) return;
  state.ball.attached = false;
  state.ball.vx = 200;
  state.ball.vy = -400;
}

function updateBall(dt) {
  const ball = state.ball;
  const pad  = state.paddle;

  if (ball.attached) {
    ball.x = pad.x + pad.w / 2;
    ball.y = pad.y - ball.r;
    return;
  }

  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  // Wall: left / right
  if (ball.x - ball.r < 0) {
    ball.x = ball.r;
    ball.vx = Math.abs(ball.vx);
  } else if (ball.x + ball.r > LOGICAL_W) {
    ball.x = LOGICAL_W - ball.r;
    ball.vx = -Math.abs(ball.vx);
  }

  // Ceiling
  if (ball.y - ball.r < 0) {
    ball.y = ball.r;
    ball.vy = Math.abs(ball.vy);
  }

  // Paddle collision (AABB vs circle, top face only)
  if (
    ball.vy > 0 &&
    ball.y + ball.r >= pad.y &&
    ball.y - ball.r <= pad.y + pad.h &&
    ball.x >= pad.x &&
    ball.x <= pad.x + pad.w
  ) {
    ball.y = pad.y - ball.r;
    ball.vy = -Math.abs(ball.vy);
    // Deflect vx based on hit position relative to paddle centre (-1 … +1)
    const rel = (ball.x - (pad.x + pad.w / 2)) / (pad.w / 2);
    ball.vx = rel * 400;
    // Keep minimum horizontal speed so ball never goes straight up
    if (Math.abs(ball.vx) < 40) ball.vx = 40 * Math.sign(ball.vx || 1);
  }

  // Ball lost
  if (ball.y - ball.r > LOGICAL_H) {
    state.lives -= 1;
    resetBallAndPaddle();
  }
}

function updateBricks(now) {
  const ball = state.ball;
  if (ball.attached) return;

  for (const b of state.bricks) {
    if (!b.alive) continue;
    const r = brickRect(b);

    // AABB overlap
    const overlapX = ball.x + ball.r > r.x && ball.x - ball.r < r.x + r.w;
    const overlapY = ball.y + ball.r > r.y && ball.y - ball.r < r.y + r.h;
    if (!overlapX || !overlapY) continue;

    b.alive = false;
    state.score += 10;
    state.explosions.push({ x: r.x, y: r.y, color: b.color, startTime: now });

    // Determine dominant collision axis to decide which velocity to invert
    const overlapLeft   = (ball.x + ball.r) - r.x;
    const overlapRight  = (r.x + r.w) - (ball.x - ball.r);
    const overlapTop    = (ball.y + ball.r) - r.y;
    const overlapBottom = (r.y + r.h) - (ball.y - ball.r);
    const minX = Math.min(overlapLeft, overlapRight);
    const minY = Math.min(overlapTop, overlapBottom);

    if (minX < minY) {
      ball.vx = -ball.vx;
    } else {
      ball.vy = -ball.vy;
    }
    break; // one brick per frame to avoid tunnelling through corners
  }
}

function update(dt, now) {
  if (state.screen !== 'playing') return;
  updatePaddle(dt);
  updateBall(dt);
  updateBricks(now);
}

function render(now) {
  ctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

  if (state.screen === 'playing') {
    for (const b of state.bricks) {
      if (b.alive) drawSprite(ctx, `block_${b.color}`, b.x, b.y, BRICK_W, BRICK_H);
    }
    drawSprite(ctx, 'paddle', state.paddle.x, state.paddle.y, state.paddle.w, state.paddle.h);
    const b = state.ball;
    drawSprite(ctx, 'ball', b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
  }
}

let lastTime = null;

function loop(timestamp) {
  if (lastTime === null) lastTime = timestamp;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05); // cap at 50ms
  lastTime = timestamp;

  update(dt, timestamp);
  render(timestamp);

  requestAnimationFrame(loop);
}

loadSpritesheet(() => {
  loadHighScores();
  initState();
  requestAnimationFrame(loop);
});
