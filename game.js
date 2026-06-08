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

const SFX = {
  bounce: new Audio('assets/sounds/ball-bounce.mp3'),
  break:  new Audio('assets/sounds/break-sound.mp3'),
};

function makeLevelBricks(rowColors) {
  const bricks = [];
  for (let row = 0; row < rowColors.length; row++) {
    for (let col = 0; col < BRICK_COLS; col++) {
      bricks.push({ col, row, color: rowColors[row] });
    }
  }
  return bricks;
}

const LEVELS = [
  { speedMultiplier: 1.0, bricks: makeLevelBricks(['red', 'hotpink', 'magenta', 'yellow', 'gray']) },
  { speedMultiplier: 1.3, bricks: makeLevelBricks(['cyan', 'green', 'gray', 'hotpink', 'red']) },
  { speedMultiplier: 1.6, bricks: makeLevelBricks(['gray', 'cyan', 'yellow', 'gray', 'magenta']) },
];

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
  if (e.code === 'Space') {
    if (state.screen === 'playing') launchBall();
    else if (state.screen === 'start') startGame();
  }
  if (e.code === 'KeyR') {
    if (state.screen === 'gameover' || state.screen === 'victory') startGame();
  }
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

canvas.addEventListener('click', () => {
  if (state.screen === 'playing') launchBall();
  else if (state.screen === 'start') startGame();
  else if (state.screen === 'gameover' || state.screen === 'victory') startGame();
});

canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  mouseLogicalX = toLogicalX(e.clientX - rect.left);
});

const state = {
  screen: 'start',
  lives: 3,
  score: 0,
  level: 1,
  speedMultiplier: 1.0,
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
      const color = ROW_COLORS[row];
      const maxHp = color === 'gray' ? 2 : 1;
      bricks.push({
        col, row,
        color,
        alive: true,
        hp: maxHp,
        maxHp,
        damaged: false,
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

function loadLevel(n) {
  const lvl = LEVELS[n - 1];
  state.level = n;
  state.speedMultiplier = lvl.speedMultiplier;
  state.bricks = lvl.bricks.map(b => {
    const maxHp = b.color === 'gray' ? 2 : 1;
    return {
      col: b.col, row: b.row, color: b.color,
      alive: true, hp: maxHp, maxHp, damaged: false,
      x: BRICK_OFFSET_X + b.col * (BRICK_W + BRICK_GAP),
      y: BRICK_OFFSET_Y + b.row * (BRICK_H + BRICK_GAP),
    };
  });
  resetBallAndPaddle();
  state.explosions = [];
}

function initState() {
  state.screen = 'start';
  state.lives = 3;
  state.score = 0;
  state.paddle.y = LOGICAL_H - 40;
  loadLevel(1);
}

function startGame() {
  const savedScores = state.highScores;
  initState();
  state.highScores = savedScores;
  state.screen = 'playing';
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
    SFX.bounce.cloneNode().play();
  } else if (ball.x + ball.r > LOGICAL_W) {
    ball.x = LOGICAL_W - ball.r;
    ball.vx = -Math.abs(ball.vx);
    SFX.bounce.cloneNode().play();
  }

  // Ceiling
  if (ball.y - ball.r < 0) {
    ball.y = ball.r;
    ball.vy = Math.abs(ball.vy);
    SFX.bounce.cloneNode().play();
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
    SFX.bounce.cloneNode().play();
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

    b.hp--;
    if (b.hp <= 0) {
      b.alive = false;
      state.score += 10;
      SFX.break.cloneNode().play();
    } else {
      b.damaged = true;
    }
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

function updateExplosions(now) {
  state.explosions = state.explosions.filter(e => now - e.startTime < EXPLOSION_DURATION);
}

function saveHighScore() {
  const date = new Date().toISOString().slice(0, 10);
  state.highScores.push({ score: state.score, date });
  state.highScores.sort((a, b) => b.score - a.score);
  state.highScores = state.highScores.slice(0, 5);
  try {
    localStorage.setItem('arkanoid:scores:v1', JSON.stringify(state.highScores));
  } catch {}
}

function checkEndConditions() {
  if (state.lives <= 0 && state.screen === 'playing') {
    state.screen = 'gameover';
    saveHighScore();
  } else if (state.bricks.every(b => b.hp < b.maxHp) && state.screen === 'playing') {
    state.screen = 'victory';
    saveHighScore();
  }
}

function update(dt, now) {
  if (state.screen !== 'playing') return;
  updatePaddle(dt);
  updateBall(dt);
  updateBricks(now);
  updateExplosions(now);
  checkEndConditions();
}

function drawText(text, y, size, color = '#fff') {
  ctx.fillStyle = color;
  ctx.font = `bold ${size}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(text, LOGICAL_W / 2, y);
}

function renderPlaying(now) {
  for (const b of state.bricks) {
    if (b.alive) {
      const sprite = b.damaged ? 'block_gray' : `block_${b.color}`;
      drawSprite(ctx, sprite, b.x, b.y, BRICK_W, BRICK_H);
    }
  }

  for (const e of state.explosions) {
    const frame = Math.min(
      Math.floor((now - e.startTime) / (EXPLOSION_DURATION / 4)),
      3
    );
    drawFrame(ctx, EXPLOSION_FRAMES[e.color][frame], e.x, e.y, BRICK_W, BRICK_H);
  }

  drawSprite(ctx, 'paddle', state.paddle.x, state.paddle.y, state.paddle.w, state.paddle.h);
  const b = state.ball;
  drawSprite(ctx, 'ball', b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);

  // HUD
  drawText(`SCORE: ${state.score}`, 24, 18, '#ff0');
  drawText(`LIVES: ${state.lives}`, 24, 18, '#ff0');
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ff0';
  ctx.font = 'bold 18px monospace';
  ctx.fillText(`SCORE: ${state.score}`, 8, 24);
  ctx.textAlign = 'right';
  ctx.fillText(`LIVES: ${state.lives}`, LOGICAL_W - 8, 24);
}

function renderStart() {
  drawText('ARKANOID', LOGICAL_H / 2 - 60, 48, '#ff0');
  drawText('Press SPACE or click to play', LOGICAL_H / 2 + 10, 20, '#fff');
}

function renderHighScores(startY) {
  drawText('TOP 5', startY, 18, '#ff0');
  state.highScores.forEach((entry, i) => {
    drawText(`${i + 1}. ${entry.score}  ${entry.date}`, startY + 24 + i * 22, 16, '#ccc');
  });
}

function renderGameOver() {
  drawText('GAME OVER', 160, 48, '#f44');
  drawText(`SCORE: ${state.score}`, 220, 28, '#fff');
  renderHighScores(270);
  drawText('Press R or click to restart', 590, 20, '#aaa');
}

function renderVictory() {
  drawText('YOU WIN!', 160, 48, '#4f4');
  drawText(`SCORE: ${state.score}`, 220, 28, '#fff');
  renderHighScores(270);
  drawText('Press R or click to restart', 590, 20, '#aaa');
}

function render(now) {
  ctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

  if (state.screen === 'start')    renderStart();
  if (state.screen === 'playing')  renderPlaying(now);
  if (state.screen === 'gameover') renderGameOver();
  if (state.screen === 'victory')  renderVictory();
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
