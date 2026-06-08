# SPEC 02 — Bloques multi-hit con visual de daño

> **Estado:** implementado · **Depende de:** 01-mvp-arkanoid · **Fecha:** 2026-06-08
> **Objetivo:** Añadir HP a los bloques (grises = 2 hits, resto = 1), mostrar el daño
> cambiando el sprite a gris, y ajustar victoria a "todos los bloques recibieron al menos un hit".

## Scope

**In:**
- Cada bloque tiene `hp` y `maxHp`: bloques grises `maxHp = 2`, todos los demás `maxHp = 1`
- Al recibir un hit intermedio (`hp > 1` → decrementa a ≥ 1): reproduce la animación de
  explosión del color original (mismos `EXPLOSION_FRAMES`), el bloque sobrevive y cambia
  su sprite a `block_gray` al completarse la animación
- Al recibir el último hit (`hp` llega a 0): animación de explosión igual, bloque desaparece
- Puntaje solo al destruir (último hit)
- Condición de victoria: todos los bloques tienen `hp < maxHp` (todos recibieron al menos un hit)

**Out of scope:**
- Nuevos assets / frames en el spritesheet
- Bloques con más de 2 hits
- Bloques irrompibles
- Audio de hit intermedio vs destrucción

## Data model

Cambios sobre el modelo existente en `game.js`:

```js
// Brick — campos nuevos sobre los existentes
{
  col: 0, row: 0, color: 'red', alive: true,
  hp: 1,       // hits restantes; 0 = destruido
  maxHp: 1,    // 1 para todos los colores, 2 para 'gray'
  damaged: false,  // true cuando hp < maxHp y el bloque sigue vivo
}

// Explosion — sin cambios estructurales; se crea en hits intermedios Y en destrucción
{ x: 0, y: 0, color: 'red', startTime: 0 }
// La explosión de hit intermedio se distingue solo por que el bloque queda vivo
// No se necesita un flag extra en la explosión
```

Inicialización de `maxHp` al crear los bricks:
- `color === 'gray'` → `maxHp = 2, hp = 2`
- resto → `maxHp = 1, hp = 1`

## Plan de implementación

1. **Inicialización de bricks.** En la función que genera `state.bricks`, añadir `hp` y
   `maxHp` a cada brick: `maxHp = color === 'gray' ? 2 : 1`, `hp = maxHp`, `damaged = false`.
   Verificación: `console.log(state.bricks)` muestra los campos correctos al iniciar.

2. **Colisión ball-brick.** Reemplazar el bloque `brick.alive = false` por la lógica:
   - `brick.hp--`
   - Si `brick.hp <= 0`: `brick.alive = false` (destrucción), `score += 10`, crear explosión
   - Si `brick.hp > 0`: `brick.damaged = true`, crear explosión (hit intermedio, sin score)
   Verificación: un bloque gris tarda 2 hits en desaparecer; los demás, 1 hit.

3. **Render de bricks.** En la función de render, si `brick.damaged === true` y `brick.alive`,
   dibujar con `drawSprite(ctx, 'block_gray', …)` en lugar del color original.
   Verificación: el bloque gris aparece tras el primer hit en un bloque de 2 hits.

4. **Condición de victoria.** Cambiar el check de victoria de
   `bricks.every(b => !b.alive)` a `bricks.every(b => b.hp < b.maxHp)`.
   Verificación: romper todos los bloques no-grises + dar un hit a cada gris dispara victoria.

5. **Reinicio.** Asegurarse de que `resetState()` (o equivalente) regenera los bricks con
   `hp`, `maxHp` y `damaged` en sus valores iniciales.
   Verificación: reiniciar tras game over muestra todos los bloques intactos.

## Criterios de aceptación

- [x] Al iniciar, los bloques grises muestran `hp: 2`; todos los demás `hp: 1`.
- [x] Un bloque no-gris desaparece al primer hit con su animación de explosión.
- [x] Un bloque gris recibe el primer hit: animación de explosión se reproduce, el bloque
      sobrevive y cambia su sprite a `block_gray`.
- [x] Un bloque gris recibe el segundo hit: animación de explosión se reproduce y el bloque
      desaparece.
- [x] El puntaje solo sube al destruir un bloque (último hit). Un hit intermedio no suma puntos.
- [x] La condición de victoria se activa cuando todos los bloques recibieron al menos un hit
      (los grises no necesitan estar destruidos).
- [x] Al reiniciar, todos los bloques vuelven a su estado inicial (`hp = maxHp`, `damaged = false`).

## Decisiones

- **Sí:** `maxHp = 2` solo para bloques grises, resto `maxHp = 1`. Simple y legible al jugador
  — el color gris ya comunica visualmente que son más resistentes.
- **No:** HP diferenciado por más colores. Añade complejidad sin beneficio claro en este spec.

- **Sí:** Hit intermedio reutiliza `EXPLOSION_FRAMES` existentes. Evita nuevos assets y
  mantiene consistencia visual.
- **No:** Frame de "crack" o animación distinta para daño. Requeriría assets nuevos.

- **Sí:** Victoria cuando todos recibieron al menos un hit (`hp < maxHp`). El jugador
  no necesita destruir completamente los grises — basta tocarlos.
- **No:** Victoria solo al destruir todos. Haría los bloques grises desproporcionadamente
  difíciles de limpiar.

- **Sí:** Score solo en el último hit. Evita inflación de puntaje y simplifica la lógica.
- **No:** Score parcial por hit intermedio.
