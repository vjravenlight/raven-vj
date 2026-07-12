# RAVEN VJ 🔥

**Mixer de video para VJing en vivo — en un solo HTML.** Sin instalar nada: doble click en `index.html` y a tocar. También corre online como PWA (funciona sin internet una vez cargada).

**▶ Probala ya: [www.ravenlight.net/ravenvj](https://www.ravenlight.net/ravenvj/)**

## Qué hace

- 🎬 **Clips**: MP4/WebM y GIFs animados por drag & drop, 4 capas × columnas ilimitadas, decks A/B/C/D
- ✨ **34 generadores GLSL** audio-reactivos + creador por bloques, editor de nodos con cables y import de shaders (`.frag` / formato Shadertoy)
- 🎛 **Mezcla**: blend modes, crossfader A/B, fundidos, modo 1× (un clip a la vez con transiciones), efectos master y por capa con moduladores (LFO sync BPM, audio, pad XY)
- 🥁 **Audio-rítmico**: beat detect por micrófono, BPM automático (SYNC) o TAP, BUILD/DROP para levantar la pista
- 🤖 **Automatización**: autopilot, auto-transición por capa (beats/segundos/fin de clip, con paso por negro), animación de parámetros por clip (loops sync BPM, audio, azar), escenas, setlist programado, randomizer de FX
- 🎹 **Cualquier controlador MIDI**: asistente de mapeo guiado, perfiles de fábrica (nanoPAD2, nanoKONTROL2, APC Mini, Launchpad), MIDI learn universal, mapeos exportables/importables y teclas asignables
- 📱 **Control remoto desde el celular**: grilla, mezcla, macros y secuenciador de bucles de 16 pasos — con roles para que varias personas controlen a la vez sin pisarse
- 📽 **Salida**: ventana OUTPUT para proyector (sobrevive refrescos y fullscreen), multi-pantalla, mapping multi-superficie con corner-pin, máscaras, soft edge y contornos animados
- 📐 **Resoluciones**: 16:9, vertical 9:16, cuadrada, 4:3 o personalizada (ej. `1920x600` para tiras LED)
- ⏺ **Grabación** de la salida a .webm, sets en JSON con relink de videos, autosave, temas de color

## Cómo usarla

**Portable**: descargá el repo (o el ZIP) y abrí `index.html` con Chrome o Edge. Copiala a un pendrive y usala en cualquier PC.

**Online**: entrá a [ravenlight.net/ravenvj](https://www.ravenlight.net/ravenvj/) — se cachea sola y después funciona sin internet.

**Manual completo**: [LEEME.txt](LEEME.txt) — atajos, mapeo del nanoPAD2, recetas para fiestas psy y más.

## Stack

Un solo `index.html` autocontenido: WebGL2, Web Audio, Web MIDI, MediaRecorder, WebRTC (salida y remoto), Service Worker (offline). Sin frameworks, sin build, sin dependencias — solo [PeerJS](https://peerjs.com) auto-alojado para la señalización del remoto.

## Licencia

© 2026 vjravenlight — [GPL v3](LICENSE): usala, estudiala y mejorala libremente; toda modificación que distribuyas tiene que seguir siendo libre y con el código abierto. El nombre **RAVEN VJ** y ravenlight.net no forman parte de la licencia.

## Apoyar

Si la usás en tus fiestas y te sirve: ☕ [cafecito.app/vjravenlight](https://cafecito.app/vjravenlight)
