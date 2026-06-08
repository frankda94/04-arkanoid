# SPEC 03 — Audio y niveles progresivos

> **Estado:** Draft · **Depende de:** 01-mvp-arkanoid, 02-bloques-multi-hit · **Fecha:** 2026-06-08
> **Objetivo:** Integrar los dos sonidos existentes en los eventos de juego e implementar
> 3 niveles con layouts de bloques distintos y velocidad de pelota creciente,
> conservando el puntaje acumulado entre niveles.

## Scope

**In:**
- `ball-bounce.mp3` suena en cada rebote de la pelota (paredes izquierda, derecha, techo y paddle)
- `break-sound.mp3` suena solo al destruir completamente un bloque (último hit)
- Sin control de mute ni volumen — el audio siempre activo
- 3 niveles con layouts de bloques hardcodeados (8×5 o variante) y velocidad creciente
- Al completar un nivel (condición de victoria actual): si hay nivel siguiente, transición
  al siguiente nivel conservando score y vidas; si es el nivel 3, pantalla de victoria total
- Indicador de nivel actual visible durante el juego
- El puntaje acumulado se conserva entre niveles; las vidas también

**Out of scope:**
- Sonido en hit intermedio de bloques grises
- Sonido de perder vida, game over o victoria
- Control de volumen / tecla mute
- Más de 3 niveles
- Velocidad de paddle variable por nivel
- Power-ups o bloques especiales nuevos
- Música de fondo
- Editor de niveles

## Data model

### Cambios en `state` (game.js)

```js
const state = {
  // ... campos existentes ...
  level: 1,   // nivel actual, 1–3
};
```

### Definición de niveles (game.js, constante global)

```js
const LEVELS = [
  {
    speedMultiplier: 1.0,
    bricks: [
      // 8 cols × 5 rows — igual al nivel actual del MVP
      // { col, row, color }
    ],
  },
  {
    speedMultiplier: 1.3,
    bricks: [ /* layout distinto */ ],
  },
  {
    speedMultiplier: 1.6,
    bricks: [ /* layout más denso o patrón diferente */ ],
  },
];
```

`speedMultiplier` se aplica a `vx` y `vy` iniciales al lanzar la pelota en ese nivel.
Los valores base de velocidad (`vx = 200, vy = -400`) se multiplican por el factor del nivel activo.

### Audio (game.js, constantes globales)

```js
const SFX = {
  bounce: new Audio('assets/sounds/ball-bounce.mp3'),
  break:  new Audio('assets/sounds/break-sound.mp3'),
};
```

Se llaman con `SFX.bounce.cloneNode().play()` para permitir solapamiento de sonidos.

## Plan de implementación

1. **Constante SFX.** En `game.js`, declarar `SFX` con los dos `Audio` objects.
   Verificación: `SFX.bounce` y `SFX.break` existen en consola sin errores.

2. **Sonido de rebote.** En cada punto donde la pelota invierte dirección (paredes y paddle),
   llamar `SFX.bounce.cloneNode().play()`.
   Verificación: se escucha el sonido en cada rebote.

3. **Sonido de bloque.** En la colisión ball-brick, llamar `SFX.break.cloneNode().play()`
   solo cuando `brick.hp` llega a 0 (destrucción completa). No sonar en hit intermedio.
   Verificación: suena al destruir cualquier bloque; no suena en el primer hit de un gris.

4. **Constante LEVELS.** Definir el array de 3 niveles con sus layouts y `speedMultiplier`.
   El nivel 1 reutiliza el layout actual del MVP. Los niveles 2 y 3 tienen layouts distintos
   (distintos colores por fila, huecos, o densidad diferente).
   Verificación: `LEVELS[0].bricks.length === 40` (o el conteo del layout elegido).

5. **Cargar nivel.** Crear función `loadLevel(n)` que: (a) toma `LEVELS[n-1]`, (b) regenera
   `state.bricks` con `hp`/`maxHp`/`damaged` según spec 02, (c) aplica `speedMultiplier`
   almacenándolo en `state.speedMultiplier`, (d) resetea pelota al paddle sin tocar score ni vidas.
   Verificación: llamar `loadLevel(2)` desde consola cambia el layout y la variable de velocidad.

