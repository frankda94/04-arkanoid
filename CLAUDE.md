# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Browser-based Arkanoid game — pure HTML, CSS, and JavaScript, zero dependencies. Open `index.html` directly in a browser; no build step.

## Spec-driven workflow

Features are built through a two-step spec process using custom skills:

1. `/spec <description>` — guided spec designer. Works section by section, asks clarifying questions, saves the result to `specs/NN-slug.md` with status `Draft`.
2. Edit the spec file and change the status to `Approved` manually when ready.
3. `/spec-impl <NN-slug>` — reads the spec, creates a git branch `spec-NN-slug`, and implements step by step with pauses for review.

Specs live in `specs/`. The skills enforce the status gate: `/spec-impl` refuses to run unless the status is `Approved`.

## Sprite system (`assets/spritesheet.js`)

All game graphics come from `assets/spritesheet-breakout.png`. The module exposes three functions:

- `loadSpritesheet(cb)` — loads the image once; `cb` fires when ready. Safe to call multiple times.
- `drawSprite(ctx, name, x, y, w, h)` — draws a named sprite. Names: `'paddle'`, `'ball'`, `'block_red'`, `'block_cyan'`, `'block_green'`, `'block_magenta'`, `'block_yellow'`, `'block_hotpink'`, `'block_gray'`.
- `drawFrame(ctx, frame, x, y, w, h)` — draws a raw `{sx, sy, sw, sh}` frame (used for explosion animation frames from `EXPLOSION_FRAMES`).

`EXPLOSION_FRAMES` has per-color arrays (4 frames each, 150 ms total via `EXPLOSION_DURATION`). Colors match the block set above.

## Conventions

- Coordinates: origin top-left.
- No modules/bundler — scripts are loaded via `<script>` tags in order. `spritesheet.js` must load before game code that calls its functions.
- Spec sections follow `specs/.claude/skills/spec/template.md` (header, scope, data model, implementation plan, acceptance criteria, decisions, risks).
