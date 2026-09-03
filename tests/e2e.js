/* RAVEN VJ — suite E2E (Playwright).
   Vive en el REPO (tests/) para no perderse nunca más: la suite anterior de 536 tests
   murió con una limpieza del directorio temporal de Windows. QEPD.
   Correr:  cd tests && node e2e.js
   Necesita Chrome o Edge instalado (channel), o un chromium de playwright. */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const APP = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const REMOTE = 'file:///' + path.resolve(__dirname, '..', 'remote.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
const t = (name, ok, extra) => {
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (extra ? ' :: ' + extra : ''));
  ok ? pass++ : fail++;
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let browser;
  for (const ch of ['msedge', 'chrome', null]) {
    try { browser = await chromium.launch({ ...(ch ? { channel: ch } : {}), headless: true, args: ['--mute-audio', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] }); break; }
    catch (e) { if (ch === null) throw e; }
  }
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  page.on('pageerror', e => console.log('  [pageerror]', String(e).slice(0, 160)));
  await page.addInitScript(() => {
    try {
      const u = JSON.parse(localStorage.getItem('ravenvj_ui') || '{}');
      u.welcomed = true; u.lang = 'es';
      localStorage.setItem('ravenvj_ui', JSON.stringify(u));
      localStorage.removeItem('ravenvj_autosave');
    } catch (e) { }
  });
  await page.goto(APP);
  await page.waitForTimeout(1800);
  let r;

  // ================= NÚCLEO (regresión mínima) =================
  r = await page.evaluate(() => ({
    gl: !!main.gl && !main.gl.isContextLost(),
    grid: state.grid.length === 4 && state.grid[0].length >= 8,
    presets: PRESETS.length >= 30,
    fx: FXDEFS.length >= 12,
  }));
  t('núcleo: GL vivo, grilla, presets y efectos', r.gl && r.grid && r.presets && r.fx, JSON.stringify(r));
  r = await page.evaluate(async () => {
    assignPreset(state.grid[0][0], 2);
    state.fade = 0; triggerCell(0, 0);
    await new Promise(res => setTimeout(res, 400));
    const gl = main.gl;
    const px = new Uint8Array(4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.readPixels((main.canvas.width / 2) | 0, (main.canvas.height / 2) | 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return { lit: px[0] + px[1] + px[2] > 20, err: gl.getError() };
  });
  t('núcleo: disparar un generador pinta la salida', r.lit && !r.err, JSON.stringify(r));
  r = await page.evaluate(() => {
    const j = serialize();
    const ok1 = j.app === 'raven-vj' && Array.isArray(j.cells);
    deserialize(JSON.parse(JSON.stringify(j)));
    return ok1 && state.grid[0][0].kind === 'gen';
  });
  t('núcleo: serialize/deserialize ida y vuelta', r);
  r = await page.evaluate(async () => { // todos los shaders de FX compilan
    for (let l = 0; l < 4; l++) clearLayer(l);
    state.effects = [];
    for (const d of FXDEFS) if (d.id !== 'none') addEffect(d.id);
    assignPreset(state.grid[0][1], 1); state.fade = 0; triggerCell(0, 1);
    await new Promise(res => setTimeout(res, 500));
    const err = main.gl.getError();
    state.effects = []; buildFx(); clearLayer(0);
    return !err;
  });
  t('núcleo: todos los FXDEFS renderizan sin error GL', r);

  // ================= BEAT-REPEAT 🔁 =================
  r = await page.evaluate(() => {
    const cell = state.grid[1][1];
    cell.kind = 'video'; cell.name = 'br';
    const seeks = [];
    cell.video = { tagName: 'VIDEO', paused: false, play() { return { catch() { } }; }, pause() { } };
    Object.defineProperty(cell.video, 'currentTime', { get() { return 7.5; }, set(v) { seeks.push(v); }, configurable: true });
    const L = state.layers[1];
    L.slots[L.target].cell = cell; L.slots[L.target].kind = 'video'; L.slots[L.target].video = cell.video;
    const save = beatFloat;
    beatFloat = 10; brepStart(1);
    beatFloat = 10.5; brepTick();
    const antes = seeks.length;
    beatFloat = 11.05; brepTick();
    const despues = seeks.length > 0 && Math.abs(seeks[0] - 7.5) < .01;
    brepStop();
    beatFloat = save;
    L.slots[L.target].cell = null; L.slots[L.target].kind = 'empty'; L.slots[L.target].video = null;
    emptyCell(cell);
    return { antes, despues, btn: !!$('#brepBtn'), target: mapTargetName('brep:1').includes('repeat') };
  });
  t('brep: vuelve al ancla clavado en el beat', r.antes === 0 && r.despues, JSON.stringify(r));
  t('brep: botón en topbar + target MIDI', r.btn && r.target);

  // ================= COMPASES 🧮 =================
  r = await page.evaluate(() => {
    const save = beatFloat;
    phraseAnchor = 0; beatFloat = 5.5; barTick();
    const txt = $('#barLbl').textContent;
    beatFloat = 13; barTick();
    const warn = $('#barLbl').classList.contains('warn');
    beatFloat = save; barTick();
    return { txt, warn };
  });
  t('compases: cuenta 2·2 y avisa fin de frase', r.txt === '2·2' && r.warn, JSON.stringify(r));

  // ================= MORPH 🎚 =================
  r = await page.evaluate(async () => {
    for (let l = 0; l < 4; l++) clearLayer(l);
    state.layers[0].opacity = 1; state.xfade = 1;
    captureScene(7);
    state.layers[0].opacity = 0; state.xfade = 0;
    state.morphBeats = 4;
    const save = beatFloat;
    beatFloat = 100;
    recallScene(7);
    const arranca = state.layers[0].opacity < .15 && !!sceneMorph;
    beatFloat = 102; morphTick();
    const mitad = state.layers[0].opacity > .2 && state.layers[0].opacity < .8;
    beatFloat = 104.1; morphTick();
    const fin = Math.abs(state.layers[0].opacity - 1) < .01 && !sceneMorph;
    state.morphBeats = 0; $('#morphSel').value = 0;
    state.scenes[7] = null; updateSceneBtns(-1);
    beatFloat = save;
    for (let l = 0; l < 4; l++) clearLayer(l);
    state.xfade = .5; state.layers[0].opacity = 1;
    return { arranca, mitad, fin };
  });
  t('morph: la escena se desliza en N beats', r.arranca && r.mitad && r.fin, JSON.stringify(r));

  // ================= RESAMPLE ⏺ =================
  r = await page.evaluate(async () => {
    state.bpm = 240; // 4 beats = 1 s: test rápido
    resampleStart(4);
    for (let i = 0; i < 40 && !resamp; i++) await new Promise(res => setTimeout(res, 100)); // armado
    for (let i = 0; i < 60 && resamp; i++) await new Promise(res => setTimeout(res, 200));  // grabando
    await new Promise(res => setTimeout(res, 400));
    const cell = state.grid.flat().find(c => /^loop-4b/.test(c.name || ''));
    const ok = !!cell && cell.kind === 'video';
    if (cell) emptyCell(cell);
    state.bpm = 120;
    return ok;
  });
  t('resample: graba N beats y cae como loop', r);

  // ================= AUTO-ENERGÍA 😴⚡ =================
  r = await page.evaluate(() => {
    state.energyScenes = { calm: 6, hard: -1 };
    state.scenes[6] = state.scenes[6] || null;
    captureScene(6);
    state.autoEnergy = true; audio.on = true;
    energ.avg = .5; energ.state = 'hard'; energ.hold = 0; energ.cool = 0;
    audio.bass = .05;
    let called = -1;
    const orig = window.recallScene;
    window.recallScene = i => { called = i; };
    for (let i = 0; i < 100; i++) energyTick(.1);
    window.recallScene = orig;
    state.autoEnergy = false; audio.on = false; audio.bass = 0;
    state.scenes[6] = null; updateSceneBtns(-1);
    state.energyScenes = { calm: -1, hard: -1 };
    return called === 6;
  });
  t('energía: el bajón sostenido dispara la escena CALMA', r);
  t('energía: marcar escenas desde su menú', await page.evaluate(() => {
    captureScene(5);
    const b = document.querySelector('#sceneBtns button[data-scene="5"]');
    b.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 300, clientY: 100 }));
    const item = [...document.querySelectorAll('#ctxmenu .ci')].find(d => d.textContent.includes('CALMA'));
    const has = !!item;
    if (item) item.click(); else hideMenu();
    const marked = state.energyScenes.calm === 5;
    state.energyScenes = { calm: -1, hard: -1 };
    state.scenes[5] = null; updateSceneBtns(-1);
    return has && marked;
  }));

  // ================= HYPE 🔥 =================
  r = await page.evaluate(() => {
    hype.val = 0; pub.on = true;
    for (let i = 0; i < 5; i++) pubMsg({}, { t: 'pub', k: 'h' });
    const subio = hype.val > .4;
    hypeTick(4);
    const decae = hype.val < .25;
    pub.on = false; hype.val = 0;
    return { subio, decae, mods: OPMODS.includes('hype') && MODS.includes('hype') };
  });
  t('hype: taps del público suben el modulador y decae', r.subio && r.decae && r.mods, JSON.stringify(r));

  // ================= EDGE BLEND 🏢 + MAPPING VIVO 🌊 =================
  r = await page.evaluate(async () => {
    for (let l = 0; l < 4; l++) clearLayer(l);
    state.effects = []; buildFx(); state.fade = 0;
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 36;
    cv.getContext('2d').fillStyle = '#fff';
    cv.getContext('2d').fillRect(0, 0, 64, 36);
    const blob = await new Promise(res => cv.toBlob(res, 'image/png'));
    const cell = state.grid[0][7];
    await assignImage(cell, new File([blob], 'blanco.png', { type: 'image/png' }));
    triggerCell(0, 7);
    state.map.on = true;
    const sf = state.map.surfaces[0];
    sf.eblend = { l: 0, r: .4, t: 0, b: 0 };
    await new Promise(res => setTimeout(res, 450));
    const gl = main.gl, W = main.canvas.width, H = main.canvas.height;
    const px = new Uint8Array(4), px2 = new Uint8Array(4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.readPixels((W * .3) | 0, (H / 2) | 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    gl.readPixels((W * .97) | 0, (H / 2) | 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px2);
    const blendOk = px[0] > 180 && px2[0] < px[0] * .55;
    sf.eblend = null;
    sf.vivo = { mode: 'deriva', amt: 1 };
    const m1 = [...vivoWarpM(sf)];
    nowSec += 1;
    const m2 = [...vivoWarpM(sf)];
    nowSec -= 1;
    const vivoOk = m1.some((v, i) => Math.abs(v - m2[i]) > 1e-6);
    sf.vivo = null;
    state.map.on = false;
    clearLayer(0); emptyCell(cell);
    return { blendOk, vivoOk, a: [...px], b: [...px2] };
  });
  t('edge blend: el borde elegido se funde con gamma', r.blendOk, JSON.stringify(r));
  t('mapping vivo: la superficie deriva con el tiempo', r.vivoOk);

  // ================= PRESETS DE MAPPING 📚 =================
  r = await page.evaluate(() => {
    localStorage.removeItem('ravenvj_mapPresets');
    state.map.surfaces[0].pts = [[.1, .1], [.9, .1], [.9, .9], [.1, .9]];
    const origPrompt = window.prompt;
    window.prompt = () => 'bar de siempre';
    mapPresetSave();
    window.prompt = origPrompt;
    const saved = !!mapPresets()['bar de siempre'];
    state.map.surfaces[0].pts = [[0, 0], [1, 0], [1, 1], [0, 1]];
    mapPresetLoad('bar de siempre');
    const restored = Math.abs(state.map.surfaces[0].pts[0][0] - .1) < .001;
    mapPresetDel('bar de siempre');
    const deleted = !mapPresets()['bar de siempre'];
    state.map.surfaces[0].pts = [[0, 0], [1, 0], [1, 1], [0, 1]];
    computeAllWarps();
    return { saved, restored, deleted };
  });
  t('mapping presets: guardar/cargar/borrar por lugar', r.saved && r.restored && r.deleted, JSON.stringify(r));

  // ================= FUENTES 🔤 =================
  r = await page.evaluate(() => {
    customFonts.push('MiFuenteTest');
    const cell = state.grid[2][5];
    assignText(cell, 'PRUEBA');
    openProps('clip', cell, 2);
    const sel = $('#ppfont');
    const enLista = sel && [...sel.options].some(o => o.value === 'MiFuenteTest');
    if (sel) { sel.value = 'Impact'; sel.onchange({ target: sel }); }
    const aplicada = cell.font === 'Impact';
    drawTextCell(cell);
    const fontStr = cellFont(cell);
    customFonts.pop();
    emptyCell(cell);
    return { enLista, aplicada, fontStr };
  });
  t('fuentes: select con customs y aplicación al texto', r.enLista && r.aplicada && r.fontStr.includes('Impact'), JSON.stringify(r));

  // ================= SLIDESHOW 🖼 =================
  r = await page.evaluate(async () => {
    const mk = async col => {
      const cv = document.createElement('canvas'); cv.width = 8; cv.height = 8;
      cv.getContext('2d').fillStyle = col;
      cv.getContext('2d').fillRect(0, 0, 8, 8);
      return new File([await new Promise(res => cv.toBlob(res, 'image/png'))], col + '.png', { type: 'image/png' });
    };
    const cell = state.grid[2][6];
    await assignSlideshow(cell, [await mk('#f00'), await mk('#0f0'), await mk('#00f')]);
    const armado = cell.kind === 'gif' && cell.isImage && cell.slide === 4 && cell.gframes.length === 3;
    const j = serialize();
    const cd = j.cells.find(x => x.l === 2 && x.c === 6 && x.dk === state.deckIdx);
    const ser = cd && cd.slide === 4;
    emptyCell(cell);
    return { armado, ser };
  });
  t('slideshow: varias imágenes por celda, rota por beats, serializado', r.armado && r.ser, JSON.stringify(r));

  // ================= FEATURES DE RONDAS ANTERIORES (spot-checks) =================
  r = await page.evaluate(() => ({
    env: typeof envValue === 'function' && typeof drawEnv === 'function',
    vote: typeof pubVoteStart === 'function',
    glb: typeof parseGLB === 'function' && typeof renderGlb === 'function',
    tm: typeof tmToggle === 'function',
    b2b: typeof b2bSendToggle === 'function',
    espejo: typeof mirrorTo === 'function',
    adrop: typeof autoDropTick === 'function',
    structs: typeof structsDraw === 'function',
    amask: typeof autoMaskScan === 'function' && typeof rdp === 'function',
    undo: typeof undo === 'function',
    motion: typeof motionToggle === 'function',
  }));
  t('regresión: todos los sistemas anteriores presentes', Object.values(r).every(Boolean), JSON.stringify(r));
  r = await page.evaluate(() => {
    // GLB sintético (tetraedro) sigue parseando
    const json = JSON.stringify({
      asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
      meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
      accessors: [{ bufferView: 0, componentType: 5126, count: 4, type: 'VEC3' },
        { bufferView: 1, componentType: 5123, count: 12, type: 'SCALAR' }],
      bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 48 }, { buffer: 0, byteOffset: 48, byteLength: 24 }],
      buffers: [{ byteLength: 72 }],
    });
    const jpad = json + ' '.repeat((4 - json.length % 4) % 4);
    const bin = new ArrayBuffer(72);
    new Float32Array(bin, 0, 12).set([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]);
    new Uint16Array(bin, 48, 12).set([0, 1, 2, 0, 1, 3, 0, 2, 3, 1, 2, 3]);
    const total = 12 + 8 + jpad.length + 8 + 72;
    const buf = new ArrayBuffer(total);
    const dv = new DataView(buf);
    dv.setUint32(0, 0x46546C67, true); dv.setUint32(4, 2, true); dv.setUint32(8, total, true);
    dv.setUint32(12, jpad.length, true); dv.setUint32(16, 0x4E4F534A, true);
    new Uint8Array(buf, 20, jpad.length).set(new TextEncoder().encode(jpad));
    dv.setUint32(20 + jpad.length, 72, true); dv.setUint32(24 + jpad.length, 0x004E4942, true);
    new Uint8Array(buf, 28 + jpad.length).set(new Uint8Array(bin));
    const geo = parseGLB(buf);
    return geo.tris === 4 && geo.idx.length === 24;
  });
  t('regresión: parser GLB intacto', r);
  r = await page.evaluate(() => {
    // envolvente evalúa (rampa)
    const pp = { value: .5, mod: 'env', amt: 1, env: { pts: Array.from({ length: 32 }, (_, i) => i / 31), beats: 4 } };
    const save = beatFloat;
    beatFloat = 2; const v = envValue(pp);
    beatFloat = save;
    return Math.abs(v - .5) < .1;
  });
  t('regresión: envolventes evalúan', r);
  r = await page.evaluate(() => {
    // votación host cuenta y dispara
    pub.on = true; pub.conns = [{ send() { } }];
    pubVoteStart(0, 2, 30);
    pubMsg({}, { t: 'pub', k: 'v', v: 'a' });
    let col = -1;
    const orig = window.qTriggerColumn;
    window.qTriggerColumn = c => { col = c; };
    pubVoteEnd();
    window.qTriggerColumn = orig;
    pub.on = false; pub.conns = [];
    return col === 0;
  });
  t('regresión: votación del público', r);

  // ================= KIOSKO 🤖 (página aparte) =================
  {
    const pgK = await browser.newPage({ viewport: { width: 800, height: 600 } });
    await pgK.addInitScript(() => {
      try {
        const u = JSON.parse(localStorage.getItem('ravenvj_ui') || '{}');
        u.welcomed = true; u.lang = 'es';
        localStorage.setItem('ravenvj_ui', JSON.stringify(u));
      } catch (e) { }
    });
    await pgK.goto(APP + '?kiosk=1&col=1');
    await pgK.waitForTimeout(3300);
    const rr = await pgK.evaluate(() => ({
      clase: document.body.classList.contains('kiosk'),
      topbarOculta: getComputedStyle(document.getElementById('topbar')).display === 'none',
      canvasFull: getComputedStyle(document.getElementById('outCanvas')).position === 'fixed',
      rendering: performance.now() - (renderTick._last || 0) < 2000,
    }));
    t('kiosko: UI oculta, salida fullscreen, render vivo', rr.clase && rr.topbarOculta && rr.canvasFull && rr.rendering, JSON.stringify(rr));
    await pgK.close();
  }

  // ================= REMOTO (página del público con hype) =================
  {
    const pg2 = await browser.newPage();
    await pg2.goto(REMOTE + '?p=ZZZZ99');
    await pg2.waitForTimeout(900);
    const rr = await pg2.evaluate(() => ({
      hype: !!document.getElementById('pubhype'),
      vote: !!document.getElementById('pubvote'),
      build: typeof window._pubBuild === 'function',
    }));
    t('remoto público: botón 🔥 HYPE + votación presentes', rr.hype && rr.vote && rr.build, JSON.stringify(rr));
    await pg2.close();
  }

  // ================= errores acumulados =================
  const errs = await page.evaluate(() => window.__errs || []);
  t('sin errores JS acumulados', !errs.length, errs.join(' | ').slice(0, 200));

  console.log(fail ? `❌ ${fail} FALLOS (${pass} pass)` : `✅ TODO VERDE (${pass} tests)`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('SUITE ERROR:', e); process.exit(1); });
