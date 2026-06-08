# Arkanoid

Juego Arkanoid en el navegador — HTML, CSS y JavaScript puro, sin dependencias. Abre `index.html` directamente en el navegador; no requiere servidor ni build.

## Cómo jugar

| Acción | Control |
|--------|---------|
| Mover paleta | Mouse / touch |
| Lanzar pelota | Espacio / clic |

## Características

- **5 niveles** con layouts de bloques distintos (rectángulo, pirámide, diamante, ajedrez, cruz) y velocidad de pelota creciente (1.0× → 2.2×)
- **Bloques multi-hit:** los bloques grises aguantan 2 golpes; al dañarse cambian su sprite a gris
- **Animación de explosión** al destruir cada bloque (4 frames, 150 ms), con paleta de color del bloque original
- **Efectos de sonido:** rebote de pelota y destrucción de bloque
- **Puntaje y vidas** conservados entre niveles
- **High score** persistido en `localStorage`
- Canvas escalable: se adapta a cualquier tamaño de pantalla manteniendo proporción 3:4

## Estructura

```
index.html          — punto de entrada
game.js             — lógica completa del juego
assets/
  spritesheet.js    — carga y dibuja sprites desde spritesheet-breakout.png
  spritesheet-breakout.png
  sounds/
    ball-bounce.mp3
    break-sound.mp3
specs/              — specs de funcionalidades implementadas
```

## Niveles

| # | Forma | Velocidad |
|---|-------|-----------|
| 1 | Rectángulo clásico | 1.0× |
| 2 | Pirámide | 1.3× |
| 3 | Diamante | 1.6× |
| 4 | Tablero de ajedrez | 1.9× |
| 5 | Cruz + bordes | 2.2× |

## Desarrollo

Las funcionalidades se construyen con un flujo spec → implementación usando skills locales:

```
/spec <descripción>      — diseña y guarda la spec en specs/NN-slug.md
/spec-impl <NN-slug>     — implementa la spec aprobada paso a paso
```

Ver `CLAUDE.md` para instrucciones completas del flujo.
