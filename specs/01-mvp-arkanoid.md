# SPEC 01 — MVP del juego Arkanoid

> **Estado:** Aprobado · **Depende de:** — · **Fecha:** 2026-06-07
> **Objetivo:** Implementar un juego Arkanoid jugable en el browser con un nivel
> fijo, 3 vidas, puntaje por bloque roto y top 5 highscores persistidos en localStorage.

## Scope

**In:**

- Canvas responsivo que escala al viewport manteniendo aspect ratio 3:4 (480×640 lógicos)
- Nivel fijo: 8 columnas × 5 filas de bloques, colores asignados por fila con el spritesheet existente
- Paddle controlable con teclado (←/→) y mouse (posición horizontal del cursor)
- Pelota pegada al paddle al inicio de cada vida; se lanza con Espacio o clic
- 3 vidas; caída de pelota = pierde una vida; 0 vidas = game over
- Puntaje: 10 pts por bloque roto, visible en pantalla durante el juego
- Condición de victoria: todos los bloques rotos
- Animación de explosión al romper un bloque (EXPLOSION_FRAMES del spritesheet)
- Pantallas: inicio → juego → game over / victoria, todas con opción de reiniciar
- Top 5 highscores guardados en localStorage (key `arkanoid:scores:v1`)

**Out of scope (para specs futuros):**

- Audio (los archivos ya existen en assets, se integran en otro spec)
- Pausa (tecla Esc)
- Múltiples niveles o layouts dinámicos
- Power-ups y bloques especiales (irrompibles, multi-hit)
- Controles táctiles / mobile
- Editor de niveles
- Multijugador
- Highscores en servidor

## Data model

```js
// Estado global — objeto mutable único
const state = {
  screen: 'start',   // 'start' | 'playing' | 'gameover' | 'victory'
  lives: 3,
  score: 0,

  paddle: { x: 0, y: 0, w: 162, h: 14 },  // coordenadas lógicas, w/h del spritesheet

  ball: {
    x: 0, y: 0,
    vx: 0, vy: 0,      // píxeles lógicos por segundo
    r: 8,              // radio (mitad del sprite 16×16)
    attached: true,    // true = pegada al paddle, esperando lanzamiento
  },

  bricks: [
    // un objeto por cada celda del nivel
    { col: 0, row: 0, color: 'red', alive: true },
    // … 40 entradas totales (8 cols × 5 rows)
  ],

  explosions: [
    // animaciones activas, se eliminan al completarse
    { x: 0, y: 0, color: 'red', startTime: 0 },
    // frame actual se calcula como: Math.floor((now - startTime) / (EXPLOSION_DURATION / 4))
  ],

  highScores: [
    // persistidos en localStorage bajo 'arkanoid:scores:v1'
    // máximo 5 entradas, ordenadas de mayor a menor
    { score: 0, date: 'YYYY-MM-DD' },
  ],
};
```

Coordenadas: origen en esquina superior izquierda del canvas lógico (480×640).
Velocidades en píxeles lógicos por segundo (se multiplican por `dt` en segundos en cada frame).

## Plan de implementación

1. **HTML + CSS base.** Crear `index.html` con un `<canvas id="game">` y estilos inline
   que lo centren en el viewport manteniendo aspect ratio 3:4 (ancho máx 480px, alto máx 640px,
   `object-fit` equivalente vía CSS). Cargar `assets/spritesheet.js` y `game.js` con `<script>`.
   Verificación: abrir en browser, el canvas aparece centrado sobre fondo negro.

2. **Loop principal.** Crear `game.js` con `loadSpritesheet()`, loop via `requestAnimationFrame`,
   funciones `update(dt)` y `render(ctx)` vacías, y conversión de coordenadas canvas-real
   a coordenadas lógicas (scale factor). Verificación: consola sin errores.

3. **Paddle.** Render con `drawSprite('paddle', …)`. Movimiento: ←/→ a velocidad fija
   (e.g. 400 px/s lógicos); mouse mueve el centro del paddle a la posición X del cursor
   (convertida a coordenadas lógicas). Clamp en ambos bordes. Verificación: el paddle se mueve
   con ambos controles y no se sale del canvas.

4. **Pelota — movimiento y rebotes.** Cuando `ball.attached = true`, la pelota se posiciona
   centrada sobre el paddle. Al presionar Espacio o clic: `attached = false`, velocidad inicial
   `vx = 200, vy = -400` (px lógicos/s). Rebote en paredes izquierda, derecha y techo (invertir
   componente). Si sale por abajo: `lives--`, `ball.attached = true`. Colisión con paddle:
   invertir `vy`, ajustar `vx` según punto de impacto (±). Verificación: la pelota rebota en
   las tres paredes y en el paddle, y se resetea al caer.