6. **Velocidad al lanzar.** Al lanzar la pelota (Espacio/clic), multiplicar velocidades base
   por `state.speedMultiplier`.
   Verificación: la pelota en nivel 2 es notablemente más rápida que en nivel 1.

7. **Transición entre niveles.** Cuando se cumple la condición de victoria actual: si
   `state.level < 3`, incrementar `state.level`, llamar `loadLevel(state.level)` y continuar
   jugando (sin pantalla intermedia). Si `state.level === 3`, ir a `screen: 'victory'`.
   Verificación: completar nivel 1 carga el nivel 2 sin perder score ni vidas.

8. **Indicador de nivel.** Durante `screen: 'playing'`, mostrar "LEVEL N" junto al score y vidas.
   Verificación: el número de nivel se actualiza en pantalla al pasar de nivel.

9. **Reinicio.** Al reiniciar desde game over o victoria, resetear `state.level = 1` y llamar
   `loadLevel(1)` además de resetear score y vidas.
   Verificación: reiniciar siempre empieza desde el nivel 1.

## Criterios de aceptación

- [ ] `ball-bounce.mp3` suena en cada rebote contra pared izquierda, derecha, techo y paddle.
- [ ] `break-sound.mp3` suena al destruir completamente cualquier bloque (último hit).
- [ ] `break-sound.mp3` NO suena en el hit intermedio de un bloque gris.
- [ ] No hay errores de consola relacionados con audio (política de autoplay cubierta
      porque el usuario ya interactuó al lanzar la pelota).
- [ ] Al iniciar, el juego carga el nivel 1 con el layout y velocidad base del MVP.
- [ ] El nivel 2 muestra un layout distinto al nivel 1 y la pelota es más rápida.
- [ ] El nivel 3 muestra un layout distinto al nivel 2 y la pelota es más rápida que en nivel 2.
- [ ] Al completar el nivel 1, el juego carga el nivel 2 sin pantalla intermedia,
      conservando score y vidas.
- [ ] Al completar el nivel 2, el juego carga el nivel 3 conservando score y vidas.
- [ ] Al completar el nivel 3, aparece la pantalla de victoria total.
- [ ] El indicador "LEVEL N" es visible en pantalla durante el juego y se actualiza al pasar de nivel.
- [ ] El puntaje acumulado de niveles anteriores se conserva al entrar al siguiente nivel.
- [ ] Al reiniciar desde cualquier pantalla de fin, el juego empieza desde el nivel 1.

## Decisiones

- **Sí:** `new Audio().cloneNode().play()` para reproducción. Permite solapamiento sin
  Web Audio API — cero dependencias, suficiente para dos efectos cortos.
- **No:** Web Audio API. Más potente pero innecesaria para este caso.

- **Sí:** `break-sound` suena **solo al destruir completamente** un bloque (último hit).
  Mantiene el sonido de destrucción como evento claro y definitivo.
- **No:** Sonido en hit intermedio de grises. Evita ambigüedad — el jugador distingue
  daño (sin sonido) de destrucción (con sonido).

- **Sí:** Sin control de mute. Mantiene el scope pequeño; el audio es parte de la experiencia.
- **No:** Tecla M para silenciar. Se puede añadir en un spec posterior si se pide.

- **Sí:** 3 niveles hardcodeados en `LEVELS[]`. Simple, sin infraestructura extra.
- **No:** Formato externo (JSON/archivo). Sobrengineering para 3 niveles fijos.

- **Sí:** `speedMultiplier` de 1.0 / 1.3 / 1.6. Incremento moderado y perceptible
  sin hacer el nivel 3 injugable.
- **No:** Velocidad fija igual en todos los niveles. Eliminaría la progresión de dificultad.

- **Sí:** Conservar score y vidas entre niveles. El juego se trata como una sesión continua.
- **No:** Resetear score al cambiar de nivel. Penalizaría al jugador por progresar.

- **Sí:** Transición directa entre niveles sin pantalla intermedia. Flujo más ágil.
- **No:** Pantalla de "nivel completado". Se puede añadir después si se desea.