5. **Bloques — render y colisión.** Definir layout fijo 8×5: una fila por color
   (`red`, `hotpink`, `magenta`, `yellow`, `green`, `cyan`; fila 5 = `gray`).
   Render con `drawSprite('block_color', …)`. Colisión ball-brick (AABB): al colisionar,
   `brick.alive = false`, invertir componente de velocidad correspondiente, `score += 10`,
   crear entrada en `state.explosions`. Verificación: los bloques se rompen y el puntaje sube.

6. **Animaciones de explosión.** En `update`: eliminar explosiones donde
   `now - startTime >= EXPLOSION_DURATION`. En `render`: calcular frame actual con
   `Math.floor((now - startTime) / (EXPLOSION_DURATION / 4))` y dibujar con `drawFrame(…)`
   usando `EXPLOSION_FRAMES[color][frame]`. Verificación: aparece la animación al romper
   un bloque y desaparece sola.

7. **Condiciones de fin de partida.** Si `lives === 0` → `state.screen = 'gameover'`.
   Si todos los bricks tienen `alive = false` → `state.screen = 'victory'`.
   Verificación: cada condición cambia la pantalla correctamente.

8. **Pantallas.** Render sobre el canvas de las 4 pantallas (`start`, `playing`,
   `gameover`, `victory`) con texto centrado. `playing` muestra puntaje y vidas.
   `gameover` y `victory` muestran puntaje final. Todas incluyen instrucción de reinicio
   (tecla R o clic). Al reiniciar: resetear `state` al valor inicial sin borrar `highScores`.
   Verificación: el flujo completo inicio → juego → fin → reinicio funciona.

9. **Highscores.** Al entrar a `gameover` o `victory`: si el score actual entra en el top 5,
   insertarlo en `state.highScores`, ordenar descendente, recortar a 5 entradas, serializar
   a localStorage bajo `'arkanoid:scores:v1'`. Al cargar la página: leer y deserializar.
   Mostrar el top 5 en las pantallas de game over y victoria. Verificación: los scores
   persisten al recargar la página.

## Criterios de aceptación

- [ ] El juego carga sin errores en consola.
- [ ] El canvas escala al tamaño de la ventana manteniendo aspect ratio 3:4.
- [ ] El paddle responde a ←/→ y al movimiento horizontal del mouse.
- [ ] El paddle no se sale de los bordes del canvas.
- [ ] Al iniciar cada vida, la pelota queda pegada al paddle; se lanza con Espacio o clic.
- [ ] La pelota rebota correctamente en las tres paredes y en el paddle.
- [ ] El ángulo de rebote en el paddle varía según el punto de impacto.
- [ ] Romper un bloque suma exactamente 10 puntos al marcador visible.
- [ ] Al romper un bloque aparece y desaparece la animación de explosión del spritesheet.
- [ ] La pelota cayendo por debajo descuenta una vida; el contador actualiza en pantalla.
- [ ] Al llegar a 0 vidas aparece la pantalla de game over con el puntaje final.
- [ ] Al romper todos los bloques aparece la pantalla de victoria con el puntaje final.
- [ ] Desde game over y victoria se puede reiniciar sin recargar la página.
- [ ] Al reiniciar, los highscores anteriores se conservan.
- [ ] Si el puntaje entra en el top 5, se muestra en la pantalla de fin y persiste al recargar.

## Decisiones

- **Sí:** Canvas responsivo con aspect ratio 3:4 (480×640 lógico). Escala al viewport
  sin cálculos de juego — la lógica siempre opera en coordenadas lógicas.
- **No:** Canvas de tamaño fijo. El usuario prefirió responsivo.

- **Sí:** Un solo nivel fijo 8×5. Suficiente para validar la mecánica core del MVP.
- **No:** Múltiples niveles. Se difieren a un spec propio.

- **Sí:** Puntaje uniforme de 10 pts por bloque. Simple y verificable.
- **No:** Puntaje diferenciado por color. Se reserva para cuando haya más niveles.

- **Sí:** Highscores en localStorage con key versionada `arkanoid:scores:v1`.
  La versión en la key permite migrar el schema sin romper datos existentes.
- **No:** Highscores en servidor. Fuera del alcance de este MVP.

- **Sí:** Pelota pegada al paddle, lanzada con Espacio o clic. Da al jugador
  control del momento de lanzamiento.
- **No:** Lanzamiento automático al iniciar la vida.

- **No:** Audio. Los archivos `ball-bounce.mp3` y `break-sound.mp3` ya existen
  en assets pero se integran en un spec separado para mantener el MVP limpio.
- **No:** Pausa (Esc). Evaluada y dejada fuera del MVP.
- **No:** Controles táctiles. Se tratan en un spec de adaptación mobile.

## Qué NO está en este spec

- Audio / sonidos
- Pausa
- Múltiples niveles
- Power-ups o bloques especiales
- Controles táctiles
- Highscores en servidor
